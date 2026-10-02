/**
 * Sample data so the dashboard isn't empty on first run.
 * Everything created here is flagged `isSample = true`, so it can be removed with
 *   npm run db:remove-samples   (or Settings → Sample data → Remove sample data)
 * Safe to run more than once: existing sample SKUs are skipped.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";
import { gs1CheckDigit, type BarcodeTypeValue } from "../lib/barcode";
import { databaseFilePath } from "../lib/db-path";

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseFilePath() }) });

const CATEGORIES: [string, string][] = [
  ["Hair Products", "General hair products"],
  ["Shampoo", "Cleansing shampoos"],
  ["Conditioner", "Rinse-out and leave-in conditioners"],
  ["Treatment", "Masks, oils and intensive treatments"],
  ["Hair Care", "Detanglers, serums and styling care"],
  ["Tools", "Combs, brushes and styling tools"],
  ["Accessories", "Towels, clips and scrunchies"],
  ["Other", "Everything else"],
];

type SampleProduct = {
  name: string;
  sku: string;
  category: string;
  type: BarcodeTypeValue;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  cost: number; // rupees
  price: number; // rupees
  description: string;
  sales: number[]; // units sold on previous days (keeps the movement ledger consistent)
};

const PRODUCTS: SampleProduct[] = [
  { name: "Nourish Shampoo 300ml", sku: "FOR-SH-001", category: "Shampoo", type: "EAN13", stock: 42, minStock: 10, maxStock: 80, unit: "bottle", cost: 210, price: 449, description: "Sulphate-free daily shampoo for dry hair.", sales: [6, 4, 8] },
  { name: "Volume Lift Shampoo 300ml", sku: "FOR-SH-002", category: "Shampoo", type: "CODE128", stock: 8, minStock: 10, maxStock: 60, unit: "bottle", cost: 220, price: 469, description: "Lightweight shampoo that adds body to fine hair.", sales: [5, 7] },
  { name: "Silk Repair Conditioner 250ml", sku: "FOR-CN-001", category: "Conditioner", type: "EAN13", stock: 35, minStock: 10, maxStock: 70, unit: "bottle", cost: 230, price: 499, description: "Smoothing conditioner with silk proteins.", sales: [3, 5] },
  { name: "Deep Nourish Treatment 200ml", sku: "FOR-TR-001", category: "Treatment", type: "EAN13", stock: 18, minStock: 6, maxStock: 40, unit: "jar", cost: 380, price: 849, description: "Weekly deep-conditioning treatment.", sales: [2, 3, 1] },
  { name: "Bond Rebuild Mask 150ml", sku: "FOR-TR-002", category: "Treatment", type: "UPCA", stock: 0, minStock: 5, maxStock: 30, unit: "jar", cost: 450, price: 999, description: "Repair mask for chemically treated hair.", sales: [4, 6] },
  { name: "Knot Melt Detangler 150ml", sku: "FOR-DT-001", category: "Hair Care", type: "CODE128", stock: 27, minStock: 8, maxStock: 50, unit: "bottle", cost: 190, price: 399, description: "Leave-in spray that releases knots without breakage.", sales: [4, 2] },
  { name: "Scalp Clarifying Serum 50ml", sku: "FOR-SC-001", category: "Hair Care", type: "EAN13", stock: 4, minStock: 6, maxStock: 25, unit: "bottle", cost: 520, price: 1149, description: "Lightweight serum for an oily or flaky scalp.", sales: [3, 2] },
  { name: "Wide-Tooth Detangling Comb", sku: "FOR-TL-001", category: "Tools", type: "CODE128", stock: 60, minStock: 15, maxStock: 120, unit: "pcs", cost: 45, price: 149, description: "Seamless comb for wet hair.", sales: [10, 6] },
  { name: "Microfibre Hair Towel", sku: "FOR-AC-001", category: "Accessories", type: "UPCA", stock: 22, minStock: 5, maxStock: 40, unit: "pcs", cost: 160, price: 399, description: "Quick-dry towel that reduces frizz.", sales: [3] },
  { name: "Satin Scrunchie Set (3 pcs)", sku: "FOR-AC-002", category: "Accessories", type: "CODE128", stock: 3, minStock: 10, maxStock: 50, unit: "set", cost: 90, price: 249, description: "Gentle scrunchies that don't crease hair.", sales: [8, 5, 4] },
];

/** Deterministic, valid barcodes in in-store ranges (no clash with real retail codes). */
function sampleBarcode(type: BarcodeTypeValue, index: number): string {
  const n = String(index + 1).padStart(2, "0");
  if (type === "EAN13") {
    const body = `2009100000${n}`; // 12 digits
    return body + gs1CheckDigit(body);
  }
  if (type === "UPCA") {
    const body = `209100000${n}`; // 11 digits
    return body + gs1CheckDigit(body);
  }
  return `2008100000${n}`; // 12-digit Code 128
}

const daysAgo = (d: number, hour = 11) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, 0, 0, 0);
  return t;
};

async function main() {
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, inventoryName: "My Inventory" } });

  const categoryIds = new Map<string, string>();
  for (const [name, description] of CATEGORIES) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name, description, isSample: true } });
    categoryIds.set(name, c.id);
  }

  let created = 0;
  for (const [i, p] of PRODUCTS.entries()) {
    if (await prisma.product.findUnique({ where: { sku: p.sku } })) continue;
    const barcode = sampleBarcode(p.type, i);
    const opening = p.stock + p.sales.reduce((a, b) => a + b, 0);
    const createdAt = daysAgo(30 - i, 9);

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: p.name,
          sku: p.sku,
          barcode,
          barcodeType: p.type,
          brand: "Forma",
          description: p.description,
          categoryId: categoryIds.get(p.category),
          stock: p.stock,
          minStock: p.minStock,
          maxStock: p.maxStock,
          unit: p.unit,
          costPrice: p.cost * 100,
          sellingPrice: p.price * 100,
          isSample: true,
          createdAt,
        },
      });
      let running = opening;
      const base = { productId: product.id, productName: product.name, barcode };
      await tx.stockMovement.create({
        data: { ...base, type: "STOCK_IN", quantity: opening, previousStock: 0, newStock: opening, reason: "Opening stock", createdAt },
      });
      for (const [j, qty] of p.sales.entries()) {
        const before = running;
        running -= qty;
        await tx.stockMovement.create({
          data: { ...base, type: "STOCK_OUT", quantity: -qty, previousStock: before, newStock: running, reason: "Sale", createdAt: daysAgo(12 - j * 4 - (i % 3), 10 + j + (i % 5)) },
        });
      }
    });
    created++;
  }
  console.log(`Seed complete: ${created} sample products added (${PRODUCTS.length - created} already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
