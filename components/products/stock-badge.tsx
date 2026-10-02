import { Badge } from "@/components/ui/badge";
import { getStockStatus, STOCK_STATUS_LABEL } from "@/lib/stock";

const TONE = { IN_STOCK: "ok", LOW_STOCK: "warn", OUT_OF_STOCK: "danger" } as const;

export function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  const status = getStockStatus(stock, minStock);
  return (
    <Badge tone={TONE[status]} dot>
      {STOCK_STATUS_LABEL[status]}
    </Badge>
  );
}

/** The quantity itself, colored by status so problems stand out in long tables. */
export function StockQty({ stock, minStock, unit }: { stock: number; minStock: number; unit?: string }) {
  const status = getStockStatus(stock, minStock);
  const color = status === "OUT_OF_STOCK" ? "text-danger" : status === "LOW_STOCK" ? "text-warn" : "text-ink";
  return (
    <span className={`num font-medium ${color}`}>
      {stock}
      {unit && <span className="ml-1 text-[12px] font-normal text-muted">{unit}</span>}
    </span>
  );
}
