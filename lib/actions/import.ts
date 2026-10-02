"use server";

import { revalidatePath } from "next/cache";
import { importProductsCsv, type ImportReport } from "@/lib/services/csv";
import { toUserError } from "@/lib/services/errors";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function importCsvAction(form: FormData): Promise<{ ok: boolean; message: string; report?: ImportReport }> {
  const file = form.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { ok: false, message: "Choose a CSV file to import." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, message: "CSV file must be 5 MB or smaller." };
  if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return { ok: false, message: "The file must be a .csv file." };

  try {
    const report = await importProductsCsv(await file.text(), {
      updateExisting: form.get("updateExisting") === "on",
      skipInvalid: form.get("skipInvalid") === "on",
    });
    if (report.applied) revalidatePath("/", "layout");
    const message = report.applied
      ? `Imported: ${report.created} added, ${report.updated} updated${report.skipped ? `, ${report.skipped} skipped` : ""}.`
      : "Nothing was imported. Fix the errors below and upload the file again.";
    return { ok: report.applied, message, report };
  } catch (error) {
    return { ok: false, message: toUserError(error).message };
  }
}
