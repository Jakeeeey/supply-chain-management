"use client";

import { 
  Search, 
  Plus, 
  Eye, 
  Pencil, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter
} from "lucide-react";
import { StockAdjustmentHeader } from "../types/stock-adjustment.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StockAdjustmentListProps {
  data: StockAdjustmentHeader[];
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
  };
}

export function StockAdjustmentList({
  data,
  onCreate,
  onEdit,
  onDetail,
  filters
}: StockAdjustmentListProps) {
  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Stock Adjustments</h1>
        <p className="text-sm text-muted-foreground">Manage inventory stock adjustments</p>
      </div>

      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by document no, branch, or remarks..."
              className="pl-9 h-10"
              value={filters.search}
              onChange={(e) => filters.setSearch(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                <Filter className="h-4 w-4" />
                {filters.type === "IN" ? "Stock In" : filters.type === "OUT" ? "Stock Out" : "All Types"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 font-bold border-slate-200">
              <DropdownMenuItem onClick={() => filters.setType(undefined)} className={!filters.type ? "bg-blue-50 text-blue-600" : ""}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => filters.setType("IN")} className={filters.type === "IN" ? "bg-blue-50 text-blue-600" : ""}>Stock In</DropdownMenuItem>
              <DropdownMenuItem onClick={() => filters.setType("OUT")} className={filters.type === "OUT" ? "bg-blue-50 text-blue-600" : ""}>Stock Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                {filters.status ? filters.status : "All Status"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 font-bold border-slate-200">
              <DropdownMenuItem onClick={() => filters.setStatus(undefined)} className={!filters.status ? "bg-blue-50 text-blue-600" : ""}>All Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => filters.setStatus("Posted")} className={filters.status === "Posted" ? "bg-blue-50 text-blue-600" : ""}>Posted</DropdownMenuItem>
              <DropdownMenuItem onClick={() => filters.setStatus("Unposted")} className={filters.status === "Unposted" ? "bg-blue-50 text-blue-600" : ""}>Unposted</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button onClick={onCreate} className="h-10 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
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
            const isPosted = item.isPosted === true || (typeof item.isPosted === 'object' && item.isPosted?.data?.[0] === 1);
            
            return (
              <Card key={item.id} className="group overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2.5 rounded-lg ${item.type === 'IN' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {item.type === 'IN' ? (
                          <ArrowUpCircle className="h-6 w-6" />
                        ) : (
                          <ArrowDownCircle className="h-6 w-6" />
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.doc_no}</span>
                          <Badge variant="outline" className={item.type === 'IN' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                            Stock {item.type === 'IN' ? 'In' : 'Out'}
                          </Badge>
                          <Badge variant="outline" className={isPosted ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                            {isPosted ? 'Posted' : 'Unposted'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-1 text-sm text-slate-500">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Branch</span>
                            <span className="font-medium">
                              {typeof item.branch_id === 'object' ? item.branch_id?.branch_name : item.branch_id || "Main Warehouse"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 mb-0.5">Items</span>
                            <span className="font-bold text-blue-600">
                              {(Array.isArray(item.items) ? item.items.length : (Array.isArray((item as any).stock_adjustment) ? (item as any).stock_adjustment.length : 0))} products
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Created At</span>
                            <span className="font-medium">
                              {item.created_at ? format(new Date(item.created_at), "MMM d, yyyy, hh:mm a") : "-"}
                            </span>
                          </div>
                          {isPosted && (
                            <>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-blue-400">Posted At</span>
                                <span className="font-bold text-blue-700">
                                  {item.postedAt ? format(new Date(item.postedAt), "MMM d, yyyy, hh:mm a") : "-"}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-blue-400">Posted By</span>
                                <span className="font-bold text-blue-800">
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
                      <div className="text-right pr-6 mr-6 border-r border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Amount</span>
                        <span className="text-lg font-bold text-blue-600">
                          ₱{item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onDetail(item.id!)} className="text-slate-400 hover:text-slate-900">
                          <Eye className="h-5 w-5" />
                        </Button>
                        {!isPosted && (
                          <Button variant="ghost" size="icon" onClick={() => onEdit(item.id!)} className="text-slate-400 hover:text-blue-600">
                            <Pencil className="h-5 w-5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {item.remarks && (
                    <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100/50 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Remarks:</span>
                      <span className="text-xs text-slate-600 italic">{item.remarks}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
