import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, Mono } from "@/components/ui/misc";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { BarcodeLabel } from "@/components/barcode/label";
import { MovementBadge, SignedQty } from "@/components/movements/movement-badge";
import { ProductDetailActions } from "@/components/products/product-detail-actions";
import { ProductThumb } from "@/components/products/product-thumb";
import { StockBadge } from "@/components/products/stock-badge";
import { toSummary } from "@/components/products/types";
import { BARCODE_TYPE_LABEL } from "@/lib/barcode";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, settings] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { category: true, movements: { orderBy: { createdAt: "desc" }, take: 15 } },
    }),
    getSettings(),
  ]);
  if (!product) notFound();
  const money = (v: number) => formatMoney(v, settings.currency);

  const details: [string, React.ReactNode][] = [
    ["SKU", <Mono key="sku">{product.sku}</Mono>],
    ["Barcode", <Mono key="bc">{product.barcode}</Mono>],
    ["Barcode type", BARCODE_TYPE_LABEL[product.barcodeType]],
    ["Category", product.category?.name ?? "Uncategorized"],
    ["Brand", product.brand ?? "—"],
    ["Unit", product.unit],
    ["Minimum stock", <span key="min" className="num">{product.minStock}</span>],
    ["Maximum stock", <span key="max" className="num">{product.maxStock ?? "—"}</span>],
    ["Cost price", <span key="cp" className="num">{money(product.costPrice)}</span>],
    ["Selling price", <span key="sp" className="num">{money(product.sellingPrice)}</span>],
    ["Stock value (cost)", <span key="sv" className="num">{money(product.costPrice * product.stock)}</span>],
    ["Last updated", formatDate(product.updatedAt)],
  ];

  return (
    <>
      <Link href="/products" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" />
        Products
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ProductThumb image={product.image} name={product.name} size="lg" />
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StockBadge stock={product.stock} minStock={product.minStock} />
              <span className="num text-sm text-ink-2">
                <span className="text-lg font-semibold text-ink">{product.stock}</span> {product.unit} in stock
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ProductDetailActions product={toSummary(product)} currency={settings.currency} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {details.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-dashed border-line pb-2 text-sm">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              {product.description && <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink-2">{product.description}</p>}
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Stock history"
              action={<Link href={`/movements?product=${product.id}`} className="text-[13px] text-accent hover:underline">View all</Link>}
            />
            {product.movements.length === 0 ? (
              <EmptyState icon={History} title="No stock movements yet" description="Use Adjust stock to record purchases, sales and corrections." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Type</Th>
                    <Th className="text-right">Qty</Th>
                    <Th className="text-right">Stock</Th>
                    <Th>Reason</Th>
                  </tr>
                </thead>
                <tbody>
                  {product.movements.map((m) => (
                    <Tr key={m.id}>
                      <Td className="whitespace-nowrap">{formatDate(m.createdAt)}</Td>
                      <Td><MovementBadge type={m.type} /></Td>
                      <Td className="text-right"><SignedQty value={m.quantity} /></Td>
                      <Td className="num text-right whitespace-nowrap">{m.previousStock} → <span className="font-medium text-ink">{m.newStock}</span></Td>
                      <Td className="max-w-56 truncate">{m.reason ?? "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader title="Barcode label" action={<Link href={`/barcodes?productId=${product.id}`} className="text-[13px] text-accent hover:underline">Open in generator</Link>} />
          <CardBody className="flex justify-center bg-canvas/60">
            <BarcodeLabel
              outline
              label={{ name: product.name, sku: product.sku, barcode: product.barcode, barcodeType: product.barcodeType, price: money(product.sellingPrice) }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
