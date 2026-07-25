import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import pg from "pg";
import * as schema from "./schema";

let database: any = undefined;
let pgliteInstance: PGlite | undefined = undefined;
let isInitialized = false;

export async function initializeDatabaseSchema(db: any) {
  if (isInitialized) return;

  try {
    // 1. Create Enums
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('patient', 'hospital_admin', 'pharmacy_admin', 'super_admin');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('active', 'pending_approval', 'rejected');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE document_type AS ENUM ('discharge_summary', 'prescription', 'referral', 'lab_form', 'other');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE action_type AS ENUM ('MEDICATION', 'TEST', 'REFERRAL', 'FOLLOW_UP');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE priority AS ENUM ('NORMAL', 'URGENT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE action_status AS ENUM ('PENDING', 'DUE', 'COMPLETED', 'AWAITING_REVIEW', 'REVIEWED', 'CLOSED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE care_plan_status AS ENUM ('draft', 'verified', 'active', 'closed');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE report_status AS ENUM ('AWAITING_REVIEW', 'REVIEWED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE event_type AS ENUM ('created', 'verified', 'activated', 'completed', 'skipped', 'help_requested', 'review_started', 'reviewed', 'closed', 'follow_up_created');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 2. Create Tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        role user_role NOT NULL,
        status user_status NOT NULL DEFAULT 'active',
        aadhaar_number TEXT UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organization_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        org_name TEXT NOT NULL,
        org_type TEXT NOT NULL,
        license_number TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        age TEXT,
        phone TEXT,
        language TEXT NOT NULL DEFAULT 'en',
        caregiver_contact JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS source_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id),
        document_type document_type NOT NULL,
        content TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS care_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id),
        provider_id UUID NOT NULL,
        status care_plan_status NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified_at TIMESTAMPTZ
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS care_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        care_plan_id UUID NOT NULL REFERENCES care_plans(id),
        type action_type NOT NULL,
        title TEXT NOT NULL,
        instructions TEXT NOT NULL,
        due_date TIMESTAMPTZ,
        status action_status NOT NULL DEFAULT 'PENDING',
        priority priority NOT NULL DEFAULT 'NORMAL',
        source_text TEXT NOT NULL,
        assigned_to TEXT NOT NULL DEFAULT 'patient',
        review_required BOOLEAN NOT NULL DEFAULT FALSE,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        care_action_id UUID NOT NULL REFERENCES care_actions(id),
        file_url TEXT NOT NULL,
        status report_status NOT NULL DEFAULT 'AWAITING_REVIEW',
        provider_comment TEXT,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS action_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        care_action_id UUID NOT NULL REFERENCES care_actions(id),
        event_type event_type NOT NULL,
        created_by TEXT NOT NULL,
        notes TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    isInitialized = true;
  } catch (err) {
    console.error("Failed to initialize database schema DDL:", err);
  }
}

export function getDb(databaseUrl = process.env.DATABASE_URL) {
  if (database) {
    initializeDatabaseSchema(database);
    return database;
  }

  if (databaseUrl && (databaseUrl.includes("neon.tech") || databaseUrl.includes("neon.build"))) {
    database = drizzleNeon(neon(databaseUrl), { schema });
  } else if (
    databaseUrl &&
    (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://")) &&
    !databaseUrl.includes("localhost") &&
    !databaseUrl.includes("127.0.0.1")
  ) {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    database = drizzlePg(pool, { schema });
  } else {
    // Embedded PGlite Postgres instance storing data in ./pgdata directory inside workspace
    pgliteInstance ??= new PGlite("./pgdata");
    database = drizzlePglite({ client: pgliteInstance, schema });
  }

  initializeDatabaseSchema(database);
  return database;
}
