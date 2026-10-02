"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCANNER_DEFAULTS, type OnScan } from "./types";

export type ScannerInputHandle = { focus: () => void; clear: () => void };

/**
 * Auto-focused input for keyboard-wedge scanners and manual entry.
 * Pressing Enter (which scanners send automatically) submits the code.
 */
export const ScannerInput = forwardRef<
  ScannerInputHandle,
  { onScan: OnScan; placeholder?: string; autoFocus?: boolean; className?: string; defaultValue?: string }
>(function ScannerInput({ onScan, placeholder = "Scan or type a barcode, then press Enter", autoFocus = true, className, defaultValue = "" }, ref) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const timings = useRef<number[]>([]); // gaps between keystrokes, used to tell scanner vs human
  const lastKeyAt = useRef(0);

  useImperativeHandle(ref, () => ({
    focus: () => input.current?.focus(),
    clear: () => setValue(""),
  }));

  return (
    <div className={cn("relative", className)}>
      <ScanBarcode className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
      <input
        ref={input}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const code = value.trim();
            if (!code) return;
            const t = timings.current;
            const fast = t.length >= SCANNER_DEFAULTS.minLength && t.every((d) => d < SCANNER_DEFAULTS.maxKeyIntervalMs);
            timings.current = [];
            lastKeyAt.current = 0;
            onScan(code, fast ? "scanner" : "keyboard");
            input.current?.select(); // next scan replaces the text
            return;
          }
          const now = performance.now();
          timings.current = lastKeyAt.current ? [...timings.current.slice(-30), now - lastKeyAt.current] : [];
          lastKeyAt.current = now;
        }}
        placeholder={placeholder}
        aria-label="Barcode"
        autoComplete="off"
        spellCheck={false}
        inputMode="text"
        className="h-14 w-full rounded-lg border border-line-strong bg-paper pl-12 pr-4 font-mono text-lg tracking-wide text-ink placeholder:font-sans placeholder:text-[15px] placeholder:tracking-normal placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
      />
    </div>
  );
});
