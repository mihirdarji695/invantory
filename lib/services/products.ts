import "server-only";
import { prisma } from "@/lib/prisma";
import { createBarcodeCandidate, type BarcodeTypeValue } from "@/lib/barcode";
import { applyAdjustment, movementTypeFor, type AdjustMode } from "@/lib/stock";
import type { ProductCreateInput, ProductUpdateInput } from "@/lib/validation";
import { DUPLICATE_BARCODE_MESSAGE, DUPLICATE_SKU_MESSAGE, UserFacingError } from "@/lib/services/errors";

export async function isBarcodeTaken(barcode: string, excludeProductId?: string) {
  const existing = await prisma.product.findUnique({ where: { barcode }, select: { id: true, name: true } });
  if (!existing || existing.id === excludeProductId) return null;
  return existing;
}

export async function isSkuTaken(sku: string, excludeProductId?: string) {
  const existing = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
  return Boolean(existing && existing.id !== excludeProductId);
}

/** Generate a barcode that is valid for the type and not used by any product. */
export async function generateUniqueBarcode(type: BarcodeTypeValue): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = createBarcodeCandidate(type);
    if (!(await isBarcodeTaken(candidate))) return candidate;
  }
  throw new UserFacingError("Could not generate a unique barcode. Please try again.");
}

async function assertUnique(sku: string, barcode: string, excludeId?: string) {
  const fieldErrors: Record<string, string> = {};
  if (await isSkuTaken(sku, excludeId)) fieldErrors.sku = DUPLICATE_SKU_MESSAGE;
  if (await isBarcodeTaken(barcode, excludeId)) fieldErrors.barcode = DUPLICATE_BARCODE_MESSAGE;
  if (Object.keys(fieldErrors).length) {
    throw new UserFacingError(fieldErrors.barcode ?? fieldErrors.sku, fieldErrors);
  }
}

async function assertCategory(categoryId: string | null) {
  if (!categoryId) return;
  const exists = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!exists) throw new UserFacingError("Choose a valid category.", { categoryId: "This category no longer exists." });
}

export async function createProduct(input: ProductCreateInput, image: string | null) {
  await assertUnique(input.sku, input.barcode);
  await assertCategory(input.categoryId);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: { ...input, image } });
    // Opening stock is recorded like any other movement so the ledger always balances.
    if (input.stock > 0) {
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          type: "STOCK_IN",
          quantity: input.stock,
          previousStock: 0,
          newStock: input.stock,
          reason: "Opening stock",
        },
      });
    }
    return product;
  });
}

export async function updateProduct(id: string, input: ProductUpdateInput, image: string | null | undefined) {
  await assertUnique(input.sku, input.barcode, id);
  await assertCategory(input.categoryId);
  return prisma.product.update({
    where: { id },
    data: { ...input, ...(image !== undefined ? { image } : {}) },
  });
}

export async function adjustStock(params: {
  productId: string;
  mode: AdjustMode;
  quantity: number;
  reason: string;
  note: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: params.productId } });
    if (!product) throw new UserFacingError("This product no longer exists.");

    let result: { newStock: number; delta: number };
    try {
      result = applyAdjustment(product.stock, params.mode, params.quantity);
    } catch (e) {
      throw new UserFacingError((e as Error).message, { quantity: (e as Error).message });
    }
    if (result.delta === 0) {
      throw new UserFacingError("Stock is already at this level. Nothing to record.", {
        quantity: "Stock is already at this level.",
      });
    }

    // Optimistic concurrency: only update if nobody changed stock since we read it.
    const updated = await tx.product.updateMany({
      where: { id: product.id, stock: product.stock },
      data: { stock: result.newStock },
    });
    if (updated.count === 0) throw new UserFacingError("Stock changed while you were editing. Please try again.");

    const reason = params.note ? `${params.reason}: ${params.note}` : params.reason;
    const movement = await tx.stockMovement.create({
      data: {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        type: movementTypeFor(params.mode, params.reason),
        quantity: result.delta,
        previousStock: product.stock,
        newStock: result.newStock,
        reason,
      },
    });
    return { product: { ...product, stock: result.newStock }, movement };
  });
}

/** Exact barcode match first, then exact SKU, then partial name/SKU/barcode matches. */
export async function findByCode(code: string) {
  const value = code.trim();
  if (!value) return { exact: null, matches: [] };
  const include = { category: { select: { name: true } } } as const;

  const exactBarcode = await prisma.product.findUnique({ where: { barcode: value }, include });
  const upcEanAlias = /^\d{12}$/.test(value)
    ? `0${value}`
    : /^0\d{12}$/.test(value)
      ? value.slice(1)
      : null;
  const compatibleBarcode = exactBarcode ?? (upcEanAlias
    ? await prisma.product.findFirst({
        where: { barcode: upcEanAlias, barcodeType: { in: ["EAN13", "UPCA"] } },
        include,
      })
    : null);
  const exact = compatibleBarcode ?? (await prisma.product.findUnique({ where: { sku: value.toUpperCase() }, include }));
  if (exact) return { exact, matches: [] };

  const matches = await prisma.product.findMany({
    where: {
      OR: [{ name: { contains: value } }, { sku: { contains: value } }, { barcode: { contains: value } }],
    },
    include,
    orderBy: { name: "asc" },
    take: 10,
  });
  return { exact: null, matches };
}
