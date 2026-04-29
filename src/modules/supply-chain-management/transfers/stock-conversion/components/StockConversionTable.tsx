"use client";

import { useState, useMemo, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { StockConversionProduct } from "../types/stock-conversion.types";
import { getColumns } from "./columns";
import { DataTable } from "@/components/ui/new-data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/modules/supply-chain-management/warehouse-management/stock-transfer/shared/components/searchable-combobox";

interface StockConversionTableProps {
  data: StockConversionProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  onConvertClick: (product: StockConversionProduct) => void;
  onRefresh: () => void;
  onFilterChange: (filters: Record<string, string>) => void;
  loadProductsInventory: (productIds: number[]) => void;
  isLoading?: boolean;
  branches?: Array<{ id: number; branch_name?: string; name?: string }>;
  selectedBranchId?: number;
  onBranchChange?: (branchId: number | undefined) => void;
  options?: {
    brands: { id: number; name: string }[];
    categories: { id: number; name: string }[];
    units: { id: number; name: string }[];
    suppliers: { id: number; name: string; shortcut: string }[];
  };
  convertingId?: number | null;
}

export function StockConversionTable({
  data,
  totalCount,
  page,
  pageSize,
  setPage,
  setPageSize,
  onConvertClick,
  onRefresh,
  onFilterChange,
  loadProductsInventory,
  isLoading,
  branches,
  selectedBranchId,
  onBranchChange,
  options,
  convertingId,
}: StockConversionTableProps) {
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [hasStockFilter, setHasStockFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localBranchId, setLocalBranchId] = useState<number | undefined>(selectedBranchId);

  // Sync local branch when prop changes externally
  useEffect(() => {
    setLocalBranchId(selectedBranchId);
  }, [selectedBranchId]);

  const uniqueBrands = useMemo(() => {
    if (options?.brands?.length) return options.brands;
    const set = new Set<string>();
    return data.map(d => d.brand).filter(b => {
      if (!b || b === "Unknown" || set.has(b)) return false;
      set.add(b);
      return true;
    }).map(b => ({ id: 0, name: b }));
  }, [options, data]);

  const uniqueCategories = useMemo(() => {
    if (options?.categories?.length) return options.categories;
    const set = new Set<string>();
    return data.map(d => d.category).filter(c => {
      if (!c || c === "Unknown" || set.has(c)) return false;
      set.add(c);
      return true;
    }).map(c => ({ id: 0, name: c }));
  }, [options, data]);

  const uniqueUnits = useMemo(() => {
    if (options?.units?.length) return options.units;
    const set = new Set<string>();
    return data.map(d => d.currentUnit).filter(u => {
      if (!u || u === "Unknown" || set.has(u)) return false;
      set.add(u);
      return true;
    }).map(u => ({ id: 0, name: u }));
  }, [options, data]);

  const uniqueSuppliers = useMemo(() => {
    const suppliers = options?.suppliers?.length ? options.suppliers : [];
    const map = new Map<string, string>();
    
    // Add from props
    suppliers.forEach(s => {
      if (s.name?.trim() && s.shortcut?.trim()) map.set(s.name.trim(), s.shortcut.trim());
    });
    
    // Add from data (fallbacks)
    if (!suppliers.length) {
      data.forEach((d) => {
        if (d.supplierName?.trim() && d.supplierShortcut?.trim()) {
          map.set(d.supplierName.trim(), d.supplierShortcut.trim());
        }
      });
    }

    return Array.from(map.entries()).map(([name, shortcut]) => {
      const found = suppliers.find(s => s.name === name);
      return { id: found?.id || 0, name, shortcut };
    });
  }, [options, data]);

  const handleApplyFilters = (searchOverride?: string) => {
    const filterPayload: Record<string, string> = {};
    
    // Safety check: ensure activeSearch is a string. 
    // onClick={handleApplyFilters} passes the event object, which we must ignore.
    const activeSearch = (typeof searchOverride === 'string') ? searchOverride : searchQuery;

    if (supplierFilter) {
      // Find by name OR shortcut to be safe
      const found = uniqueSuppliers.find(s => s.name === supplierFilter || s.shortcut === supplierFilter);
      filterPayload.supplierShortcut = found?.shortcut || supplierFilter;
    }
    if (brandFilter) filterPayload.productBrand = brandFilter;
    if (categoryFilter) filterPayload.productCategory = categoryFilter;
    if (unitFilter) filterPayload.unitName = unitFilter;
    if (activeSearch && typeof activeSearch === 'string' && activeSearch.trim()) {
      filterPayload.search = activeSearch.trim();
    }
    if (hasStockFilter) filterPayload.hasStock = "true";

    setPage(1);
    onBranchChange?.(localBranchId);
    onFilterChange(filterPayload);
  };

  // Filters now only apply when the "Apply" button is clicked, per user preference.
  // Search query remains reactive but debounced for a better user experience.
  useEffect(() => {
    const handler = setTimeout(() => {
      // Apply filters if there is a search query OR if the search query was just cleared
      // This ensures that deleting the search string actually resets the list.
      handleApplyFilters();
    }, 400);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleClearFilters = () => {
    setBrandFilter("");
    setCategoryFilter("");
    setUnitFilter("");
    setSupplierFilter("");
    setHasStockFilter(false);
    setSearchQuery("");
    setLocalBranchId(selectedBranchId);
    setPage(1);
    onFilterChange({});
  };

  const canConvert = selectedBranchId !== undefined && selectedBranchId > 0;
  const columns = useMemo(
    () => getColumns(onConvertClick, (id: number) => loadProductsInventory([id]), canConvert, convertingId),
    [onConvertClick, loadProductsInventory, canConvert, convertingId]
  );

  const filterActions = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* Primary Controls: Branch & Convertible Toggle */}
      <div className="flex items-center gap-2">
        <div className="w-[170px]">
        <SearchableCombobox
          options={branches?.map((b) => ({
            value: String(b.id),
            label: String(b.branch_name || b.name || b.id),
          })) || []}
          value={localBranchId ? String(localBranchId) : ""}
          onValueChange={(val: string | null) => setLocalBranchId(val ? Number(val) : undefined)}
          placeholder="Select Branch"
          className="h-9"
        />
      </div>

      <div className="flex items-center space-x-2 bg-blue-500/5 px-3 py-1.5 rounded-md border border-blue-500/10 h-9">
        <Checkbox 
          id="convertible-only" 
          checked={hasStockFilter} 
          onCheckedChange={(checked) => setHasStockFilter(!!checked)} 
          disabled={!localBranchId}
        />
          <Label 
            htmlFor="convertible-only" 
            className={`text-[10px] font-bold cursor-pointer uppercase tracking-tight ${!localBranchId ? "text-muted-foreground opacity-50" : "text-blue-600 dark:text-blue-400"}`}
          >
            Convertible Only
          </Label>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden xl:block w-px h-6 bg-slate-200 dark:bg-slate-800" />

      {/* Secondary Filters Group */}
      <div className="flex flex-wrap items-center gap-2">

        <div className="w-[145px]">
        <SearchableCombobox
          options={uniqueSuppliers.map(s => ({
            value: s.name || "Unknown",
            label: s.name || "Unknown",
          }))}
          value={supplierFilter}
          onValueChange={setSupplierFilter}
          placeholder="All Suppliers"
          className="h-9"
        />
      </div>

        <div className="w-[120px]">
        <SearchableCombobox
          options={uniqueBrands.map(b => ({
            value: b.name || "Unknown",
            label: b.name || "Unknown",
          }))}
          value={brandFilter}
          onValueChange={setBrandFilter}
          placeholder="All Brands"
          className="h-9"
        />
      </div>

        <div className="w-[130px]">
        <SearchableCombobox
          options={uniqueCategories.map(c => ({
            value: c.name || "Unknown",
            label: c.name || "Unknown",
          }))}
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          placeholder="All Categories"
          className="h-9"
        />
      </div>

        <div className="w-[105px]">
        <SearchableCombobox
          options={uniqueUnits.map(u => ({
            value: u.name || "Unknown",
            label: u.name || "Unknown",
          }))}
          value={unitFilter}
          onValueChange={setUnitFilter}
          placeholder="All Units"
          className="h-9"
        />
      </div>

      <div className="flex items-center gap-1 ml-1">
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => handleApplyFilters()} 
          disabled={isLoading || !localBranchId}
          className="h-9 px-3 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
        >
          Apply
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClearFilters} 
          disabled={isLoading || !localBranchId}
          className="h-9 px-3 text-xs font-bold uppercase border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
        >
          Clear
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRefresh} 
          disabled={isLoading || !localBranchId} 
          className="h-9 w-9 rounded-lg hover:bg-blue-50 text-blue-600"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background rounded-xl p-4">
      <DataTable
        columns={columns}
        data={data}
        pageCount={Math.ceil(totalCount / pageSize)}
        pagination={{
          pageIndex: page - 1,
          pageSize: pageSize,
        }}
        onPaginationChange={(p) => {
          setPage(p.pageIndex + 1);
          setPageSize(p.pageSize);
        }}
        manualPagination={true}
        onSearch={(val) => {
          setSearchQuery(val);
          // useEffect handles the filter trigger
        }}
        searchKey="product_name"
        isLoading={isLoading}
        actionComponent={filterActions}
        emptyTitle={!selectedBranchId ? "Select a Branch to start" : "No products found"}
        emptyDescription={!selectedBranchId ? "Please choose a branch from the dropdown above to view stock levels." : "Try adjusting your filters."}
      />
    </div>
  );
}