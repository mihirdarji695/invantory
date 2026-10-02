import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { UPLOADS_DIR, uploadPath } from "@/lib/db-path";
import { UserFacingError } from "@/lib/services/errors";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 3 * 1024 * 1024;

/** Saves an uploaded image to data/uploads and returns its file name (or null if none). */
export async function saveProductImage(file: FormDataEntryValue | null): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = ALLOWED[file.type];
  if (!ext) throw new UserFacingError("Image must be JPG, PNG, WEBP or GIF.", { image: "Image must be JPG, PNG, WEBP or GIF." });
  if (file.size > MAX_BYTES) throw new UserFacingError("Image must be 3 MB or smaller.", { image: "Image must be 3 MB or smaller." });

  await mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(uploadPath(name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function deleteProductImage(name: string | null | undefined) {
  if (!name || !isSafeImageName(name)) return;
  await unlink(uploadPath(name)).catch(() => undefined);
}

export function isSafeImageName(name: string) {
  return /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(name);
}

export const IMAGE_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
