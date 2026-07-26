import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { withStrictPostgresSslMode } from "./connection-string";
import { uhidFromPatientId } from "./uhid";

test("legacy SSL modes are upgraded to certificate and hostname verification", () => {
  const strict = withStrictPostgresSslMode(
    "postgresql://user:password@example.test/db?sslmode=require",
  );
  assert.equal(new URL(strict).searchParams.get("sslmode"), "verify-full");
});

test("UHID generation is deterministic and unique for Patient IDs", () => {
  const first = uhidFromPatientId("20000000-0000-4000-8000-000000000001");
  const second = uhidFromPatientId("20000000-0000-4000-8000-000000000002");
  assert.match(first, /^UHID-[A-F0-9]{10}$/);
  assert.notEqual(first, second);
  assert.equal(first, uhidFromPatientId("20000000-0000-4000-8000-000000000001"));
});

test("baseline migration creates the reliable-demo schema from an empty database", async () => {
  const db = new PGlite();
  const migrationPath = fileURLToPath(new URL("../migrations/0000_baseline.sql", import.meta.url));

  try {
    await db.exec(await readFile(migrationPath, "utf8"));

    const tables = await db.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'`,
    );
    const tableNames = new Set(tables.rows.map((row) => row.table_name));
    for (const expected of [
      "users",
      "patients",
      "provider_patient_assignments",
      "source_documents",
      "care_plans",
      "care_actions",
      "reports",
      "action_events",
    ]) {
      assert.equal(tableNames.has(expected), true, `missing table: ${expected}`);
    }

    const patientColumns = await db.query<{
      column_name: string;
      is_nullable: string;
    }>(
      `SELECT column_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'patients'`,
    );
    const uhidColumn = patientColumns.rows.find((row) => row.column_name === "uhid");
    assert.equal(uhidColumn?.is_nullable, "NO");

    const reportColumns = await db.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'reports'`,
    );
    const reportColumnNames = new Set(reportColumns.rows.map((row) => row.column_name));
    assert.equal(reportColumnNames.has("file_name"), true);
    assert.equal(reportColumnNames.has("file_type"), true);
    assert.equal(reportColumnNames.has("file_size"), true);
    assert.equal(reportColumnNames.has("file_url"), false);
  } finally {
    await db.close();
  }
});

test("Aadhaar migration adds a private, unique, 12-digit Patient identity field", async () => {
  const db = new PGlite();
  const migrationPath = fileURLToPath(
    new URL("../migrations/0003_patient_aadhaar.sql", import.meta.url),
  );

  try {
    await db.exec(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        email text NOT NULL UNIQUE
      );
    `);
    await db.exec(await readFile(migrationPath, "utf8"));
    await db.exec(`
      INSERT INTO users (id, email, aadhaar_number)
      VALUES (
        '20000000-0000-4000-8000-000000000001',
        'first@example.test',
        '123456789012'
      );
    `);

    await assert.rejects(
      db.exec(`
        INSERT INTO users (id, email, aadhaar_number)
        VALUES (
          '20000000-0000-4000-8000-000000000002',
          'duplicate@example.test',
          '123456789012'
        );
      `),
    );
    await assert.rejects(
      db.exec(`
        INSERT INTO users (id, email, aadhaar_number)
        VALUES (
          '20000000-0000-4000-8000-000000000003',
          'invalid@example.test',
          '12345'
        );
      `),
    );
  } finally {
    await db.close();
  }
});

test("UHID migration backfills an existing Patient table safely", async () => {
  const db = new PGlite();
  const migrationPath = fileURLToPath(
    new URL("../migrations/0001_patient_uhid.sql", import.meta.url),
  );

  try {
    await db.exec(`
      CREATE TABLE patients (
        id uuid PRIMARY KEY,
        name text NOT NULL
      );
      INSERT INTO patients (id, name)
      VALUES ('20000000-0000-4000-8000-000000000001', 'Legacy Patient');
    `);
    await db.exec(await readFile(migrationPath, "utf8"));

    const result = await db.query<{ uhid: string }>("SELECT uhid FROM patients");
    assert.match(result.rows[0]?.uhid ?? "", /^UHID-[A-F0-9]{10}$/);
  } finally {
    await db.close();
  }
});

test("short UHID migration reduces existing Patient identifiers", async () => {
  const db = new PGlite();
  const migrationPath = fileURLToPath(
    new URL("../migrations/0002_short_patient_uhid.sql", import.meta.url),
  );

  try {
    await db.exec(`
      CREATE TABLE patients (
        id uuid PRIMARY KEY,
        uhid text NOT NULL UNIQUE
      );
      INSERT INTO patients (id, uhid)
      VALUES (
        '20000000-0000-4000-8000-000000000001',
        'UHID-20000000000040008000000000000001'
      );
    `);
    await db.exec(await readFile(migrationPath, "utf8"));

    const result = await db.query<{ uhid: string }>("SELECT uhid FROM patients");
    assert.equal(result.rows[0]?.uhid, "UHID-0000000001");
  } finally {
    await db.close();
  }
});
