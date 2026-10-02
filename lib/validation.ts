import { z } from "zod";
import { BARCODE_TYPES, validateBarcode } from "@/lib/barcode";
import { ADJUST_MODES } from "@/lib/stock";
import { SUPPORTED_CURRENCIES, toMinor } from "@/lib/money";

/* ---------- reusable field builders ---------- */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const wholeNumber = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return 0;
      const n = Number(v);
      if (!Number.isInteger(n)) {
        ctx.addIssue({ code: "custom", message: `${label} must be a whole number.` });
        return z.NEVER;
      }
      if (n < 0) {
        ctx.addIssue({ code: "custom", message: `${label} cannot be negative.` });
        return z.NEVER;
      }
      return n;
    });

const optionalWholeNumber = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) {
        ctx.addIssue({ code: "custom", message: `${label} must be a whole number of 0 or more.` });
        return z.NEVER;
      }
      return n;
    });

/** Decimal money string -> integer paise */
const money = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return 0;
      const minor = toMinor(v);
      if (Number.isNaN(minor)) {
        ctx.addIssue({ code: "custom", message: `${label} must be a number.` });
        return z.NEVER;
      }
      if (minor < 0) {
        ctx.addIssue({ code: "custom", message: `${label} cannot be negative.` });
        return z.NEVER;
      }
      return minor;
    });

/* ---------- product ---------- */

const productBase = z.object({
  name: z.string().trim().min(1, "Product name is required.").max(120, "Keep the name under 120 characters."),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required.")
    .max(64, "SKU must be 64 characters or fewer.")
    .regex(/^[A-Za-z0-9._\-/]+$/, "Use letters, numbers, dashes, dots, slashes or underscores only.")
    .transform((v) => v.toUpperCase()),
  categoryId: optionalText(64),
  brand: optionalText(80),
  description: optionalText(2000),
  minStock: wholeNumber("Minimum stock"),
  maxStock: optionalWholeNumber("Maximum stock"),
  unit: z.string().trim().min(1, "Unit is required.").max(20),
  costPrice: money("Cost price"),
  sellingPrice: money("Selling price"),
  barcodeType: z.enum(BARCODE_TYPES, { message: "Choose a barcode type." }),
  barcode: z.string().trim(),
});

function refineProduct<T extends z.infer<typeof productBase>>(data: T, ctx: z.RefinementCtx) {
  const check = validateBarcode(data.barcode, data.barcodeType);
  if (!check.ok) ctx.addIssue({ code: "custom", path: ["barcode"], message: check.error });
  if (data.maxStock !== null && data.maxStock < data.minStock) {
    ctx.addIssue({
      code: "custom",
      path: ["maxStock"],
      message: "Maximum stock must be greater than or equal to minimum stock.",
    });
  }
}

export const productCreateSchema = productBase
  .extend({ stock: wholeNumber("Current stock") })
  .superRefine(refineProduct);

/** Stock is intentionally NOT editable here — use Adjust Stock so it is recorded. */
export const productUpdateSchema = productBase.superRefine(refineProduct);

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

/* ---------- stock adjustment ---------- */

export const adjustStockSchema = z.object({
  productId: z.string().min(1),
  mode: z.enum(ADJUST_MODES),
  quantity: wholeNumber("Quantity"),
  reason: z.string().trim().min(1, "Choose a reason.").max(60),
  note: optionalText(200),
});

/* ---------- category ---------- */

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(60, "Keep the name under 60 characters."),
  description: optionalText(300),
});

/* ---------- settings ---------- */

export const settingsSchema = z.object({
  inventoryName: z.string().trim().min(1, "Inventory name is required.").max(80),
  currency: z.enum(SUPPORTED_CURRENCIES),
  defaultBarcodeType: z.enum(BARCODE_TYPES),
  defaultUnit: z.string().trim().min(1, "Default unit is required.").max(20),
  lowStockThreshold: wholeNumber("Low stock threshold"),
});

/* ---------- helpers ---------- */

/** FormData -> plain object of strings (files are ignored). */
export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export type FieldErrors = Record<string, string>;

export function flattenErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors };
