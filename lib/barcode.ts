/**
 * Barcode rules shared by the browser and the server (no Node/DOM imports).
 *
 * Generated codes use "restricted circulation" ranges so they never collide
 * with real GS1 retail barcodes:
 *  - EAN-13: prefix 200–299 (in-store use)
 *  - UPC-A : number system 2 (in-store use)
 *  - Code 128: 12 digits starting with "2" (numeric = compact + easy to type)
 */

export const BARCODE_TYPES = ["CODE128", "EAN13", "UPCA"] as const;
export type BarcodeTypeValue = (typeof BARCODE_TYPES)[number];

export const BARCODE_TYPE_LABEL: Record<BarcodeTypeValue, string> = {
  CODE128: "Code 128",
  EAN13: "EAN-13",
  UPCA: "UPC-A",
};

/** bwip-js encoder names */
export const BWIP_ENCODER: Record<BarcodeTypeValue, string> = {
  CODE128: "code128",
  EAN13: "ean13",
  UPCA: "upca",
};

export function isBarcodeType(v: unknown): v is BarcodeTypeValue {
  return typeof v === "string" && (BARCODE_TYPES as readonly string[]).includes(v);
}

/** Accepts "Code 128", "code128", "EAN-13", "ean13", "UPC-A", "upca" … */
export function parseBarcodeType(v: string | undefined | null): BarcodeTypeValue | null {
  if (!v) return null;
  const key = v.toUpperCase().replace(/[\s_-]/g, "");
  if (key === "CODE128") return "CODE128";
  if (key === "EAN13") return "EAN13";
  if (key === "UPCA" || key === "UPC") return "UPCA";
  return null;
}

/** GS1 mod-10 check digit for the given digits (without the check digit). */
export function gs1CheckDigit(body: string): number {
  let sum = 0;
  // Weight 3 applies to the right-most digit of the body, alternating leftwards.
  for (let i = 0; i < body.length; i++) {
    const digit = body.charCodeAt(body.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export type BarcodeCheck = { ok: true; value: string } | { ok: false; error: string };

export function validateBarcode(raw: string, type: BarcodeTypeValue): BarcodeCheck {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Barcode is required." };

  if (type === "CODE128") {
    if (value.length > 48) return { ok: false, error: "Code 128 barcodes can be at most 48 characters." };
    if (!/^[\x20-\x7E]+$/.test(value)) {
      return { ok: false, error: "Code 128 supports letters, numbers and standard symbols only." };
    }
    return { ok: true, value };
  }

  const length = type === "EAN13" ? 13 : 12;
  const name = BARCODE_TYPE_LABEL[type];
  if (!/^\d+$/.test(value)) return { ok: false, error: `${name} barcodes must contain digits only.` };
  if (value.length === length - 1) {
    return {
      ok: false,
      error: `${name} needs ${length} digits. Add the check digit: ${value}${gs1CheckDigit(value)}`,
    };
  }
  if (value.length !== length) return { ok: false, error: `${name} barcodes must be exactly ${length} digits.` };
  const expected = gs1CheckDigit(value.slice(0, -1));
  if (Number(value.at(-1)) !== expected) {
    return { ok: false, error: `Invalid check digit. The last digit should be ${expected}.` };
  }
  return { ok: true, value };
}

function randomDigits(count: number): string {
  const bytes = new Uint32Array(count);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += String(b % 10);
  return out;
}

/** Create a random, valid barcode value. Uniqueness is checked against the DB by the caller. */
export function createBarcodeCandidate(type: BarcodeTypeValue): string {
  switch (type) {
    case "EAN13": {
      const body = `2${randomDigits(11)}`; // 2xxxxxxxxxxx (in-store range 200–299)
      return body + gs1CheckDigit(body);
    }
    case "UPCA": {
      const body = `2${randomDigits(10)}`;
      return body + gs1CheckDigit(body);
    }
    case "CODE128":
    default:
      return `2${randomDigits(11)}`;
  }
}
