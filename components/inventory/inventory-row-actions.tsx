"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductActions } from "@/components/products/product-actions";
import type { ProductSummary } from "@/components/products/types";
import { AdjustStockDialog } from "./adjust-stock-dialog";

/** Inventory rows put "Adjust" one click away; everything else is in the menu. */
export function InventoryRowActions({ product, currency }: { product: ProductSummary; currency: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Adjust</Button>
      <ProductActions product={product} currency={currency} />
      <AdjustStockDialog product={product} open={open} onOpenChange={setOpen} />
    </div>
  );
}
