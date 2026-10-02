import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { databaseFilePath } from "@/lib/db-path";

/**
 * GET /api/backup — downloads a consistent snapshot of the SQLite database.
 * Uses SQLite's online backup API, so it is safe while the app is running.
 */
export async function GET() {
  const source = databaseFilePath();
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const tmp = path.join(os.tmpdir(), `inventory-backup-${process.pid}-${Date.now()}.db`);

  const db = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await db.backup(tmp);
  } finally {
    db.close();
  }

  try {
    const data = await readFile(tmp);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="inventory-backup-${stamp}.db"`,
        "Content-Length": String(data.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await rm(tmp, { force: true });
  }
}
