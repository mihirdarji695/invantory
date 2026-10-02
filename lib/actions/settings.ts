"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { flattenErrors, formToObject, settingsSchema, type ActionResult } from "@/lib/validation";
import { toUserError } from "@/lib/services/errors";
import { deleteProductImage } from "@/lib/services/images";

export async function saveSettingsAction(form: FormData): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };
  try {
    await prisma.settings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved." };
  } catch (error) {
    return { ok: false, message: toUserError(error).message };
  }
}

/** Removes products/categories created by the seed script. Your own data is untouched. */
export async function removeSampleDataAction(): Promise<ActionResult> {
  try {
    const samples = await prisma.product.findMany({ where: { isSample: true }, select: { id: true, image: true } });
    const ids = samples.map((s) => s.id);
    await prisma.$transaction([
      prisma.stockMovement.deleteMany({ where: { productId: { in: ids } } }),
      prisma.product.deleteMany({ where: { id: { in: ids } } }),
      // Only remove sample categories nobody else is using.
      prisma.category.deleteMany({ where: { isSample: true, products: { none: {} } } }),
    ]);
    await Promise.all(samples.map((s) => deleteProductImage(s.image)));
    revalidatePath("/", "layout");
    return { ok: true, message: `Removed ${ids.length} sample products.` };
  } catch (error) {
    return { ok: false, message: toUserError(error).message };
  }
}
