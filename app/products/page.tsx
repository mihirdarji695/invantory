import Link from "next/link";
import { Download, Package, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Mono, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { ProductActions } from "@/components/products/product-actions";
import { ProductsFilters } from "@/components/products/products-filters";
import { ProductThumb } from "@/components/products/product-thumb";
import { toSummary } from "@/components/products/types";
import { StockBadge, StockQty } from "@/components/products/stock-badge";
import type { Prisma } from "@/lib/generated/prisma/client";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { isProductSort, listCategories, PRODUCT_SORTS, stockStatusWhere, type StockFilter } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { param, toPositiveInt } from "@/lib/utils";

export const metadata = { title: "Products" };

const PAGE_SIZE = 20;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = param(sp.q).trim();
  const sku = param(sp.sku).trim();
  const barcode = param(sp.barcode).trim();
  const category = param(sp.category);
  const status = param(sp.status) as StockFilter;
  const sortKey = param(sp.sort);
  const sort = isProductSort(sortKey) ? sortKey : "recent";
  const page = toPositiveInt(param(sp.page), 1);

  const and: Prisma.ProductWhereInput[] = [stockStatusWhere(status)];
  if (q) and.push({ OR: [{ name: { contains: q } }, { brand: { contains: q } }, { description: { contains: q } }] });
  if (sku) and.push({ sku: { contains: sku.toUpperCase() } });
  if (barcode) and.push({ barcode: { contains: barcode } });
  if (category === "none") and.push({ categoryId: null });
  else if (category) and.push({ categoryId: category });
  const where: Prisma.ProductWhereInput = { AND: and };

  const [settings, categories, total, products] = await Promise.all([
    getSettings(),
    listCategories(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: [PRODUCT_SORTS[sort].orderBy, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const filtered = and.length > 1;

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything you stock, with its barcode."
        actions={
          <>
            <a href="/api/products/export" className={buttonVariants({ variant: "secondary" })}>
              <Download />
              Export CSV
            </a>
            <Link href="/products/new" className={buttonVariants()}>
              <Plus />
              Add product
            </Link>
          </>
        }
      />
      <Card className="overflow-hidden">
        <ProductsFilters categories={categories} sorts={Object.entries(PRODUCT_SORTS).map(([value, s]) => ({ value: value === "recent" ? "" : value, label: s.label }))} />
        {products.length === 0 ? (
          filtered ? (
            <EmptyState icon={Package} title="No products match these filters" description="Try a different search or clear the filters." />
          ) : (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product and the system will create a barcode for it."
              action={<Link href="/products/new" className={buttonVariants()}><Plus />Add product</Link>}
            />
          )
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-14"><span className="sr-only">Image</span></Th>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Barcode</Th>
                <Th>Category</Th>
                <Th className="text-right">Quantity</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Price</Th>
                <Th>Status</Th>
                <Th className="w-12"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <Tr key={p.id}>
                  <Td><ProductThumb image={p.image} name={p.name} /></Td>
                  <Td className="max-w-64">
                    <Link href={`/products/${p.id}`} className="block truncate font-medium text-ink hover:text-accent hover:underline">{p.name}</Link>
                    {p.brand && <span className="block truncate text-[12.5px] text-muted">{p.brand}</span>}
                  </Td>
                  <Td><Mono>{p.sku}</Mono></Td>
                  <Td><Mono>{p.barcode}</Mono></Td>
                  <Td>{p.category?.name ?? <span className="text-muted">—</span>}</Td>
                  <Td className="text-right"><StockQty stock={p.stock} minStock={p.minStock} unit={p.unit} /></Td>
                  <Td className="num text-right">{formatMoney(p.costPrice, settings.currency)}</Td>
                  <Td className="num text-right font-medium text-ink">{formatMoney(p.sellingPrice, settings.currency)}</Td>
                  <Td><StockBadge stock={p.stock} minStock={p.minStock} /></Td>
                  <Td>
                    <ProductActions product={toSummary(p)} currency={settings.currency} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/products" params={{ q, sku, barcode, category, status, sort: sort === "recent" ? "" : sort }} />
      </Card>
    </>
  );
}
