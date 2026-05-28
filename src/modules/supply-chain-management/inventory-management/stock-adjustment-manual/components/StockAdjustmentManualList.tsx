"use client";

import { 
  Search, 
  Plus, 
  Eye, 
  Pencil, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { StockAdjustmentManualHeader } from "../types/stock-adjustment-manual.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isPostedStatus } from "../utils/status-utils";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StockAdjustmentManualListProps {
  data: StockAdjustmentManualHeader[];
  totalItems: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
  setPageSize: (v: number) => void;
  resetFilters: () => void;
  onCreate: () => void;
  onEdit: (id: number) => void;
  onDetail: (id: number) => void;
  filters: {
    search: string;
    setSearch: (v: string) => void;
    branchId: number | undefined;
    setBranchId: (v: number | undefined) => void;
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
  onCreate,
  onEdit,
  onDetail,
  filters
}: StockAdjustmentManualListProps) {
  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Stock Adjustments</h1>
        <p className="text-sm text-muted-foreground">Manage inventory stock adjustments</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 py-3">
        <div className="flex flex-wrap items-end gap-3 flex-1">
          <div className="relative w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by doc, branch, supplier..."
              className="pl-9 h-10 bg-card border-border rounded-md text-xs"
              value={filters.search}
              onChange={(e) => filters.setSearch(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 bg-card border-border rounded-md text-xs font-semibold">
                <Filter className="h-3.5 w-3.5" />
                {filters.type === "IN" ? "Stock In" : filters.type === "OUT" ? "Stock Out" : "All Types"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 font-semibold border-border">
              <DropdownMenuItem onClick={() => filters.setType(undefined)} className={!filters.type ? "bg-accent text-accent-foreground" : ""}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => filters.setType("IN")} className={filters.type === "IN" ? "bg-accent text-accent-foreground" : ""}>Stock In</DropdownMenuItem>
              <DropdownMenuItem onClick={() => filters.setType("OUT")} className={filters.type === "OUT" ? "bg-accent text-accent-foreground" : ""}>Stock Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 bg-card border-border rounded-md text-xs font-semibold">
                {filters.status ? filters.status : "All Status"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 font-semibold border-border">
              <DropdownMenuItem onClick={() => filters.setStatus(undefined)} className={!filters.status ? "bg-accent text-accent-foreground" : ""}>All Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => filters.setStatus("Posted")} className={filters.status === "Posted" ? "bg-accent text-accent-foreground" : ""}>Posted</DropdownMenuItem>
              <DropdownMenuItem onClick={() => filters.setStatus("Unposted")} className={filters.status === "Unposted" ? "bg-accent text-accent-foreground" : ""}>Unposted</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider font-sans px-0.5">FROM DATE</span>
            <Input
              type="date"
              value={filters.fromDate}
              onChange={(e) => filters.setFromDate(e.target.value)}
              className="h-10 border-border bg-card rounded-md text-xs w-36 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider font-sans px-0.5">TO DATE</span>
            <Input
              type="date"
              value={filters.toDate}
              onChange={(e) => filters.setToDate(e.target.value)}
              className="h-10 border-border bg-card rounded-md text-xs w-36 font-semibold"
            />
          </div>

          <Button
            variant="outline"
            onClick={resetFilters}
            className="h-10 px-4 font-semibold border-border text-foreground hover:bg-muted bg-card rounded-md text-xs"
          >
            Reset
          </Button>
        </div>
        <Button onClick={onCreate} className="h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-semibold rounded-full px-6 self-end text-xs">
          <Plus className="h-4 w-4" />
          New Adjustment
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl opacity-60">
            <p className="text-lg font-medium">No adjustments found</p>
            <p className="text-sm text-muted-foreground">Click &quot;New Adjustment&quot; to create your first entry.</p>
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
                                <span className="text-[10px] uppercase font-bold text-blue-500">Posted At</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">
                                  {item.postedAt ? format(new Date(item.postedAt), "MMM d, yyyy, hh:mm a") : "-"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-blue-500">Posted By</span>
                                <span className="font-bold text-blue-700 dark:text-blue-300">
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
                        {!isPosted && (
                          <Button variant="ghost" size="icon" onClick={() => onEdit(item.id!)} className="text-muted-foreground hover:text-primary">
                            <Pencil className="h-4 w-4 stroke-[1.5]" />
                          </Button>
                        )}
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
