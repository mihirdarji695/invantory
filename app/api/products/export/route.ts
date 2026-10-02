import { productsToCsv } from "@/lib/services/csv";

export async function GET() {
  const csv = await productsToCsv();
  const stamp = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens UTF-8 (₹, accents) correctly.
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
