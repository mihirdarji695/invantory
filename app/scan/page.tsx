import { redirect } from "next/navigation";
import { findByCode } from "@/lib/services/products";

export default async function ScanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = rawCode?.trim() ?? "";

  if (!code) {
    redirect("/search");
  }

  const { exact } = await findByCode(code);

  if (exact) {
    redirect(`/products/${exact.id}`);
  }

  redirect(`/search?code=${encodeURIComponent(code)}`);
}
