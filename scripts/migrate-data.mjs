#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function exitWith(message) {
  console.error(message);
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.MIGRATION_USER_ID || process.argv[2];
const INPUT_PATH = process.env.MIGRATION_FILE || process.argv[3] || path.join(__dirname, "../supabase/demo-seed.json");

if (!SUPABASE_URL) exitWith("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
if (!SERVICE_ROLE_KEY) exitWith("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
if (!USER_ID) exitWith("Usage: npm run migrate:data -- <USER_ID> [path/to/file.json]");

const resolvedPath = path.isAbsolute(INPUT_PATH) ? INPUT_PATH : path.resolve(INPUT_PATH);
if (!fs.existsSync(resolvedPath)) {
  exitWith(`Could not find migration file at ${resolvedPath}`);
}

let payload;
try {
  const raw = fs.readFileSync(resolvedPath, "utf-8");
  payload = JSON.parse(raw);
} catch (error) {
  exitWith(`Failed to read or parse ${resolvedPath}: ${error.message}`);
}

const deals = Array.isArray(payload.deals) ? payload.deals : [];
const analyses = Array.isArray(payload.analyses) ? payload.analyses : [];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  console.log(`Migrating data for user ${USER_ID} from ${resolvedPath}`);

  if (analyses.length > 0) {
    const rows = analyses.map((analysis) => ({
      id: analysis.id,
      user_id: USER_ID,
      analysis,
    }));

    const { error } = await supabase.from("user_analyses").upsert(rows, { onConflict: "id" });
    if (error) {
      exitWith(`Failed to upsert analyses: ${error.message}`);
    }
    console.log(`✔ Imported ${analyses.length} analyses.`);
  } else {
    console.log("No analyses found in payload.");
  }

  if (deals.length > 0) {
    const rows = deals.map((deal) => ({
      id: deal.id,
      user_id: USER_ID,
      deal,
    }));

    const { error } = await supabase.from("user_deals").upsert(rows, { onConflict: "id" });
    if (error) {
      exitWith(`Failed to upsert deals: ${error.message}`);
    }
    console.log(`✔ Imported ${deals.length} deals.`);
  } else {
    console.log("No deals found in payload.");
  }

  console.log("Migration complete.");
  process.exit(0);
}

run().catch((error) => {
  exitWith(`Migration failed: ${error.message}`);
});
