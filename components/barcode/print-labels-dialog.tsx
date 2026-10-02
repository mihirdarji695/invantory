"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import type { BarcodeTypeValue } from "@/lib/barcode";
import { formatMoney } from "@/lib/money";
import { BarcodeLabel } from "./label";
import { LabelQuantity } from "./label-quantity";
import { PrintSheet } from "./print-sheet";

export type PrintableProduct = {
  name: string;
  sku: string;
  barcode: string;
  barcodeType: BarcodeTypeValue;
  sellingPrice: number; // paise
};

export function PrintLabelsDialog({
  product,
  currency,
  open,
  onOpenChange,
}: {
  product: PrintableProduct;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [showPrice, setShowPrice] = useState(true);

  const label = {
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    barcodeType: product.barcodeType,
    price: showPrice ? formatMoney(product.sellingPrice, currency) : null,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Print barcode labels" description={`${product.name} · labels are 63.5 × 38.1 mm (A4, 21 per sheet)`}>
        <div className="flex justify-center rounded-md border border-line bg-canvas py-6">
          <BarcodeLabel label={label} outline />
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label>Number of labels</Label>
            <LabelQuantity value={quantity} onChange={setQuantity} id="print-dialog-qty" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" className="size-4 accent-accent" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
            Show price on label
          </label>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => window.print()}>
            <Printer />
            Print {quantity} {quantity === 1 ? "label" : "labels"}
          </Button>
        </DialogFooter>

        {open && <PrintSheet label={label} quantity={quantity} />}
      </DialogContent>
    </Dialog>
  );
}
