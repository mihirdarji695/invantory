import type { BarcodeTypeValue } from "@/lib/barcode";

/** Serializable product shape passed from server components to client components. */
export type ProductSummary = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  barcodeType: BarcodeTypeValue;
  unit: string;
  stock: number;
  minStock: number;
  sellingPrice: number;
};

/** Pick only what client components need (keeps the RSC payload small). */
export function toSummary(p: ProductSummary): ProductSummary {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    barcodeType: p.barcodeType,
    unit: p.unit,
    stock: p.stock,
    minStock: p.minStock,
    sellingPrice: p.sellingPrice,
  };
}
