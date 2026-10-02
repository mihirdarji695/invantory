import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { ProductForm } from "@/components/products/product-form";
import { prisma } from "@/lib/prisma";
import { listCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, settings, categories] = await Promise.all([prisma.product.findUnique({ where: { id } }), getSettings(), listCategories()]);
  if (!product) notFound();

  return (
    <>
      <PageHeader title={`Edit ${product.name}`} />
      <ProductForm
        product={product}
        categories={categories}
        defaults={{ barcodeType: settings.defaultBarcodeType, unit: settings.defaultUnit, minStock: settings.lowStockThreshold, currency: settings.currency }}
      />
    </>
  );
}
