import path from "node:path";

/*
 * Runtime paths for local data. The `turbopackIgnore` hints tell the bundler
 * these are runtime-only paths (it should not try to trace/bundle the folder).
 */

/**
 * Resolve DATABASE_URL ("file:./data/inventory.db") to an absolute file path.
 * Relative paths are resolved from the project root (process.cwd()).
 */
export function databaseFilePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/inventory.db";
  const raw = url.replace(/^file:/, "");
  return path.isAbsolute(raw) ? raw : path.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
}

export const UPLOADS_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads");

/** Absolute path to an uploaded image (name must already be validated). */
export function uploadPath(name: string) {
  return path.join(/*turbopackIgnore: true*/ UPLOADS_DIR, name);
}
