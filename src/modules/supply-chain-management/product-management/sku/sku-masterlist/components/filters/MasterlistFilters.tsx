import React from "react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MasterData } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

interface MasterlistFiltersProps {
  masterData: MasterData | null;
  isLoading: boolean;

  supplier: string;
  onSupplierChange: (v: string) => void;

  brand: string;
  onBrandChange: (v: string) => void;

  category: string;
  onCategoryChange: (v: string) => void;

  classVal: string;
  onClassChange: (v: string) => void;

  segment: string;
  onSegmentChange: (v: string) => void;

  type: string;
  onTypeChange: (v: string) => void;

  status: string;
  onStatusChange: (v: string) => void;

  uom: string;
  onUomChange: (v: string) => void;

  onClear: () => void;
}

export const MasterlistFilters: React.FC<MasterlistFiltersProps> = ({
  masterData,
  isLoading,
  supplier,
  onSupplierChange,
  brand,
  onBrandChange,
  category,
  onCategoryChange,
  classVal,
  onClassChange,
  segment,
  onSegmentChange,
  type,
  onTypeChange,
  status,
  onStatusChange,
  uom,
  onUomChange,
  onClear,
}) => {
  const hasActiveFilters = !!(supplier || brand || category || classVal || segment || type || status || uom);

  const makeOptions = (labelPrefix: string, items?: { id: number; name: string }[]) => [
    { value: "all", label: `${labelPrefix}: All` },
    ...(items?.map((i) => ({ value: i.id.toString(), label: i.name })) ?? []),
  ];

  return (
    <div className="flex flex-wrap gap-3 items-center mb-2 bg-card p-3 rounded-lg border">
      <SearchableSelect
        options={makeOptions("Supplier", masterData?.suppliers)}
        value={supplier || "all"}
        onValueChange={(v) => onSupplierChange(v === "all" ? "" : v)}
        placeholder="Supplier: All"
        className="w-[160px] bg-background"
        disabled={isLoading}
      />
      <SearchableSelect
        options={makeOptions("Brand", masterData?.brands)}
        value={brand || "all"}
        onValueChange={(v) => onBrandChange(v === "all" ? "" : v)}
        placeholder="Brand: All"
        className="w-[160px] bg-background"
        disabled={isLoading}
      />
      <SearchableSelect
        options={makeOptions("Category", masterData?.categories)}
        value={category || "all"}
        onValueChange={(v) => onCategoryChange(v === "all" ? "" : v)}
        placeholder="Category: All"
        className="w-[160px] bg-background"
        disabled={isLoading}
      />
      <SearchableSelect
        options={makeOptions("Class", masterData?.classes)}
        value={classVal || "all"}
        onValueChange={(v) => onClassChange(v === "all" ? "" : v)}
        placeholder="Class: All"
        className="w-[160px] bg-background"
        disabled={isLoading}
      />
      <SearchableSelect
        options={makeOptions("Segment", masterData?.segments)}
        value={segment || "all"}
        onValueChange={(v) => onSegmentChange(v === "all" ? "" : v)}
        placeholder="Segment: All"
        className="w-[160px] bg-background"
        disabled={isLoading}
      />
      <SearchableSelect
        options={[
          { value: "all", label: "Type: All" },
          { value: "Regular", label: "Regular" },
          { value: "Variant", label: "Variant" },
        ]}
        value={type || "all"}
        onValueChange={(v) => onTypeChange(v === "all" ? "" : v)}
        placeholder="Type: All"
        className="w-[130px] bg-background"
        disabled={isLoading}
      />
      <SearchableSelect
        options={[
          { value: "all", label: "Status: All" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        value={status || "all"}
        onValueChange={(v) => onStatusChange(v === "all" ? "" : v)}
        placeholder="Status: All"
        className="w-[130px] bg-background"
        disabled={isLoading}
      />
      <SearchableSelect
        options={makeOptions("UOM", masterData?.units)}
        value={uom || "all"}
        onValueChange={(v) => onUomChange(v === "all" ? "" : v)}
        placeholder="UOM: All"
        className="w-[130px] bg-background"
        disabled={isLoading}
      />
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={isLoading}
          className="h-8 text-xs font-semibold"
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
};
