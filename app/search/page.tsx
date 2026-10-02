import { PageHeader } from "@/components/ui/misc";
import { BarcodeSearch } from "@/components/barcode/barcode-search";
import { getSettings } from "@/lib/settings";
import { param } from "@/lib/utils";

export const metadata = { title: "Barcode search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const code = param(sp.code).trim();
  return (
    <>
      <PageHeader title="Barcode search" description="Scan or type a barcode to find a product instantly." />
      {/* key: a new ?code from the top bar or a global scan restarts the lookup */}
      <BarcodeSearch key={code} initialCode={code} currency={settings.currency} />
    </>
  );
}
