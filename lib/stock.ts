export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

/**
 * Low stock = stock is at or below the product's minimum (reorder) level.
 * A minimum of 0 disables the low-stock warning for that product.
 */
export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (minStock > 0 && stock <= minStock) return "LOW_STOCK";
  return "IN_STOCK";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

export const MOVEMENT_TYPES = [
  "STOCK_IN",
  "STOCK_OUT",
  "ADJUSTMENT",
  "RETURN",
  "DAMAGED",
  "LOST",
] as const;
export type MovementTypeValue = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_LABEL: Record<MovementTypeValue, string> = {
  STOCK_IN: "Stock in",
  STOCK_OUT: "Stock out",
  ADJUSTMENT: "Adjustment",
  RETURN: "Return",
  DAMAGED: "Damaged",
  LOST: "Lost",
};

export const ADJUST_MODES = ["IN", "OUT", "SET"] as const;
export type AdjustMode = (typeof ADJUST_MODES)[number];

export const ADJUST_REASONS: Record<AdjustMode, string[]> = {
  IN: ["Purchase", "Return", "Manual Adjustment"],
  OUT: ["Sale", "Damaged", "Lost", "Manual Adjustment"],
  SET: ["Manual Adjustment", "Stock count", "Damaged", "Lost"],
};

/** Map the user's choice in the Adjust Stock form to a ledger movement type. */
export function movementTypeFor(mode: AdjustMode, reason: string): MovementTypeValue {
  if (mode === "SET") return "ADJUSTMENT";
  if (mode === "IN") return reason === "Return" ? "RETURN" : "STOCK_IN";
  if (reason === "Damaged") return "DAMAGED";
  if (reason === "Lost") return "LOST";
  return "STOCK_OUT";
}

/** Compute the resulting stock for an adjustment. Throws on invalid input. */
export function applyAdjustment(current: number, mode: AdjustMode, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a whole number of 0 or more.");
  }
  if (mode !== "SET" && quantity === 0) throw new Error("Quantity must be at least 1.");
  const next = mode === "IN" ? current + quantity : mode === "OUT" ? current - quantity : quantity;
  if (next < 0) {
    throw new Error(`Cannot remove ${quantity}. Only ${current} in stock.`);
  }
  return { newStock: next, delta: next - current };
}
