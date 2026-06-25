import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/modules/supply-chain-management/product-management/sku/sku-creation/components/Combobox";
import { MasterData } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

interface FilterValues {
  category: string;
  class: string;
  segment: string;
  type: string;
  brand: string;
  supplier: string;
  status: string;
  search?: string;
}

interface FacetFiltersProps {
  masterData: MasterData | null;
  filters: FilterValues;
  onApply: (values: FilterValues) => void;
  onClear: () => void;
  isLoading: boolean;
}

export const FacetFilters: React.FC<FacetFiltersProps> = ({
  masterData,
  filters,
  onApply,
  onClear,
  isLoading,
}) => {
  const [pending, setPending] = useState<FilterValues>(filters);

  // sync when external filters change (e.g., after refresh)
  useEffect(() => {
    setPending(filters);
  }, [filters]);

  const hasChanges = Object.keys(pending).some(
    (key) => pending[key as keyof FilterValues] !== filters[key as keyof FilterValues]
  );

  const isClearDisabled = Object.values(pending).every((v) => !v);

  const handleChange = (field: keyof FilterValues, value: string) => {
    setPending((prev) => ({ ...prev, [field]: value }));
  };

  const makeOptions = (items?: { id: number; name: string }[]) =>
    items?.map((i) => ({ value: i.id.toString(), label: i.name })) ?? [];

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-[160px]"><Combobox options={makeOptions(masterData?.suppliers)} value={pending.supplier} onValueChange={(v) => handleChange('supplier', v)} placeholder="Supplier" disabled={isLoading} /></div>
      <div className="w-[160px]"><Combobox options={makeOptions(masterData?.brands)} value={pending.brand} onValueChange={(v) => handleChange('brand', v)} placeholder="Brand" disabled={isLoading} /></div>
      <div className="w-[160px]"><Combobox options={makeOptions(masterData?.categories)} value={pending.category} onValueChange={(v) => handleChange('category', v)} placeholder="Category" disabled={isLoading} /></div>
      <div className="w-[160px]"><Combobox options={makeOptions(masterData?.classes)} value={pending.class} onValueChange={(v) => handleChange('class', v)} placeholder="Class" disabled={isLoading} /></div>
      <div className="w-[160px]"><Combobox options={makeOptions(masterData?.segments)} value={pending.segment} onValueChange={(v) => handleChange('segment', v)} placeholder="Segment" disabled={isLoading} /></div>
      <div className="w-[140px]"><Combobox options={[{ value: "Regular", label: "Regular" }, { value: "Variant", label: "Variant" }]} value={pending.type} onValueChange={(v) => handleChange('type', v)} placeholder="Type" disabled={isLoading} /></div>
      <div className="w-[130px]"><Combobox options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} value={pending.status} onValueChange={(v) => handleChange('status', v)} placeholder="Status" disabled={isLoading} /></div>
      <Button variant="default" size="sm" onClick={() => onApply(pending)} disabled={!hasChanges || isLoading} className="h-8">Apply</Button>
      <Button variant="outline" size="sm" onClick={onClear} disabled={isClearDisabled || isLoading} className="h-8">Clear</Button>
      </div>
      <div className="max-w-sm w-full">
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Search product name..."
          value={pending.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
