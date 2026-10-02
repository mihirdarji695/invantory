import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, Mono, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { MovementBadge, SignedQty } from "@/components/movements/movement-badge";
import { MovementFilters } from "@/components/movements/movement-filters";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MOVEMENT_TYPES, type MovementTypeValue } from "@/lib/stock";
import { formatDate, param, toPositiveInt } from "@/lib/utils";

export const metadata = { title: "Stock movements" };
const PAGE_SIZE = 30;

/** "2026-10-01" -> local Date at start of day (or end of day). */
function parseDay(value: string, endOfDay = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
}

export default async function MovementsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const product = param(sp.product);
  const typeRaw = param(sp.type);
  const type = (MOVEMENT_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as MovementTypeValue) : "";
  const barcode = param(sp.barcode).trim();
  const from = param(sp.from);
  const to = param(sp.to);
  const page = toPositiveInt(param(sp.page), 1);

  const createdAt: Prisma.DateTimeFilter = {};
  const fromDate = parseDay(from);
  const toDate = parseDay(to, true);
  if (fromDate) createdAt.gte = fromDate;
  if (toDate) createdAt.lte = toDate;

  const where: Prisma.StockMovementWhereInput = {
    ...(product ? { productId: product } : {}),
    ...(type ? { type } : {}),
    ...(barcode ? { barcode: { contains: barcode } } : {}),
    ...(fromDate || toDate ? { createdAt } : {}),
  };

  const [products, total, movements] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const filtered = Object.keys(where).length > 0;

  return (
    <>
      <PageHeader title="Stock movements" description="Every stock change, with the level before and after. Movements can't be edited, so the history stays trustworthy." />
      <Card className="overflow-hidden">
        <MovementFilters products={products} />
        {movements.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={filtered ? "No movements match these filters" : "No stock movements yet"}
            description={filtered ? "Try a wider date range or another product." : "Adjust stock on any product to record a movement."}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Product</Th>
                <Th>Barcode</Th>
                <Th>Type</Th>
                <Th className="text-right">Quantity</Th>
                <Th className="text-right">Previous</Th>
                <Th className="text-right">New</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap">{formatDate(m.createdAt)}</Td>
                  <Td className="max-w-60 truncate">
                    {m.productId ? (
                      <Link href={`/products/${m.productId}`} className="font-medium text-ink hover:text-accent hover:underline">{m.productName}</Link>
                    ) : (
                      <span className="text-muted">{m.productName} <span className="text-[12px]">(deleted)</span></span>
                    )}
                  </Td>
                  <Td><Mono>{m.barcode}</Mono></Td>
                  <Td><MovementBadge type={m.type} /></Td>
                  <Td className="text-right"><SignedQty value={m.quantity} /></Td>
                  <Td className="num text-right text-muted">{m.previousStock}</Td>
                  <Td className="num text-right font-medium text-ink">{m.newStock}</Td>
                  <Td className="max-w-64 truncate" title={m.reason ?? undefined}>{m.reason ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/movements" params={{ product, type, barcode, from, to }} />
      </Card>
    </>
  );
}
