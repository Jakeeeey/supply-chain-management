"use client";

<<<<<<< HEAD
import { useState, useMemo, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { StockConversionProduct } from "../types/stock-conversion.types";
=======
import { useState, useMemo, useEffect, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { StockConversionProduct } from "../types/stock-conversion.schema";
>>>>>>> origin/master
import { getColumns } from "./columns";
import { DataTable } from "@/components/ui/new-data-table";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/modules/supply-chain-management/warehouse-management/stock-transfer/shared/components/searchable-combobox";
=======
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Filter,
  Cuboid,
  Layers,
  Users,
  RefreshCw,
  Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ✅ Now uses @base-ui/react Combobox internally — no Radix FocusScope,
//    no "Maximum update depth exceeded" error when filtering.
import { SearchableCombobox } from "@/modules/supply-chain-management/warehouse-management/stock-transfer/components/shared/searchable-combobox";
>>>>>>> origin/master

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
<<<<<<< HEAD
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
=======
  branches?: Record<string, unknown>[];
  selectedBranchId?: number;
  onBranchChange?: (branchId: number | undefined) => void;
>>>>>>> origin/master
}

export function StockConversionTable({
  data,
<<<<<<< HEAD
  totalCount,
=======
>>>>>>> origin/master
  page,
  pageSize,
  setPage,
  setPageSize,
  onConvertClick,
  onRefresh,
<<<<<<< HEAD
  onFilterChange,
=======
>>>>>>> origin/master
  loadProductsInventory,
  isLoading,
  branches,
  selectedBranchId,
  onBranchChange,
<<<<<<< HEAD
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
=======
}: StockConversionTableProps) {
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGrouped, setIsGrouped] = useState(false);

  const uniqueBrands = useMemo(
    () => Array.from(new Set(data.map((d) => d.brand))),
    [data]
  );
  const uniqueCategories = useMemo(
    () => Array.from(new Set(data.map((d) => d.category))),
    [data]
  );
  const uniqueUnits = useMemo(
    () => Array.from(new Set(data.map((d) => d.currentUnit))),
    [data]
  );
  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((d) => {
      if (d.supplierName && d.supplierShortcut) {
        map.set(d.supplierName, d.supplierShortcut);
      }
    });
    return Array.from(map.entries()).map(([name, shortcut]) => ({
      name,
      shortcut,
    }));
  }, [data]);

  const currentFilters = useMemo(() => {
    const selectedSupplier = uniqueSuppliers.find(
      (s) => s.name === supplierFilter
    );
    return {
      supplierShortcut:
        selectedSupplier?.shortcut ||
        (supplierFilter === "all" ? "all" : undefined),
      productBrand: brandFilter,
      productCategory: categoryFilter,
      unitName: unitFilter,
    };
  }, [supplierFilter, brandFilter, categoryFilter, unitFilter, uniqueSuppliers]);

  const hasRequiredFilter =
    supplierFilter !== "all" ||
    brandFilter !== "all" ||
    categoryFilter !== "all" ||
    searchQuery.trim().length >= 3;

  const hasAnyFilter =
    hasRequiredFilter ||
    unitFilter !== "all" ||
    searchQuery.trim().length > 0 ||
    selectedBranchId !== undefined;

  // Auto-refresh when main filters change
  useEffect(() => {
    if (hasRequiredFilter) {
      onRefresh(currentFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierFilter, brandFilter, categoryFilter, hasRequiredFilter]);

  const filteredData = useMemo(() => {
    if (!hasRequiredFilter) return [];

    let result = data.filter((item) => {
      const matchBrand =
        brandFilter === "all" || item.brand === brandFilter;
      const matchCat =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchUnit =
        unitFilter === "all" || item.currentUnit === unitFilter;
      const matchSupplier =
        supplierFilter === "all" ||
        (item.supplierName || "No Supplier") === supplierFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        q.length === 0 ||
        String(item.productName || item.productDescription || "")
          .toLowerCase()
          .includes(q) ||
        String(item.productCode || "").toLowerCase().includes(q) ||
        String(item.supplierName || "").toLowerCase().includes(q) ||
        String(item.brand || "").toLowerCase().includes(q) ||
        String(item.category || "").toLowerCase().includes(q) ||
        String(item.currentUnit || "").toLowerCase().includes(q);

      return matchBrand && matchCat && matchUnit && matchSupplier && matchSearch;
    });

    if (isGrouped) {
      result = [...result].sort((a, b) =>
        (a.currentUnit || "").localeCompare(b.currentUnit || "")
      );
    }

    return result;
  }, [
    data,
    brandFilter,
    categoryFilter,
    unitFilter,
    supplierFilter,
    isGrouped,
    searchQuery,
    hasRequiredFilter,
  ]);

  // canConvert: user must select a branch AND at least one specific filter
  const canConvert = selectedBranchId !== undefined && (
    supplierFilter !== "all" || brandFilter !== "all" || categoryFilter !== "all"
  );

  const columns = useMemo(
    () =>
      getColumns(onConvertClick, (id: number) => loadProductsInventory([id]), canConvert),
    [onConvertClick, loadProductsInventory, canConvert]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  return (
    <Card className="border-none shadow-sm h-full flex flex-col pt-3 bg-background">
      <CardHeader className="flex flex-row items-center justify-between py-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Cuboid className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-xl font-semibold tracking-tight">
              Stock Conversion
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRefresh(currentFilters)}
            disabled={isLoading}
            className="h-8 w-8 p-0 hover:bg-muted rounded-full"
          >
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden pt-4">
        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 bg-background p-3 rounded-lg border shadow-sm relative z-20">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
            <Filter className="w-4 h-4" />
            Filters:
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search product, brand, supplier..."
              className="pl-9 h-9 bg-background focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {/* Branch — SearchableCombobox (now @base-ui, no FocusScope) */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Branch:</span>
            <SearchableCombobox
              options={
                branches?.map((b) => ({
                  value: String(b.id),
                  label: String(b.branch_name || b.name || b.id),
                })) || []
              }
              value={selectedBranchId ? String(selectedBranchId) : ""}
              onValueChange={(val) =>
                onBranchChange?.(val ? Number(val) : undefined)
              }
              placeholder="Select Branch"
              className="w-[180px]"
            />
          </div>

          {/* Supplier — SearchableCombobox (now @base-ui, no FocusScope) */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              Supplier:
            </span>
            <SearchableCombobox
              options={[
                { value: "all", label: "All Suppliers" },
                ...uniqueSuppliers.map((s) => ({
                  value: s.name,
                  label: s.name,
                })),
              ]}
              value={supplierFilter}
              onValueChange={(val) => setSupplierFilter(val || "all")}
              placeholder="All Suppliers"
              className="w-[180px]"
            />
          </div>

          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Brand:</span>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50 bg-background">
                <SelectItem value="all">All Brands</SelectItem>
                {uniqueBrands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Category:
            </span>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50 bg-background">
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Unit:</span>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-[150px] bg-background">
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50 bg-background">
                <SelectItem value="all">All Units</SelectItem>
                {uniqueUnits.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear all filters */}
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 ml-1 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => {
                setSupplierFilter("all");
                setBrandFilter("all");
                setCategoryFilter("all");
                setUnitFilter("all");
                setSearchQuery("");
                onBranchChange?.(undefined);
              }}
            >
              Clear
            </Button>
          )}

          <div className="h-4 w-px bg-border mx-2 hidden sm:block" />

          {/* Group by Unit */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="group-unit"
              checked={isGrouped}
              onCheckedChange={(checked) => setIsGrouped(!!checked)}
            />
            <Label
              htmlFor="group-unit"
              className="text-sm font-medium flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-blue-500" />
              Group by Unit
            </Label>
          </div>
        </div>

        {/* ── Table / Empty State ──────────────────────────────────────────── */}
        {!hasRequiredFilter ? (
          <div className="flex-1 flex flex-col items-center justify-center border rounded-md bg-muted/10 p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 shadow-sm">
              <Filter className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground tracking-tight mb-2">
              Select a Filter to Begin
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Please choose a Supplier, Brand, Category, or type at least 3
              letters in the Search bar to view specific products for
              conversion.
            </p>
          </div>
        ) : (
          <div className="rounded-md border bg-background flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-xs font-semibold text-muted-foreground uppercase py-3 whitespace-nowrap"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  (() => {
                    const rows = table.getRowModel().rows;
                    let lastUnit = "";
                    return rows.map((row) => {
                      const currentUnit = row.original.currentUnit || "";
                      const showGroupHeader = isGrouped && currentUnit !== lastUnit;
                      lastUnit = currentUnit;
                      const unitCount = isGrouped ? rows.filter(r => r.original.currentUnit === currentUnit).length : 0;

                      return (
                        <Fragment key={`row-${row.id}`}>
                          {showGroupHeader && (
                            <TableRow key={`group-${currentUnit}`} className="bg-blue-50/50 dark:bg-blue-950/20 border-y border-blue-200/50 dark:border-blue-800/30">
                              <TableCell colSpan={columns.length} className="py-2 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 uppercase tracking-widest border border-blue-200 dark:border-blue-800/50">
                                    {currentUnit}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {unitCount} product{unitCount !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                className="py-3 text-sm font-medium text-foreground whitespace-nowrap"
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        </Fragment>
                      );
                    });
                  })()
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-2 border-t mt-auto">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Rows per page
            </p>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium text-muted-foreground">
              Page {page} of {table.getPageCount() || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to previous page</span>
              {"<"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to next page</span>
              {">"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
>>>>>>> origin/master
  );
}