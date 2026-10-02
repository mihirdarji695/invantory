"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Writes filter values to the URL so server components re-query. Resets to page 1. */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  // Bumped on "Clear filters" so uncontrolled search boxes remount empty.
  const [resetKey, setResetKey] = useState(0);

  function set(updates: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }
  function clear() {
    setResetKey((k) => k + 1);
    startTransition(() => router.replace(pathname, { scroll: false }));
  }
  return { get: (k: string) => searchParams.get(k) ?? "", set, clear, pending, resetKey, hasAny: searchParams.size > 0 };
}

export function FilterSearch({
  name,
  placeholder,
  className,
  mono,
  filters,
}: {
  name: string;
  placeholder: string;
  className?: string;
  mono?: boolean;
  filters: ReturnType<typeof useUrlFilters>;
}) {
  const [value, setValue] = useState(filters.get(name));
  const first = useRef(true);
  const apply = useEffectEvent((v: string) => filters.set({ [name]: v.trim() }));

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => apply(value), 250);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cn("pl-9", mono && "font-mono")} />
    </div>
  );
}

export function FilterSelect({
  name,
  label,
  options,
  filters,
  className,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  filters: ReturnType<typeof useUrlFilters>;
  className?: string;
}) {
  return (
    <Select aria-label={label} value={filters.get(name)} onChange={(e) => filters.set({ [name]: e.target.value })} className={cn("w-auto min-w-36", className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  );
}

export function FilterStatus({ filters }: { filters: ReturnType<typeof useUrlFilters> }) {
  return (
    <div className="flex items-center gap-2">
      {filters.pending && <Loader2 className="size-4 animate-spin text-muted" aria-label="Loading" />}
      {filters.hasAny && (
        <button type="button" onClick={filters.clear} className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-[13px] text-muted hover:bg-canvas hover:text-ink">
          <X className="size-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
}
