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

test("UHID default protects Patient registration when an older server omits the field", async () => {
  const db = new PGlite();
  const migrationPath = fileURLToPath(
    new URL("../migrations/0004_patient_uhid_default.sql", import.meta.url),
  );

  try {
    await db.exec(`
      CREATE TABLE patients (
        id uuid PRIMARY KEY,
        uhid text NOT NULL UNIQUE,
        name text NOT NULL,
        age text,
        phone text,
        language text NOT NULL DEFAULT 'en'
      );
    `);
    await db.exec(await readFile(migrationPath, "utf8"));
    await db.exec(`
      INSERT INTO patients (id, name, age, phone, language)
      VALUES (
        'c0d64dce-57ee-40c0-b2bd-13da7786ae4a',
        'Fictional Patient',
        NULL,
        '+919876543210',
        'en'
      );
    `);

    const result = await db.query<{ uhid: string }>("SELECT uhid FROM patients");
    assert.match(result.rows[0]?.uhid ?? "", /^UHID-[A-F0-9]{10}$/);
  } finally {
    await db.close();
  }
});

test("action-events repair migration restores dashboard event queries after schema drift", async () => {
  const db = new PGlite();
  const migrationPath = fileURLToPath(
    new URL("../migrations/0005_repair_action_events.sql", import.meta.url),
  );

  try {
    await db.exec(`
      CREATE TYPE event_type AS ENUM (
        'created',
        'verified',
        'activated',
        'completed',
        'skipped',
        'reminder_requested',
        'help_requested',
        'review_started',
        'reviewed',
        'closed',
        'follow_up_created',
        'help_resolved'
      );
      CREATE TABLE patients (id uuid PRIMARY KEY);
      CREATE TABLE care_actions (id uuid PRIMARY KEY);
    `);
    await db.exec(await readFile(migrationPath, "utf8"));
    await db.exec(`
      INSERT INTO patients (id)
      VALUES ('dd15ab44-5441-49b4-b96b-5768e4e5c671');
      INSERT INTO action_events (patient_id, event_type, created_by, notes)
      VALUES (
        'dd15ab44-5441-49b4-b96b-5768e4e5c671',
        'help_requested',
        'patient',
        'Needs help understanding instructions'
      );
    `);

    const events = await db.query<{ event_type: string }>(
      `SELECT event_type
       FROM action_events
       WHERE patient_id = 'dd15ab44-5441-49b4-b96b-5768e4e5c671'
         AND care_action_id IS NULL
       ORDER BY timestamp DESC, id DESC`,
    );
    assert.deepEqual(
      events.rows.map((event) => event.event_type),
      ["help_requested"],
    );
  } finally {
    await db.close();
  }
});

test("medication-dose migration enforces one record per scheduled action dose", async () => {
  const db = new PGlite();
  const migrationPath = fileURLToPath(
    new URL("../migrations/0006_medication_doses.sql", import.meta.url),
  );

  try {
    await db.exec(`
      CREATE TYPE event_type AS ENUM ('created');
      CREATE TABLE patients (id uuid PRIMARY KEY);
      CREATE TABLE care_actions (id uuid PRIMARY KEY);
    `);
    await db.exec(await readFile(migrationPath, "utf8"));
    await db.exec(`
      INSERT INTO patients (id) VALUES ('20000000-0000-4000-8000-000000000001');
      INSERT INTO care_actions (id) VALUES ('50000000-0000-4000-8000-000000000001');
      INSERT INTO medication_dose_records (
        care_action_id,
        patient_id,
        scheduled_for,
        status
      ) VALUES (
        '50000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001',
        '2026-07-26T08:00:00Z',
        'taken'
      );
    `);
    await assert.rejects(
      db.exec(`
        INSERT INTO medication_dose_records (
          care_action_id,
          patient_id,
          scheduled_for,
          status
        ) VALUES (
          '50000000-0000-4000-8000-000000000001',
          '20000000-0000-4000-8000-000000000001',
          '2026-07-26T08:00:00Z',
          'skipped'
        );
      `),
    );
    const enumValues = await db.query<{ enumlabel: string }>(
      `SELECT enumlabel FROM pg_enum
       JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
       WHERE pg_type.typname = 'event_type'`,
    );
    assert.equal(
      enumValues.rows.some((value) => value.enumlabel === "dose_taken"),
      true,
    );
    assert.equal(
      enumValues.rows.some((value) => value.enumlabel === "dose_skipped"),
      true,
    );
  } finally {
    await db.close();
  }
});
