// Joins supabase/migrations/*.sql (in order) into ONE file for pasting into the
// Supabase SQL Editor of a brand-new project (click-through setup, no CLI).
// Usage: node scripts/bundle-setup-sql.mjs > supabase-setup.sql
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(import.meta.dirname, "..", "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.error("No migrations found.");
  process.exit(1);
}
let out = "-- MEM Workforce database setup (generated from supabase/migrations — do not edit by hand).\n";
out += "-- Run ONCE in the SQL Editor of a NEW, empty Supabase project.\n\nbegin;\n\n";
for (const f of files) out += `-- ===== ${f} =====\n${readFileSync(path.join(dir, f), "utf8")}\n\n`;
out += "commit;\n";
process.stdout.write(out);
