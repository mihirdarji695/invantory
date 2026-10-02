import { readFile } from "node:fs/promises";
import { uploadPath } from "@/lib/db-path";
import { IMAGE_CONTENT_TYPE, isSafeImageName } from "@/lib/services/images";

/** Serves product images stored in data/uploads (outside /public so uploads work after a build). */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!isSafeImageName(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(uploadPath(name));
    const ext = name.split(".").pop() ?? "";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": IMAGE_CONTENT_TYPE[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
