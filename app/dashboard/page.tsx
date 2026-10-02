import Link from "next/link";
import { AlertTriangle, ArrowLeftRight, CheckCircle2, Package } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Mono, PageHeader } from "@/components/ui/misc";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { MovementBadge, SignedQty } from "@/components/movements/movement-badge";
import { StockBadge, StockQty } from "@/components/products/stock-badge";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { stockStatusWhere } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { cn, formatDate, formatNumber } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [settings, totalProducts, stockSum, lowCount, outCount, valueRow, recentProducts, lowStock, recentMovements] = await Promise.all([
    getSettings(),
    prisma.product.count(),
    prisma.product.aggregate({ _sum: { stock: true } }),
    prisma.product.count({ where: stockStatusWhere("low") }),
    prisma.product.count({ where: stockStatusWhere("out") }),
    prisma.$queryRaw<{ value: number | bigint | null }[]>`SELECT SUM(stock * costPrice) AS value FROM Product WHERE stock > 0`,
    prisma.product.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { category: { select: { name: true } } } }),
    prisma.product.findMany({ where: stockStatusWhere("low"), orderBy: { stock: "asc" }, take: 8 }),
    prisma.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const money = (v: number) => formatMoney(v, settings.currency);
  const inventoryValue = Number(valueRow[0]?.value ?? 0);

  const stats = [
    { label: "Total products", value: formatNumber(totalProducts), href: "/products" },
    { label: "Total stock", value: formatNumber(stockSum._sum.stock ?? 0), note: "units on hand", href: "/inventory" },
    { label: "Low stock", value: formatNumber(lowCount), tone: lowCount > 0 ? "warn" : undefined, href: "/inventory?status=low" },
    { label: "Out of stock", value: formatNumber(outCount), tone: outCount > 0 ? "danger" : undefined, href: "/inventory?status=out" },
    { label: "Inventory value", value: money(inventoryValue), note: "at cost price", href: "/inventory" },
  ] as const;

  return (
    <>
      <PageHeader title="Dashboard" description={`Overview of ${settings.inventoryName}.`} />

      {/* One continuous strip rather than five floating cards — reads like a ledger summary line */}
      <Card className="mb-6 grid grid-cols-2 divide-line overflow-hidden sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group border-b border-line px-5 py-4 transition-colors hover:bg-canvas/60 lg:border-b-0">
            <p className="text-[13px] text-muted group-hover:text-ink-2">{s.label}</p>
            <p
              className={cn(
                "num mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink",
                "tone" in s && s.tone === "warn" && "text-warn",
                "tone" in s && s.tone === "danger" && "text-danger",
              )}
            >
              {s.value}
            </p>
            {"note" in s && <p className="mt-1.5 text-[12px] text-muted">{s.note}</p>}
          </Link>
        ))}
      </Card>

      <Card className="mb-6 overflow-hidden">
        <CardHeader title="Recent products" action={<Link href="/products" className="text-[13px] text-accent hover:underline">All products</Link>} />
        {recentProducts.length === 0 ? (
          <EmptyState icon={Package} title="No products yet" action={<Link href="/products/new" className="text-sm text-accent hover:underline">Add your first product</Link>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Barcode</Th>
                <Th>Category</Th>
                <Th className="text-right">Stock</Th>
                <Th className="text-right">Price</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {recentProducts.map((p) => (
                <Tr key={p.id}>
                  <Td className="max-w-52">
                    <Link href={`/products/${p.id}`} className="block truncate font-medium text-ink hover:text-accent hover:underline">{p.name}</Link>
                  </Td>
                  <Td><Mono>{p.sku}</Mono></Td>
                  <Td><Mono>{p.barcode}</Mono></Td>
                  <Td>{p.category?.name ?? "—"}</Td>
                  <Td className="text-right"><StockQty stock={p.stock} minStock={p.minStock} /></Td>
                  <Td className="num text-right">{money(p.sellingPrice)}</Td>
                  <Td><StockBadge stock={p.stock} minStock={p.minStock} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader title="Recent stock movements" action={<Link href="/movements" className="text-[13px] text-accent hover:underline">All movements</Link>} />
          {recentMovements.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No stock movements yet" description="Adjusting stock records a movement here." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Type</Th>
                  <Th className="text-right">Quantity</Th>
                  <Th className="text-right">Date</Th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((m) => (
                  <Tr key={m.id}>
                    <Td className="max-w-72">
                      {m.productId ? (
                        <Link href={`/products/${m.productId}`} className="block truncate font-medium text-ink hover:text-accent hover:underline">{m.productName}</Link>
                      ) : (
                        <span className="block truncate text-muted" title="Product was deleted">{m.productName} (deleted)</span>
                      )}
                      {m.reason && <span className="block truncate text-[12.5px] text-muted">{m.reason}</span>}
                    </Td>
                    <Td><MovementBadge type={m.type} /></Td>
                    <Td className="text-right"><SignedQty value={m.quantity} /></Td>
                    <Td className="whitespace-nowrap text-right text-[13px]">{formatDate(m.createdAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader
            title="Low stock"
            description="At or below minimum stock"
            action={<Link href="/inventory?status=low" className="text-[13px] text-accent hover:underline">View all</Link>}
          />
          {lowStock.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing is running low" description="Products appear here when stock reaches their minimum level." />
          ) : (
            <ul className="divide-y divide-line">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <AlertTriangle className="size-4 shrink-0 text-warn" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${p.id}`} className="block truncate text-sm font-medium text-ink hover:text-accent hover:underline">{p.name}</Link>
                    <Mono className="text-[12px] text-muted">{p.sku}</Mono>
                  </div>
                  <div className="text-right">
                    <StockQty stock={p.stock} minStock={p.minStock} unit={p.unit} />
                    <p className="num text-[12px] text-muted">min {p.minStock}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
