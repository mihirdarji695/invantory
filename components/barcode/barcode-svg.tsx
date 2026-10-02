"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { BarcodeTypeValue } from "@/lib/barcode";
import { cn } from "@/lib/utils";
import { renderBarcodeSvg } from "./render";

/** Renders barcode bars as inline SVG. Shows the validation error instead of bars if invalid. */
export function BarcodeSvg({
  value,
  type,
  className,
  showError = true,
}: {
  value: string;
  type: BarcodeTypeValue;
  className?: string;
  showError?: boolean;
}) {
  const result = useMemo(() => renderBarcodeSvg(value, type), [value, type]);

  if (!result.ok) {
    if (!showError) return null;
    return (
      <div className={cn("flex items-center justify-center gap-2 text-center text-[12.5px] text-warn", className)}>
        <AlertTriangle className="size-4 shrink-0" />
        <span>{value ? result.error : "Enter or generate a barcode"}</span>
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={`Barcode ${value}`}
      className={cn("[&>svg]:h-full [&>svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
  );
}
