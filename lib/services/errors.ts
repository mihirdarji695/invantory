import { Prisma } from "@/lib/generated/prisma/client";

export class UserFacingError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const DUPLICATE_BARCODE_MESSAGE = "This barcode is already assigned to another product.";
export const DUPLICATE_SKU_MESSAGE = "This SKU is already used by another product.";

/** Translate low-level database errors into messages a person can act on. */
export function toUserError(error: unknown): UserFacingError {
  if (error instanceof UserFacingError) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const detail = JSON.stringify(error.meta ?? {}) + error.message;
      if (/barcode/i.test(detail)) return new UserFacingError(DUPLICATE_BARCODE_MESSAGE, { barcode: DUPLICATE_BARCODE_MESSAGE });
      if (/sku/i.test(detail)) return new UserFacingError(DUPLICATE_SKU_MESSAGE, { sku: DUPLICATE_SKU_MESSAGE });
      if (/name/i.test(detail)) return new UserFacingError("A category with this name already exists.", { name: "A category with this name already exists." });
      return new UserFacingError("This record conflicts with an existing one.");
    }
    if (error.code === "P2025") return new UserFacingError("The record no longer exists. Refresh the page and try again.");
    if (error.code === "P2003") return new UserFacingError("A related record is missing (for example, the category was deleted).");
  }

  console.error("[database]", error);
  return new UserFacingError("Something went wrong while saving. Check the terminal running npm run dev for details.");
}
