"use client";

import { FilterSearch, FilterSelect, FilterStatus, useUrlFilters } from "@/components/ui/filter-bar";

export function InventoryFilters({ counts }: { counts: { all: number; in: number; low: number; out: number } }) {
  const filters = useUrlFilters();
  const status = filters.get("status");
  const tabs = [
    { value: "", label: "All", count: counts.all },
    { value: "in", label: "In stock", count: counts.in },
    { value: "low", label: "Low stock", count: counts.low },
    { value: "out", label: "Out of stock", count: counts.out },
  ];
  return (
    <div key={filters.resetKey} className="flex flex-wrap items-center gap-3 border-b border-line p-3">
      <div role="tablist" aria-label="Stock status" className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={status === t.value}
            onClick={() => filters.set({ status: t.value })}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors ${
              status === t.value ? "bg-ink text-white" : "text-ink-2 hover:bg-canvas"
            }`}
          >
            {t.label}
            <span className={`num text-[12px] ${status === t.value ? "text-white/70" : "text-muted"}`}>{t.count}</span>
          </button>
        ))}
      </div>
      <FilterSearch name="q" placeholder="Search product, SKU or barcode" filters={filters} className="ml-auto min-w-60 flex-1 sm:max-w-sm" />
      <FilterSelect
        name="sort"
        label="Sort by"
        filters={filters}
        options={[
          { value: "", label: "Lowest stock first" },
          { value: "name", label: "Name A–Z" },
          { value: "updated", label: "Recently updated" },
        ]}
      />
      <FilterStatus filters={filters} />
    </div>
  );
}
