import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Server-rendered pagination that preserves the current filters. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const href = (p: number) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const linkClass = "grid size-8 place-items-center rounded-md border border-line bg-paper text-ink-2 hover:bg-canvas";
  const disabled = "pointer-events-none opacity-40";

  return (
    <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-[13px] text-muted">
      <span className="num">
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </span>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <span className="num">Page {page} of {pages}</span>
          <Link href={href(page - 1)} className={cn(linkClass, page <= 1 && disabled)} aria-label="Previous page" aria-disabled={page <= 1}>
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={href(page + 1)} className={cn(linkClass, page >= pages && disabled)} aria-label="Next page" aria-disabled={page >= pages}>
            <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
