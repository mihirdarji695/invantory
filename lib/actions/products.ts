"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isBarcodeType, validateBarcode } from "@/lib/barcode";
import {
  adjustStockSchema,
  flattenErrors,
  formToObject,
  productCreateSchema,
  productUpdateSchema,
  type ActionResult,
} from "@/lib/validation";
import { adjustStock, createProduct, generateUniqueBarcode, isBarcodeTaken, updateProduct } from "@/lib/services/products";
import { DUPLICATE_BARCODE_MESSAGE, toUserError } from "@/lib/services/errors";
import { deleteProductImage, saveProductImage } from "@/lib/services/images";

function fail(error: unknown): ActionResult<never> {
  const e = toUserError(error);
  return { ok: false, message: e.message, fieldErrors: e.fieldErrors };
}

export async function createProductAction(form: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = productCreateSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };

  let image: string | null = null;
  try {
    image = await saveProductImage(form.get("image"));
    const product = await createProduct(parsed.data, image);
    revalidatePath("/", "layout");
    return { ok: true, message: `${product.name} added.`, data: { id: product.id } };
  } catch (error) {
    await deleteProductImage(image);
    return fail(error);
  }
}

export async function updateProductAction(id: string, form: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = productUpdateSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };

  let newImage: string | null = null;
  try {
    const existing = await prisma.product.findUnique({ where: { id }, select: { image: true } });
    if (!existing) return { ok: false, message: "This product no longer exists." };

    newImage = await saveProductImage(form.get("image"));
    const removeImage = form.get("removeImage") === "1";
    const image = newImage ?? (removeImage ? null : undefined);

    const product = await updateProduct(id, parsed.data, image);
    if (image !== undefined) await deleteProductImage(existing.image);
    revalidatePath("/", "layout");
    return { ok: true, message: "Changes saved.", data: { id: product.id } };
  } catch (error) {
    await deleteProductImage(newImage);
    return fail(error);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    const product = await prisma.product.delete({ where: { id } });
    await deleteProductImage(product.image);
    revalidatePath("/", "layout");
    return { ok: true, message: `${product.name} deleted. Its stock history is kept.` };
  } catch (error) {
    return fail(error);
  }
}

export async function adjustStockAction(form: FormData): Promise<ActionResult<{ newStock: number }>> {
  const parsed = adjustStockSchema.safeParse(formToObject(form));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };
  try {
    const { product } = await adjustStock(parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, message: `Stock updated. ${product.name} now has ${product.stock} ${product.unit}.`, data: { newStock: product.stock } };
  } catch (error) {
    return fail(error);
  }
}

export async function generateBarcodeAction(type: string): Promise<ActionResult<{ barcode: string }>> {
  if (!isBarcodeType(type)) return { ok: false, message: "Choose a barcode type." };
  try {
    return { ok: true, data: { barcode: await generateUniqueBarcode(type) } };
  } catch (error) {
    return fail(error);
  }
}

/** Live check used by the product form while typing a barcode. */
export async function checkBarcodeAction(
  value: string,
  type: string,
  excludeProductId?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isBarcodeType(type)) return { ok: false, error: "Choose a barcode type." };
  const check = validateBarcode(value, type);
  if (!check.ok) return { ok: false, error: check.error };
  const taken = await isBarcodeTaken(check.value, excludeProductId);
  if (taken) return { ok: false, error: DUPLICATE_BARCODE_MESSAGE };
  return { ok: true };
}
