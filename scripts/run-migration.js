import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

async function runMigration() {
  const dbPass = process.env.DATABASE_PASSWORD;
  const sUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  console.log("=========================================");
  console.log("   TAKETALON DATABASE MIGRATION ENGINE   ");
  console.log("=========================================");
  console.log("SUPABASE_URL:", sUrl || "NOT SET");
  console.log("DATABASE_PASSWORD:", dbPass ? "*****" : "NOT SET");

  if (!dbPass || !sUrl) {
    console.error("❌ CRITICAL ERROR: Missing DATABASE_PASSWORD or SUPABASE_URL.");
    process.exit(1);
  }

  const projectRefMatch = sUrl.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  const projectRef = projectRefMatch ? projectRefMatch[1] : null;

  if (!projectRef) {
    console.error("❌ CRITICAL ERROR: Unable to extract Supabase project ref from URL:", sUrl);
    process.exit(1);
  }

  console.log("Target Project Ref:", projectRef);

  const connectionStrings = [
    `postgres://postgres:${encodeURIComponent(dbPass)}@db.${projectRef}.supabase.co:5432/postgres`,
    `postgres://postgres.${projectRef}:${encodeURIComponent(dbPass)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    `postgres://postgres.${projectRef}:${encodeURIComponent(dbPass)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgres://postgres.${projectRef}:${encodeURIComponent(dbPass)}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`,
    `postgres://postgres:${encodeURIComponent(dbPass)}@db.${projectRef}.supabase.co:6543/postgres`,
  ];

  let success = false;

  for (const connStr of connectionStrings) {
    const hostInfo = connStr.split("@")[1];
    console.log(`Connecting to PostgreSQL host: ${hostInfo}...`);

    const client = new pg.Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      console.log(`✅ SUCCESS: Connected to Supabase PostgreSQL at ${hostInfo}`);

      const migrationSql = `
        -- 1. Create sms_messages table if not exists
        CREATE TABLE IF NOT EXISTS public.sms_messages (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          sender TEXT,
          body TEXT,
          received_at TIMESTAMPTZ DEFAULT NOW(),
          sender_phone TEXT,
          mpesa_code TEXT,
          amount NUMERIC DEFAULT 0,
          currency TEXT DEFAULT 'FBU',
          device_id TEXT,
          processed BOOLEAN DEFAULT FALSE,
          raw_payload JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- 2. Ensure all columns exist
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS sender TEXT;
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS body TEXT;
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS sender_phone TEXT;
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS mpesa_code TEXT;
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'FBU';
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS device_id TEXT;
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS raw_payload JSONB;
        ALTER TABLE public.sms_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

        -- 3. Grant access permissions for Supabase roles
        GRANT ALL ON public.sms_messages TO postgres, service_role, anon, authenticated;

        -- 4. Set RLS policy (Disable RLS or allow insert/select for service_role and authenticated)
        ALTER TABLE public.sms_messages DISABLE ROW LEVEL SECURITY;
      `;

      console.log("Executing Migration DDL statements...");
      await client.query(migrationSql);
      console.log("✅ DDL Executed Successfully!");

      const checkRes = await client.query("SELECT COUNT(*) FROM public.sms_messages;");
      console.log(`✅ Table public.sms_messages verified. Total records currently in table: ${checkRes.rows[0].count}`);

      await client.end();
      success = true;
      break;
    } catch (err) {
      console.warn(`⚠️ Connection attempt failed for ${hostInfo}:`, err.message);
      try { await client.end(); } catch (_) {}
    }
  }

  if (success) {
    console.log("=========================================");
    console.log("✅ MIGRATION COMPLETED SUCCESSFULLY!");
    console.log("=========================================");
    process.exit(0);
  } else {
    console.error("❌ MIGRATION FAILED: Could not connect to Supabase PostgreSQL.");
    process.exit(1);
  }
}

runMigration();
