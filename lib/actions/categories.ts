"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { categorySchema, flattenErrors, formToObject, type ActionResult } from "@/lib/validation";
import { toUserError } from "@/lib/services/errors";

async function nameTaken(name: string, excludeId?: string) {
  // Case-insensitive check so "shampoo" and "Shampoo" can't both exist.
  const all = await prisma.category.findMany({ select: { id: true, name: true } });
  const wanted = name.toLowerCase();
  return all.some((c) => c.id !== excludeId && c.name.toLowerCase() === wanted);
}

export async function saveCategoryAction(id: string | null, form: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };

  if (await nameTaken(parsed.data.name, id ?? undefined)) {
    const msg = "A category with this name already exists.";
    return { ok: false, message: msg, fieldErrors: { name: msg } };
  }

  try {
    if (id) await prisma.category.update({ where: { id }, data: parsed.data });
    else await prisma.category.create({ data: parsed.data });
    revalidatePath("/", "layout");
    return { ok: true, message: id ? "Category updated." : "Category added." };
  } catch (error) {
    const e = toUserError(error);
    return { ok: false, message: e.message, fieldErrors: e.fieldErrors };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const category = await prisma.category.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true, message: `${category.name} deleted. Its products are now uncategorized.` };
  } catch (error) {
    return { ok: false, message: toUserError(error).message };
  }
}
