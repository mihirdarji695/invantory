"use client";

import { cn } from "@/lib/utils";
import { BarcodeSvg } from "./barcode-svg";
import type { LabelContent } from "./render";

/** One physical label (63.5 × 38.1 mm). Used on screen previews and on the print sheet. */
export function BarcodeLabel({ label, outline, className }: { label: LabelContent; outline?: boolean; className?: string }) {
  return (
    <div className={cn("label bg-white", outline && "label-outline", className)}>
      <div className="label-name" title={label.name}>{label.name || "Product name"}</div>
      <div className="label-sku">SKU: {label.sku || "—"}</div>
      <div className="label-code">
        <BarcodeSvg value={label.barcode} type={label.barcodeType} showError={false} />
      </div>
      <div className="label-number">{label.barcode}</div>
      {label.price && <div className="label-price">{label.price}</div>}
    </div>
  );
}
