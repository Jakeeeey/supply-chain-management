"use client";

import React, { useState } from "react";
import { useStockAdjustmentSummary } from "../hooks/useStockAdjustmentSummary";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Wifi,
  ClipboardList,
  Hash
} from "lucide-react";
import { StockAdjustmentDetailModal } from "./StockAdjustmentDetailModal";
import { stockAdjustmentSummaryService } from "../services/stock-adjustment-summary-service";
import { useRouter } from "next/navigation";

export function RecentLog() {
  const { filteredData } = useStockAdjustmentSummary();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Dynamically clamp the active page to avoid calling setState inside useEffect
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  return (
    <>
    <Card className="border border-border/40 rounded-xl shadow-sm bg-card flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-foreground">Recent Adjustments Log</h2>
        <p className="text-xs text-muted-foreground">Quick timeline of the latest adjustment records</p>
      </div>

      <div className="space-y-4">
        {paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl opacity-60">
            <p className="text-sm font-medium text-foreground">No adjustments found</p>
          </div>
        ) : (
          paginatedData.map((item) => {
            const isPosted = stockAdjustmentSummaryService.getIsPosted(item);

            return (
              <Card 
                key={item.id} 
                className="group overflow-hidden border border-border/40 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 bg-card relative"
              >
                {/* Visual Indicator Background Watermark */}
                <div className="absolute right-24 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none transition-transform duration-500 group-hover:scale-110">
                  {item.type === "IN" ? (
                    <ArrowUpCircle className="h-32 w-32 text-emerald-500" />
                  ) : (
                    <ArrowDownCircle className="h-32 w-32 text-rose-500" />
                  )}
                </div>

                <CardContent className="p-0">
                  <div className="flex items-center p-4 relative z-10">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Directional Iconography */}
                      <div className={`flex items-center justify-center ${item.type === "IN" ? "text-emerald-500" : "text-rose-500"}`}>
                        {item.type === "IN" ? (
                          <ArrowUpCircle className="h-8 w-8 stroke-[1.5]" />
                        ) : (
                          <ArrowDownCircle className="h-8 w-8 stroke-[1.5]" />
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-0.5">
                        {/* Double-Badge Headers */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{item.doc_no}</span>
                          <Badge 
                            variant="secondary" 
                            className={`${item.type === "IN" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"} font-bold uppercase tracking-wider text-[10px] rounded-full px-2.5 py-0.5 border-none shadow-none`}
                          >
                            Stock {item.type === "IN" ? "In" : "Out"}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`${isPosted ? "bg-sky-500/10 text-sky-500" : "bg-amber-500/10 text-amber-500"} font-bold uppercase tracking-wider text-[10px] rounded-full px-2.5 py-0.5 border-none shadow-none`}
                          >
                            {isPosted ? "Posted" : "Unposted"}
                          </Badge>
                          {/* Source-type badge */}
                          {(() => {
                            const src = (item as unknown as { source_type?: string }).source_type;
                            if (src === "RFID") return (
                              <Badge variant="secondary" className="bg-violet-500/10 text-violet-500 font-bold uppercase tracking-wider text-[10px] rounded-full px-2 py-0.5 border-none shadow-none flex items-center gap-1">
                                <Wifi className="h-2.5 w-2.5" />
                                RFID
                              </Badge>
                            );
                            if (src === "MANUAL") return (
                              <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 font-bold uppercase tracking-wider text-[10px] rounded-full px-2 py-0.5 border-none shadow-none flex items-center gap-1">
                                <ClipboardList className="h-2.5 w-2.5" />
                                Manual
                              </Badge>
                            );
                            return (
                              <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-500 font-bold uppercase tracking-wider text-[10px] rounded-full px-2 py-0.5 border-none shadow-none flex items-center gap-1">
                                <Hash className="h-2.5 w-2.5" />
                                Serial
                              </Badge>
                            );
                          })()}
                        </div>
                        
                        {/* Visual Metadata Alignment */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-1.5 text-xs text-muted-foreground">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Branch</span>
                            <span className="font-medium text-foreground/80">
                              {typeof item.branch_id === "object" ? item.branch_id?.branch_name : item.branch_id || "Main Warehouse"}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Supplier</span>
                            <span className="font-medium text-foreground/80">
                              {typeof item.supplier_id === "object" ? item.supplier_id?.supplier_name : item.supplier_id || "N/A"}
                            </span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 mb-0.5">Items</span>
                            <span className="font-bold text-primary">
                              {(() => {
                                if (Array.isArray(item.items)) return item.items.length;
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
                          
                          {/* Live Audit Trail */}
                          {isPosted && (
                            <>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-primary">Posted At</span>
                                <span className="font-bold text-primary/80">
                                  {item.postedAt ? format(new Date(item.postedAt), "MMM d, yyyy, hh:mm a") : "-"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-primary">Posted By</span>
                                <span className="font-bold text-primary">
                                  {(() => {
                                    const postedBy = item.posted_by;
                                    return typeof postedBy === "object" ? `${postedBy?.user_fname} ${postedBy?.user_lname}` : postedBy || "System User";
                                  })()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Emphasis (₱ Column) */}
                    <div className="flex items-center gap-3 pr-4">
                      <div className="text-right pr-6 mr-6 border-r border-border min-w-[120px]">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 block mb-0.5">Total Amount</span>
                        <span className="text-base font-bold text-primary">
                          ₱{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setSelectedId(Number(item.id))} 
                          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg h-9 w-9"
                          title="View Details"
                        >
                          <Eye className="h-4.5 w-4.5 stroke-[1.5]" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Remarks Strip */}
                  {item.remarks && (
                    <div className="px-4 py-2 bg-muted/20 border-t border-border/50 flex items-center gap-2 relative z-10">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Remarks:</span>
                      <span className="text-xs text-muted-foreground italic truncate max-w-2xl">{item.remarks}</span>
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
          {/* Rows per page selector */}
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
            Page {activePage} of {totalPages}
          </span>
          
          {/* Arrow Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={activePage === 1}
              className="h-8 w-8 rounded-lg border border-border bg-card text-foreground"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
              disabled={activePage === 1}
              className="h-8 w-8 rounded-lg border border-border bg-card text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages}
              className="h-8 w-8 rounded-lg border border-border bg-card text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={activePage === totalPages}
              className="h-8 w-8 rounded-lg border border-border bg-card text-foreground"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>

    {/* Detail Modal — opens when Eye button is clicked */}
    <StockAdjustmentDetailModal
      id={selectedId}
      onClose={() => setSelectedId(null)}
    />
    </>
  );
}
