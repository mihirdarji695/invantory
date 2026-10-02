/**
 * Money helpers. Prices are stored as integer paise (minor units) in SQLite so
 * arithmetic is exact. Convert only at the edges (forms, CSV, display).
 */

export const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

/** "149.50" | 149.5 -> 14950. Returns NaN for invalid input. */
export function toMinor(value: string | number): number {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[,\s₹]/g, ""));
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

/** 14950 -> 149.5 */
export function fromMinor(minor: number): number {
  return minor / 100;
}

/** 14950 -> "149.50" (for form inputs and CSV) */
export function minorToInput(minor: number): string {
  return (minor / 100).toFixed(2);
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(minor: number, currency: string = "INR"): string {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, f);
  }
  return f.format(minor / 100);
}
