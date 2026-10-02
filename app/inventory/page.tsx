import Link from "next/link";
import { Boxes } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, Mono, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { InventoryFilters } from "@/components/inventory/inventory-filters";
import { InventoryRowActions } from "@/components/inventory/inventory-row-actions";
import { StockBadge, StockQty } from "@/components/products/stock-badge";
import { toSummary } from "@/components/products/types";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { stockStatusWhere, type StockFilter } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { formatDate, param, toPositiveInt } from "@/lib/utils";

export const metadata = { title: "Inventory" };
const PAGE_SIZE = 25;

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  "": [{ stock: "asc" }, { name: "asc" }],
  name: [{ name: "asc" }],
  updated: [{ updatedAt: "desc" }],
};

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = param(sp.q).trim();
  const status = param(sp.status) as StockFilter;
  const sort = param(sp.sort) in SORTS ? param(sp.sort) : "";
  const page = toPositiveInt(param(sp.page), 1);

  const search: Prisma.ProductWhereInput = q
    ? { OR: [{ name: { contains: q } }, { sku: { contains: q.toUpperCase() } }, { barcode: { contains: q } }] }
    : {};
  const where: Prisma.ProductWhereInput = { AND: [search, stockStatusWhere(status)] };

  const [settings, total, products, all, inStock, low, out] = await Promise.all([
    getSettings(),
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: [...SORTS[sort], { id: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.product.count({ where: search }),
    prisma.product.count({ where: { AND: [search, stockStatusWhere("in")] } }),
    prisma.product.count({ where: { AND: [search, stockStatusWhere("low")] } }),
    prisma.product.count({ where: { AND: [search, stockStatusWhere("out")] } }),
  ]);

  return (
    <>
      <PageHeader title="Inventory" description="Stock levels for every product. Adjust stock to record purchases, sales and corrections." />
      <Card className="overflow-hidden">
        <InventoryFilters counts={{ all, in: inStock, low, out }} />
        {products.length === 0 ? (
          <EmptyState icon={Boxes} title={all === 0 && !q ? "No products yet" : "No products match"} description={all === 0 && !q ? "Add a product to start tracking stock." : "Try another status or search."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Barcode</Th>
                <Th className="text-right">Current stock</Th>
                <Th className="text-right">Minimum</Th>
                <Th>Status</Th>
                <Th>Last updated</Th>
                <Th className="w-28"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <Tr key={p.id}>
                  <Td className="max-w-64">
                    <Link href={`/products/${p.id}`} className="block truncate font-medium text-ink hover:text-accent hover:underline">{p.name}</Link>
                  </Td>
                  <Td><Mono>{p.sku}</Mono></Td>
                  <Td><Mono>{p.barcode}</Mono></Td>
                  <Td className="text-right"><StockQty stock={p.stock} minStock={p.minStock} unit={p.unit} /></Td>
                  <Td className="num text-right text-muted">{p.minStock}</Td>
                  <Td><StockBadge stock={p.stock} minStock={p.minStock} /></Td>
                  <Td className="whitespace-nowrap">{formatDate(p.updatedAt)}</Td>
                  <Td><InventoryRowActions product={toSummary(p)} currency={settings.currency} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/inventory" params={{ q, status, sort }} />
      </Card>
    </>
  );
}
