import "server-only";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { createBarcodeCandidate, parseBarcodeType, validateBarcode, type BarcodeTypeValue } from "@/lib/barcode";
import { minorToInput } from "@/lib/money";
import { flattenErrors, productCreateSchema, type ProductCreateInput } from "@/lib/validation";
import { getSettings } from "@/lib/settings";

export const CSV_COLUMNS = [
  "name",
  "sku",
  "barcode",
  "barcodeType",
  "brand",
  "category",
  "stock",
  "minStock",
  "maxStock",
  "unit",
  "costPrice",
  "sellingPrice",
  "description",
] as const;

const REQUIRED_COLUMNS = ["name", "sku"] as const;
export const MAX_IMPORT_ROWS = 5000;

/* ------------------------------ export ------------------------------ */

export async function productsToCsv(): Promise<string> {
  const products = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const rows = products.map((p) => ({
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    barcodeType: p.barcodeType,
    brand: p.brand ?? "",
    category: p.category?.name ?? "",
    stock: p.stock,
    minStock: p.minStock,
    maxStock: p.maxStock ?? "",
    unit: p.unit,
    costPrice: minorToInput(p.costPrice),
    sellingPrice: minorToInput(p.sellingPrice),
    description: p.description ?? "",
  }));
  return Papa.unparse({ fields: [...CSV_COLUMNS], data: rows.map((r) => CSV_COLUMNS.map((c) => r[c])) });
}

export function csvTemplate(): string {
  return Papa.unparse({
    fields: [...CSV_COLUMNS],
    data: [
      ["Argan Hair Oil 100ml", "ARG-OIL-100", "", "CODE128", "Lumière", "Treatment", "24", "5", "60", "pcs", "320.00", "549.00", "Lightweight finishing oil"],
    ],
  });
}

/* ------------------------------ import ------------------------------ */

export type ImportIssue = { row: number; field?: string; message: string };
export type ImportReport = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  categoriesCreated: number;
  errors: ImportIssue[];
  applied: boolean;
};

export type ImportOptions = {
  updateExisting: boolean; // match existing products by SKU and update them
  skipInvalid: boolean; // import the valid rows even if some rows have errors
};

type PlannedRow = {
  row: number;
  data: ProductCreateInput;
  categoryName: string | null;
  existingId: string | null;
  existingStock: number;
};

/** Strip Excel-style ="0123" wrappers and whitespace. */
function clean(value: unknown): string {
  const s = String(value ?? "").trim();
  const m = /^="(.*)"$/.exec(s);
  return (m ? m[1] : s).trim();
}

export async function importProductsCsv(text: string, options: ImportOptions): Promise<ImportReport> {
  const report: ImportReport = { totalRows: 0, created: 0, updated: 0, skipped: 0, categoriesCreated: 0, errors: [], applied: false };

  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  const lowerToHeader = new Map(headers.map((h) => [h.toLowerCase(), h]));
  const missing = REQUIRED_COLUMNS.filter((c) => !lowerToHeader.has(c.toLowerCase()));
  if (missing.length) {
    report.errors.push({ row: 1, message: `Missing required column(s): ${missing.join(", ")}. Expected header: ${CSV_COLUMNS.join(",")}` });
    return report;
  }
  for (const e of parsed.errors.slice(0, 20)) {
    report.errors.push({ row: (e.row ?? 0) + 2, message: `CSV format problem: ${e.message}` });
  }

  const rows = parsed.data;
  report.totalRows = rows.length;
  if (rows.length === 0) {
    report.errors.push({ row: 1, message: "The file has a header but no product rows." });
    return report;
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    report.errors.push({ row: 1, message: `Import at most ${MAX_IMPORT_ROWS} rows at a time.` });
    return report;
  }

  const get = (r: Record<string, string>, col: string) => clean(r[lowerToHeader.get(col.toLowerCase()) ?? col]);

  const settings = await getSettings();
  const [existingProducts, categories] = await Promise.all([
    prisma.product.findMany({ select: { id: true, sku: true, barcode: true, stock: true } }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);
  const bySku = new Map(existingProducts.map((p) => [p.sku, p]));
  const byBarcode = new Map(existingProducts.map((p) => [p.barcode, p]));
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

  const seenSku = new Map<string, number>();
  const seenBarcode = new Map<string, number>();
  const planned: PlannedRow[] = [];
  const invalidRows = new Set<number>();

  rows.forEach((r, index) => {
    const rowNo = index + 2; // +1 for header, +1 for 1-based numbering
    const issues: ImportIssue[] = [];

    const typeRaw = get(r, "barcodeType");
    const barcodeType: BarcodeTypeValue | null = typeRaw ? parseBarcodeType(typeRaw) : settings.defaultBarcodeType;
    if (!barcodeType) issues.push({ row: rowNo, field: "barcodeType", message: `Unknown barcode type "${typeRaw}". Use CODE128, EAN13 or UPCA.` });

    const sku = get(r, "sku").toUpperCase();
    const existing = bySku.get(sku) ?? null;
    if (existing && !options.updateExisting) {
      issues.push({ row: rowNo, field: "sku", message: `SKU ${sku} already exists. Enable "Update existing products" to update it.` });
    }

    // Empty barcode: keep the existing one when updating, otherwise generate one.
    let barcode = get(r, "barcode");
    if (!barcode && barcodeType) {
      if (existing) barcode = existing.barcode;
      else {
        do barcode = createBarcodeCandidate(barcodeType);
        while (byBarcode.has(barcode) || seenBarcode.has(barcode));
      }
    }

    const parsedRow = productCreateSchema.safeParse({
      name: get(r, "name"),
      sku,
      barcode,
      barcodeType: barcodeType ?? "",
      brand: get(r, "brand"),
      description: get(r, "description"),
      categoryId: "",
      stock: get(r, "stock"),
      minStock: get(r, "minStock") || String(settings.lowStockThreshold),
      maxStock: get(r, "maxStock"),
      unit: get(r, "unit") || settings.defaultUnit,
      costPrice: get(r, "costPrice"),
      sellingPrice: get(r, "sellingPrice"),
    });
    if (!parsedRow.success) {
      const fieldErrors = flattenErrors(parsedRow.error);
      // Zod skips cross-field checks once a field fails, so check the barcode
      // independently — the user then sees every problem in one pass.
      if (!fieldErrors.barcode && barcodeType && barcode) {
        const check = validateBarcode(barcode, barcodeType);
        if (!check.ok) fieldErrors.barcode = check.error;
      }
      for (const [field, message] of Object.entries(fieldErrors)) {
        if (field === "barcodeType" && !barcodeType) continue;
        issues.push({ row: rowNo, field, message });
      }
    }

    if (barcode) {
      const owner = byBarcode.get(barcode);
      if (owner && owner.id !== existing?.id) {
        issues.push({ row: rowNo, field: "barcode", message: `Barcode ${barcode} is already assigned to another product.` });
      }
      const dupRow = seenBarcode.get(barcode);
      if (dupRow) issues.push({ row: rowNo, field: "barcode", message: `Barcode ${barcode} is repeated (also on row ${dupRow}).` });
      seenBarcode.set(barcode, rowNo);
    }
    if (sku) {
      const dupRow = seenSku.get(sku);
      if (dupRow) issues.push({ row: rowNo, field: "sku", message: `SKU ${sku} is repeated (also on row ${dupRow}).` });
      seenSku.set(sku, rowNo);
    }

    if (issues.length || !parsedRow.success) {
      report.errors.push(...issues);
      invalidRows.add(rowNo);
      return;
    }
    planned.push({
      row: rowNo,
      data: parsedRow.data,
      categoryName: get(r, "category") || null,
      existingId: existing?.id ?? null,
      existingStock: existing?.stock ?? 0,
    });
  });

  report.skipped = invalidRows.size;
  if (invalidRows.size > 0 && !options.skipInvalid) return report; // validate-first: nothing written
  if (planned.length === 0) return report;

  await prisma.$transaction(async (tx) => {
    for (const p of planned) {
      let categoryId: string | null = null;
      if (p.categoryName) {
        const key = p.categoryName.toLowerCase();
        let category = categoryByName.get(key);
        if (!category) {
          category = await tx.category.create({ data: { name: p.categoryName }, select: { id: true, name: true } });
          categoryByName.set(key, category);
          report.categoriesCreated++;
        }
        categoryId = category.id;
      }
      const { stock, ...rest } = p.data;
      const data = { ...rest, categoryId };

      if (p.existingId) {
        const product = await tx.product.update({ where: { id: p.existingId }, data: { ...data, stock } });
        if (stock !== p.existingStock) {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              productName: product.name,
              barcode: product.barcode,
              type: "ADJUSTMENT",
              quantity: stock - p.existingStock,
              previousStock: p.existingStock,
              newStock: stock,
              reason: "CSV import",
            },
          });
        }
        report.updated++;
      } else {
        const product = await tx.product.create({ data: { ...data, stock } });
        if (stock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              productName: product.name,
              barcode: product.barcode,
              type: "STOCK_IN",
              quantity: stock,
              previousStock: 0,
              newStock: stock,
              reason: "Opening stock (CSV import)",
            },
          });
        }
        report.created++;
      }
    }
  });
  report.applied = true;
  return report;
}
