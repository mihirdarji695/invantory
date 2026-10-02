import { csvTemplate } from "@/lib/services/csv";

export function GET() {
  return new Response("\uFEFF" + csvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="products-import-template.csv"',
    },
  });
}
