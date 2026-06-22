import React from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  TrendingUp,
  TrendingDown,
  RotateCw,
  BarChart2,
  Warehouse,
  Database,
  FileText
} from "lucide-react";
import { StockAdjustmentManualHeader } from "../types/stock-adjustment-manual.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isPostedStatus } from "../utils/status-utils";
import { format } from "date-fns";

interface StockAdjustmentManualListProps {
  data: StockAdjustmentManualHeader[];
  totalItems: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
  setPageSize: (v: number) => void;
  resetFilters: () => void;
  onDetail: (id: number) => void;
  onReload: () => void;
  branches: { id: number; branch_name: string }[];
  suppliers: { id: number; supplier_name: string }[];
  stats: {
    grossAdjustedValue: number;
    totalStockIn: number;
    totalStockOut: number;
    postingRate: number;
    postedCount: number;
    draftCount: number;
    itemsAdjusted: number;
    branchesActive: number;
    netStockImpact: number;
  };
  filters: {
    search: string;
    setSearch: (v: string) => void;
    branchId: number | undefined;
    setBranchId: (v: number | undefined) => void;
    supplierId: number | undefined;
    setSupplierId: (v: number | undefined) => void;
    type: string | undefined;
    setType: (v: string | undefined) => void;
    status: string | undefined;
    setStatus: (v: string | undefined) => void;
    fromDate: string;
    setFromDate: (v: string) => void;
    toDate: string;
    setToDate: (v: string) => void;
  };
}

export function StockAdjustmentManualList({
  data,
  totalItems,
  currentPage,
  setCurrentPage,
  totalPages,
  pageSize,
  setPageSize,
  resetFilters,
  onDetail,
  onReload,
  branches = [],
  suppliers = [],
  stats,
  filters
}: StockAdjustmentManualListProps) {
  const branchOptions = React.useMemo(() => {
    const opts = (branches || []).map((b) => ({
      value: String(b.id),
      label: b.branch_name
    }));
    return [{ value: "all", label: "All Branches" }, ...opts];
  }, [branches]);

  const supplierOptions = React.useMemo(() => {
    const opts = (suppliers || []).map((s) => ({
      value: String(s.id),
      label: s.supplier_name
    }));
    return [{ value: "all", label: "All Suppliers" }, ...opts];
  }, [suppliers]);

  const currentBranchValue = filters.branchId ? String(filters.branchId) : "all";
  const currentSupplierValue = filters.supplierId ? String(filters.supplierId) : "all";
  const formattedCurrency = (val: number) => {
    return "₱" + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-hidden">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400">
            <BarChart2 className="h-6 w-6 stroke-[2]" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Stock Adjustment Summary</h1>
            <p className="text-xs text-muted-foreground">Overview and list of inventory stock entries and corrections</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={onReload}
            className="h-10 px-4 font-semibold border-border text-foreground hover:bg-muted bg-background rounded-md text-xs gap-2"
          >
            <RotateCw className="h-4 w-4" />
            Reload Data
          </Button>
        </div>
      </div>

      {/* Filter Row Section */}
      <div className="bg-card border border-border/40 p-4 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* SEARCH DETAILS */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">SEARCH DETAILS</span>
            <Input
              placeholder="Search by doc number..."
              className="h-10 bg-background border-border rounded-md text-xs font-semibold px-3"
              value={filters.search}
              onChange={(e) => filters.setSearch(e.target.value)}
            />
          </div>

          {/* BRANCH */}
          <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">BRANCH</span>
            <SearchableSelect
              options={branchOptions}
              value={currentBranchValue}
              placeholder="Select Branch"
              className="h-10 text-xs font-semibold rounded-md bg-background border-border text-foreground/80 text-left justify-between w-full"
              onValueChange={(val) => {
                filters.setBranchId(val === "all" ? undefined : Number(val));
              }}
            />
          </div>

          {/* SUPPLIER */}
          <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">SUPPLIER</span>
            <SearchableSelect
              options={supplierOptions}
              value={currentSupplierValue}
              placeholder="Select Supplier"
              className="h-10 text-xs font-semibold rounded-md bg-background border-border text-foreground/80 text-left justify-between w-full"
              onValueChange={(val) => {
                filters.setSupplierId(val === "all" ? undefined : Number(val));
              }}
            />
          </div>

          {/* TYPE */}
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">TYPE</span>
            <select
              value={filters.type || ""}
              onChange={(e) => filters.setType(e.target.value || undefined)}
              className="h-10 border border-border bg-background rounded-md text-xs font-semibold px-3 focus:outline-none w-full"
            >
              <option value="">All Types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
            </select>
          </div>

          {/* STATUS */}
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">STATUS</span>
            <select
              value={filters.status || ""}
              onChange={(e) => filters.setStatus(e.target.value || undefined)}
              className="h-10 border border-border bg-background rounded-md text-xs font-semibold px-3 focus:outline-none w-full"
            >
              <option value="">All Statuses</option>
              <option value="Posted">Posted</option>
              <option value="Unposted">Unposted</option>
            </select>
          </div>

          {/* FROM DATE */}
          <div className="flex flex-col gap-1.5 w-36">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">FROM DATE</span>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => filters.setFromDate(e.target.value)}
              className="h-10 border-border bg-background rounded-md text-xs font-semibold"
            />
          </div>

          {/* TO DATE */}
          <div className="flex flex-col gap-1.5 w-36">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">TO DATE</span>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => filters.setToDate(e.target.value)}
              className="h-10 border-border bg-background rounded-md text-xs font-semibold"
            />
          </div>

          {/* RESET BUTTON */}
          <button
            type="button"
            onClick={resetFilters}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold px-2 py-2 h-10 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Metrics Row Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* GROSS ADJUSTED VALUE */}
        <Card className="border border-border/40 border-t-[3px] border-t-indigo-500 relative overflow-hidden bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider block">GROSS ADJUSTED VALUE</span>
              <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                {formattedCurrency(stats.grossAdjustedValue)}
              </h3>
              <span className="text-[10px] text-muted-foreground/85 block">Total cumulative adjustments value</span>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-400">
              <Database className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* TOTAL STOCK IN (+) */}
        <Card className="border border-border/40 border-t-[3px] border-t-emerald-500 relative overflow-hidden bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider block">TOTAL STOCK IN (+)</span>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formattedCurrency(stats.totalStockIn)}
              </h3>
              <span className="text-[10px] text-muted-foreground/85 block">Sum of positive correction values</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* TOTAL STOCK OUT (-) */}
        <Card className="border border-border/40 border-t-[3px] border-t-rose-500 relative overflow-hidden bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider block">TOTAL STOCK OUT (-)</span>
              <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                {formattedCurrency(stats.totalStockOut)}
              </h3>
              <span className="text-[10px] text-muted-foreground/85 block">Sum of negative correction values</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* POSTING RATE */}
        <Card className="border border-border/40 border-t-[3px] border-t-amber-500 relative overflow-hidden bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground/75 uppercase tracking-wider block">POSTING RATE</span>
              <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                {Number(stats.postingRate || 0).toFixed(1)}%
              </h3>
              <span className="text-[10px] text-muted-foreground/85 block font-medium">
                <span className="text-amber-600 dark:text-amber-400 font-bold">{stats.postedCount} posted</span> / {stats.draftCount} draft
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Metrics Row Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ITEMS ADJUSTED */}
        <Card className="border border-border/40 bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">ITEMS ADJUSTED</span>
              <h4 className="text-base font-extrabold text-foreground">
                {Number(stats.itemsAdjusted || 0).toLocaleString()} units
              </h4>
            </div>
          </CardContent>
        </Card>

        {/* BRANCHES ACTIVE */}
        <Card className="border border-border/40 bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/20 dark:text-blue-400">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">BRANCHES ACTIVE</span>
              <h4 className="text-base font-extrabold text-foreground">
                {stats.branchesActive} locations
              </h4>
            </div>
          </CardContent>
        </Card>

        {/* NET STOCK IMPACT */}
        <Card className="border border-border/40 bg-card shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${stats.netStockImpact >= 0 ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-rose-50 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400"}`}>
              {stats.netStockImpact >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">NET STOCK IMPACT</span>
              <h4 className={`text-base font-extrabold ${stats.netStockImpact >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {stats.netStockImpact >= 0 ? "+" : ""}{formattedCurrency(stats.netStockImpact)}
              </h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Adjustments Log Section */}
      <div className="flex flex-col gap-1 mt-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Recent Adjustments Log</h2>
        <p className="text-xs text-muted-foreground">Quick timeline of the latest adjustment records</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl opacity-60">
            <p className="text-lg font-medium">No adjustments found</p>
            <p className="text-sm text-muted-foreground">No records exist for the selected filters.</p>
          </div>
        ) : (
          data.map((item) => {
            const isPosted = isPostedStatus(item.isPosted);

            return (
              <Card key={item.id} className="group overflow-hidden border border-border/40 rounded-xl shadow-sm hover:shadow-md transition-all bg-card">
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`flex items-center justify-center ${item.type === 'IN' ? 'text-green-500' : 'text-red-500'}`}>
                        {item.type === 'IN' ? (
                          <ArrowUpCircle className="h-8 w-8 stroke-[1.5]" />
                        ) : (
                          <ArrowDownCircle className="h-8 w-8 stroke-[1.5]" />
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{item.doc_no}</span>
                          <Badge variant="secondary" className={`${item.type === 'IN' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'} font-bold uppercase tracking-wider text-[10px] rounded-full px-2.5 py-0.5 border-none shadow-none`}>
                            Stock {item.type === 'IN' ? 'In' : 'Out'}
                          </Badge>
                          <Badge variant="secondary" className={`${isPosted ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-amber-100 text-amber-600 hover:bg-amber-100'} font-bold uppercase tracking-wider text-[10px] rounded-full px-2.5 py-0.5 border-none shadow-none`}>
                            {isPosted ? 'Posted' : 'Unposted'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-6 mt-1 text-sm text-muted-foreground">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Branch</span>
                            <span className="font-medium text-foreground/80">
                              {typeof item.branch_id === 'object' ? item.branch_id?.branch_name : item.branch_id || "Main Warehouse"}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Supplier</span>
                            <span className="font-medium text-foreground/80">
                              {typeof item.supplier_id === 'object' ? item.supplier_id?.supplier_name : item.supplier_id || "N/A"}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-0.5">Items</span>
                            <span className="font-bold text-primary">
                              {(() => {
                                if (Array.isArray(item.items)) return item.items.length;
                                const raw = item as Record<string, unknown>;
                                if (Array.isArray(raw.stock_adjustment)) return raw.stock_adjustment.length;
                                return 0;
                              })()} products
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-0.5">Created At</span>
                            <span className="font-medium text-foreground/80">
                              {item.created_at ? format(new Date(item.created_at), "MMM d, yyyy, hh:mm a") : "-"}
                            </span>
                          </div>
                          {isPosted && (
                            <>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-primary mb-0.5">Posted At</span>
                                <span className="font-bold text-primary/80">
                                  {item.postedAt ? format(new Date(item.postedAt), "MMM d, yyyy, hh:mm a") : "-"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-primary mb-0.5">Posted By</span>
                                <span className="font-bold text-primary">
                                  {(() => {
                                    const postedBy = item.posted_by;
                                    return typeof postedBy === 'object' ? `${postedBy?.user_fname} ${postedBy?.user_lname}` : postedBy || "System User";
                                  })()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pr-4">
                      <div className="text-right pr-6 mr-6 border-r border-border">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 block mb-0.5">Total Amount</span>
                        <span className="text-lg font-bold text-primary">
                          ₱{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onDetail(item.id!)} className="text-muted-foreground hover:text-foreground">
                          <Eye className="h-4 w-4 stroke-[1.5]" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {item.remarks && (
                    <div className="px-4 py-2 bg-muted/20 border-t border-border/50 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Remarks:</span>
                      <span className="text-xs text-muted-foreground italic">{item.remarks}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-2 px-2 shrink-0">
        <span className="text-xs font-semibold text-muted-foreground">
          {totalItems} total rows
        </span>

        <div className="flex items-center gap-6">
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Rows per page</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-lg border border-border bg-card pl-3 pr-8 py-1 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-2.5 flex h-3 w-3 items-center justify-center text-muted-foreground/60">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </span>
            </div>
          </div>

          {/* Current Page */}
          <span className="text-xs font-bold text-foreground">
            Page {currentPage} of {totalPages}
          </span>

          {/* Arrow Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 rounded-lg border border-border bg-card text-foreground"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 rounded-lg border border-border bg-card text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 rounded-lg border border-border bg-card text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 rounded-lg border border-border bg-card text-foreground"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
