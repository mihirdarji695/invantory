/**
 * Runs before `npm run dev` / `npm start`.
 *  - First run: creates the SQLite database, applies migrations, adds sample data.
 *  - Later runs: applies any new migrations (no-op if up to date). Your data is never reset.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import "dotenv/config";

const url = process.env.DATABASE_URL ?? "file:./data/inventory.db";
const raw = url.replace(/^file:/, "");
const dbFile = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
const firstRun = !existsSync(dbFile);
const run = (cmd) => execSync(cmd, { stdio: "inherit" });

mkdirSync(path.dirname(dbFile), { recursive: true });
if (!existsSync(path.resolve("lib/generated/prisma/client.ts"))) run("npx prisma generate");

if (firstRun) {
  console.log(`\n▸ Creating database at ${dbFile}`);
  run("npx prisma migrate deploy");
  console.log("▸ Adding sample products (remove later in Settings → Sample data)");
  run("npx prisma db seed");
} else {
  run("npx prisma migrate deploy");
}
