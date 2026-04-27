"use client";

import { useState, useMemo, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { StockConversionProduct } from "../types/stock-conversion.types";
import { getColumns } from "./columns";
import { DataTable } from "@/components/ui/new-data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
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

    if (supplierFilter !== "all") {
      // Find by name OR shortcut to be safe
      const found = uniqueSuppliers.find(s => s.name === supplierFilter || s.shortcut === supplierFilter);
      filterPayload.supplierShortcut = found?.shortcut || supplierFilter;
    }
    if (brandFilter !== "all") filterPayload.productBrand = brandFilter;
    if (categoryFilter !== "all") filterPayload.productCategory = categoryFilter;
    if (unitFilter !== "all") filterPayload.unitName = unitFilter;
    if (activeSearch && typeof activeSearch === 'string' && activeSearch.trim()) {
      filterPayload.search = activeSearch.trim();
    }
    if (hasStockFilter) filterPayload.hasStock = "true";

    setPage(1);
    onBranchChange?.(localBranchId);
    onFilterChange(filterPayload);
  };

  // Filters now only apply when the "Apply" button is clicked, per user preference.
  // Search query remains reactive for a better user experience.
  useEffect(() => {
    if (searchQuery.trim()) handleApplyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleClearFilters = () => {
    setBrandFilter("all");
    setCategoryFilter("all");
    setUnitFilter("all");
    setSupplierFilter("all");
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[180px]">
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
          className={`text-xs font-bold cursor-pointer uppercase tracking-tight ${!localBranchId ? "text-muted-foreground opacity-50" : "text-blue-600 dark:text-blue-400"}`}
        >
          Convertible Only
        </Label>
      </div>

      <Select value={supplierFilter} onValueChange={setSupplierFilter}>
        <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Supplier" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Suppliers</SelectItem>
          {uniqueSuppliers.map((s, idx) => <SelectItem key={`sup-${s.id || idx}-${s.name}`} value={s.name || "Unknown"}>{s.name || "Unknown"}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={brandFilter} onValueChange={setBrandFilter}>
        <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Brand" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Brands</SelectItem>
          {uniqueBrands.map((b, idx) => <SelectItem key={`brand-${b.id || idx}-${b.name}`} value={b.name || "Unknown"}>{b.name || "Unknown"}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {uniqueCategories.map((c, idx) => <SelectItem key={`cat-${c.id || idx}-${c.name}`} value={c.name || "Unknown"}>{c.name || "Unknown"}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={unitFilter} onValueChange={setUnitFilter}>
        <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue placeholder="Unit" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Units</SelectItem>
          {uniqueUnits.map((u, idx) => <SelectItem key={`unit-${u.id || idx}-${u.name}`} value={u.name || "Unknown"}>{u.name || "Unknown"}</SelectItem>)}
        </SelectContent>
      </Select>

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