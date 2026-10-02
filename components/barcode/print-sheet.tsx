"use client";

import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { BarcodeLabel } from "./label";
import type { LabelContent } from "./render";

/**
 * Renders labels into <body> as `.print-sheet`. It is invisible on screen; when
 * the browser prints, globals.css hides everything except this sheet.
 */
export function PrintSheet({ label, quantity }: { label: LabelContent; quantity: number }) {
  const isClient = useIsClient();
  if (!isClient) return null;

  return createPortal(
    <div className="print-sheet" aria-hidden>
      <div className="label-grid">
        {Array.from({ length: quantity }, (_, i) => (
          <BarcodeLabel key={i} label={label} />
        ))}
      </div>
    </div>,
    document.body,
  );
}

export const MAX_PRINT_LABELS = 210; // 10 A4 sheets of 21 labels

export function clampQuantity(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_PRINT_LABELS, Math.max(1, Math.round(n)));
}
