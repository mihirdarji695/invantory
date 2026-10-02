"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MAX_PRINT_LABELS, clampQuantity } from "./print-sheet";

const PRESETS = [1, 2, 4, 8];

/** Preset buttons (1/2/4/8) plus a custom quantity field. */
export function LabelQuantity({ value, onChange, id = "label-qty" }: { value: number; onChange: (n: number) => void; id?: string }) {
  const isCustom = !PRESETS.includes(value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Number of labels" className="inline-flex rounded-md border border-line-strong bg-paper p-0.5">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "h-8 min-w-10 rounded-[5px] px-3 text-sm font-medium text-ink-2 transition-colors hover:text-ink",
              value === n && "bg-accent text-white hover:text-white",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <label htmlFor={id} className="text-[13px] text-muted">
        Custom
      </label>
      <Input
        id={id}
        type="number"
        min={1}
        max={MAX_PRINT_LABELS}
        inputMode="numeric"
        className={cn("num w-20", isCustom && "border-accent")}
        value={value}
        onChange={(e) => onChange(clampQuantity(Number(e.target.value)))}
      />
    </div>
  );
}
