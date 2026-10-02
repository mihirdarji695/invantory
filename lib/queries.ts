import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export type StockFilter = "in" | "low" | "out" | "";

/** SQL-side equivalent of getStockStatus() in lib/stock.ts. */
export function stockStatusWhere(status: StockFilter): Prisma.ProductWhereInput {
  const minRef = prisma.product.fields.minStock;
  switch (status) {
    case "out":
      return { stock: { lte: 0 } };
    case "low":
      return { stock: { gt: 0, lte: minRef }, minStock: { gt: 0 } };
    case "in":
      return { stock: { gt: 0 }, OR: [{ minStock: 0 }, { stock: { gt: minRef } }] };
    default:
      return {};
  }
}

export const PRODUCT_SORTS = {
  recent: { label: "Recently added", orderBy: { createdAt: "desc" } },
  name: { label: "Name A–Z", orderBy: { name: "asc" } },
  "stock-asc": { label: "Stock: low to high", orderBy: { stock: "asc" } },
  "stock-desc": { label: "Stock: high to low", orderBy: { stock: "desc" } },
  "price-asc": { label: "Price: low to high", orderBy: { sellingPrice: "asc" } },
  "price-desc": { label: "Price: high to low", orderBy: { sellingPrice: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }>;

export type ProductSort = keyof typeof PRODUCT_SORTS;

export function isProductSort(v: string): v is ProductSort {
  return v in PRODUCT_SORTS;
}

export async function listCategories() {
  return prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}
