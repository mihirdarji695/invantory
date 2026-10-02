import { PageHeader } from "@/components/ui/misc";
import { ProductForm } from "@/components/products/product-form";
import { listCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { param } from "@/lib/utils";

export const metadata = { title: "Add product" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [settings, categories] = await Promise.all([getSettings(), listCategories()]);
  return (
    <>
      <PageHeader title="Add product" description="Fill in the details, then generate a barcode or scan the one already on the product." />
      <ProductForm
        categories={categories}
        initialBarcode={param(sp.barcode)}
        defaults={{
          barcodeType: settings.defaultBarcodeType,
          unit: settings.defaultUnit,
          minStock: settings.lowStockThreshold,
          currency: settings.currency,
        }}
      />
    </>
  );
}
