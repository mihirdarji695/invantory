import { PageHeader } from "@/components/ui/misc";
import { BarcodeGenerator } from "@/components/barcode/barcode-generator";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { param } from "@/lib/utils";

export const metadata = { title: "Barcode generator" };

export default async function BarcodesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [settings, products] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, barcode: true, barcodeType: true, sellingPrice: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const initialProductId = param(sp.productId);

  return (
    <>
      <PageHeader title="Barcode generator" description="Preview, download and print barcode labels for saved products or one-off codes." />
      <BarcodeGenerator
        key={initialProductId}
        products={products}
        initialProductId={initialProductId}
        currency={settings.currency}
        defaultType={settings.defaultBarcodeType}
      />
    </>
  );
}
