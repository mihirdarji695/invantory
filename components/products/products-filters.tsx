"use client";

import { FilterSearch, FilterSelect, FilterStatus, useUrlFilters } from "@/components/ui/filter-bar";

export function ProductsFilters({
  categories,
  sorts,
}: {
  categories: { id: string; name: string }[];
  sorts: { value: string; label: string }[];
}) {
  const filters = useUrlFilters();
  return (
    <div key={filters.resetKey} className="flex flex-wrap items-center gap-2 border-b border-line p-3">
      <FilterSearch name="q" placeholder="Search name, brand…" filters={filters} className="min-w-52 flex-1" />
      <FilterSearch name="sku" placeholder="SKU" filters={filters} className="w-36" mono />
      <FilterSearch name="barcode" placeholder="Barcode" filters={filters} className="w-40" mono />
      <FilterSelect
        name="category"
        label="Category"
        filters={filters}
        options={[{ value: "", label: "All categories" }, { value: "none", label: "Uncategorized" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
      />
      <FilterSelect
        name="status"
        label="Stock status"
        filters={filters}
        options={[
          { value: "", label: "Any stock status" },
          { value: "in", label: "In stock" },
          { value: "low", label: "Low stock" },
          { value: "out", label: "Out of stock" },
        ]}
      />
      <FilterSelect name="sort" label="Sort by" filters={filters} options={sorts} />
      <FilterStatus filters={filters} />
    </div>
  );
}
