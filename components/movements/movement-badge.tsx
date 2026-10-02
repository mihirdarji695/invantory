import { Badge } from "@/components/ui/badge";
import { MOVEMENT_LABEL, type MovementTypeValue } from "@/lib/stock";

const TONE: Record<MovementTypeValue, "ok" | "warn" | "danger" | "neutral" | "accent"> = {
  STOCK_IN: "ok",
  RETURN: "accent",
  STOCK_OUT: "neutral",
  ADJUSTMENT: "warn",
  DAMAGED: "danger",
  LOST: "danger",
};

export function MovementBadge({ type }: { type: MovementTypeValue }) {
  return <Badge tone={TONE[type]}>{MOVEMENT_LABEL[type]}</Badge>;
}

export function SignedQty({ value }: { value: number }) {
  const color = value > 0 ? "text-ok" : value < 0 ? "text-danger" : "text-muted";
  return <span className={`num font-medium ${color}`}>{value > 0 ? `+${value}` : value}</span>;
}
