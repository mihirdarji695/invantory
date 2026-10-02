"use client";

import { FilterSearch, FilterSelect, FilterStatus, useUrlFilters } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { MOVEMENT_LABEL, MOVEMENT_TYPES } from "@/lib/stock";

export function MovementFilters({ products }: { products: { id: string; name: string }[] }) {
  const filters = useUrlFilters();
  return (
    <div key={filters.resetKey} className="flex flex-wrap items-center gap-2 border-b border-line p-3">
      <FilterSelect
        name="product"
        label="Product"
        filters={filters}
        className="max-w-64"
        options={[{ value: "", label: "All products" }, ...products.map((p) => ({ value: p.id, label: p.name }))]}
      />
      <FilterSelect
        name="type"
        label="Movement type"
        filters={filters}
        options={[{ value: "", label: "All types" }, ...MOVEMENT_TYPES.map((t) => ({ value: t, label: MOVEMENT_LABEL[t] }))]}
      />
      <FilterSearch name="barcode" placeholder="Barcode" filters={filters} className="w-44" mono />
      <label className="flex items-center gap-2 text-[13px] text-muted">
        From
        <Input type="date" className="w-40" defaultValue={filters.get("from")} onChange={(e) => filters.set({ from: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-muted">
        To
        <Input type="date" className="w-40" defaultValue={filters.get("to")} onChange={(e) => filters.set({ to: e.target.value })} />
      </label>
      <FilterStatus filters={filters} />
    </div>
  );
}
