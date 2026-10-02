import { NextResponse, type NextRequest } from "next/server";
import { findByCode } from "@/lib/services/products";

export type LookupProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  barcodeType: string;
  brand: string | null;
  unit: string;
  stock: number;
  minStock: number;
  sellingPrice: number;
  image: string | null;
  category: string | null;
  updatedAt: string;
};

function toDto(p: Awaited<ReturnType<typeof findByCode>>["matches"][number]): LookupProduct {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    barcodeType: p.barcodeType,
    brand: p.brand,
    unit: p.unit,
    stock: p.stock,
    minStock: p.minStock,
    sellingPrice: p.sellingPrice,
    image: p.image,
    category: p.category?.name ?? null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** GET /api/products/lookup?code=890123456789 — used by Barcode Search and scanners. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const { exact, matches } = await findByCode(code);
  return NextResponse.json(
    { exact: exact ? toDto(exact) : null, matches: matches.map(toDto) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
