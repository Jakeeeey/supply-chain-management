"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronRight, ChevronLeft, FilterX, ListFilter, Printer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PurchaseOrder, Supplier, StatusRef } from "./types";
import { generatePOSummaryPDF } from "./utils/generatePOSummaryPDF";

interface Props {
  poData: PurchaseOrder[];
  suppliers: Supplier[];
  paymentStatuses: StatusRef[];
  transactionStatuses: StatusRef[];
}

export default function PurchaseOrderSummaryModule({ 
  poData, 
  suppliers, 
  paymentStatuses, 
  transactionStatuses 
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterInvStatus, setFilterInvStatus] = useState("all");
  const [filterPayStatus, setFilterPayStatus] = useState("all");
  const [filterTransType, setFilterTransType] = useState("all");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");


  const getInventoryStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("approval")) return "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400";
    if (s.includes("received")) return "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400";
    if (s.includes("transit")) return "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400";
    if (s.includes("pending")) return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400";
    return "bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400";
  };

  const getPaymentStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("pending")) return "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400";
    if (s.includes("paid")) return "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400";
    if (s.includes("unpaid")) return "bg-destructive/15 text-destructive border-destructive/30";
    return "bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400";
  };

  const filteredData = useMemo(() => {
    return poData.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const supplierName = suppliers.find(s => s.id === item.supplier_name)?.supplier_name || "";
      const matchesSearch = 
        (item.purchase_order_no || "").toLowerCase().includes(searchLower) ||
        (item.remark || "").toLowerCase().includes(searchLower) ||
        supplierName.toLowerCase().includes(searchLower);

      const matchesSupplier = filterSupplier === "all" || item.supplier_name?.toString() === filterSupplier;
      const matchesInv = filterInvStatus === "all" || item.inventory_status?.toString() === filterInvStatus;
      const matchesPay = filterPayStatus === "all" || item.payment_status?.toString() === filterPayStatus;
      const matchesTrans = filterTransType === "all" || item.transaction_type?.toString() === filterTransType;
      
      const matchesDate = (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo);
      
      return matchesSearch && matchesSupplier && matchesInv && matchesPay && matchesTrans && matchesDate;
    });
  }, [searchTerm, filterSupplier, filterInvStatus, filterPayStatus, filterTransType, poData, dateFrom, dateTo, suppliers]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const resetFilters = () => {
    setSearchTerm("");
    setFilterSupplier("all");
    setFilterInvStatus("all");
    setFilterPayStatus("all");
    setFilterTransType("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* FILTER PANEL - MATCHED UI WITH image_45f077.png */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">Search & Filters</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generatePOSummaryPDF(filteredData, suppliers)}
                className="h-8 text-[10px] font-bold uppercase gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
            >
                <Printer className="w-3.5 h-3.5" /> Print Summary
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters} 
                className="h-8 text-[10px] font-bold uppercase text-muted-foreground hover:text-destructive gap-1.5"
            >
                <FilterX className="w-3.5 h-3.5" /> Reset Filters
            </Button>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Search Row */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search</label>
            <div className="relative">
              <Input 
                placeholder="Search by PO number, supplier, transaction type, or remarks..." 
                className="h-11 bg-muted/20 border-border focus-visible:ring-1"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-3 block">Filter By</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Supplier */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70 ml-1">Supplier</span>
                <Select value={filterSupplier} onValueChange={(v) => { setFilterSupplier(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 text-xs bg-background border-border">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.supplier_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Type */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70 ml-1">Transaction Type</span>
                <Select value={filterTransType} onValueChange={(v) => { setFilterTransType(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 text-xs bg-background border-border">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="1">Trade</SelectItem>
                    <SelectItem value="2">Non-Trade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inventory Status */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70 ml-1">Inventory Status</span>
                <Select value={filterInvStatus} onValueChange={(v) => { setFilterInvStatus(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 text-xs bg-background border-border">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {transactionStatuses.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70 ml-1">Payment Status</span>
                <Select value={filterPayStatus} onValueChange={(v) => { setFilterPayStatus(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-10 text-xs bg-background border-border">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {paymentStatuses.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Requested Range */}
              <div className="space-y-1.5 lg:col-span-2">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70 ml-1">Date Requested (From - To)</span>
                <div className="flex items-center gap-2">
                   <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input 
                        type="date" 
                        className="pl-8 h-10 text-xs bg-background border-border" 
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                      />
                   </div>
                   <div className="text-muted-foreground text-xs">—</div>
                   <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input 
                        type="date" 
                        className="pl-8 h-10 text-xs bg-background border-border" 
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                      />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="font-bold text-foreground h-12 text-[11px] uppercase tracking-wider">PO Number</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Transaction Type</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Supplier Name</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Date Requested</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Remarks</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider text-right">Total Amount</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider text-center">Inventory Status</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider text-center">Payment Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length > 0 ? (
              currentData.map((po) => {
                const invStatusText = transactionStatuses.find(s => s.id === po.inventory_status)?.status || "Unknown";
                const payStatusText = paymentStatuses.find(s => s.id === po.payment_status)?.status || "Unknown";
                const supplierName = suppliers.find(s => s.id === po.supplier_name)?.supplier_name || po.supplier_name;

                return (
                  <TableRow key={po.purchase_order_id} className="border-border hover:bg-muted/10 transition-colors">
                    <TableCell className="font-bold text-primary hover:underline cursor-pointer py-4">{po.purchase_order_no}</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {po.transaction_type === 1 ? "Trade" : "Non-Trade"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">{supplierName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{po.date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground italic">
                      {/* GINAGAMIT NA ANG FIELD NA 'remark' MULA SA API */}
                      {po.remark || "--"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold font-mono text-foreground">
                      {Number(po.total_amount ?? po.total ?? po.net_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`${getInventoryStatusColor(invStatusText)} px-2.5 py-1 text-[10px] font-black border rounded-md shadow-none uppercase`}>
                        {invStatusText}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`${getPaymentStatusColor(payStatusText)} px-2.5 py-1 text-[10px] font-black border rounded-md shadow-none uppercase`}>
                        {payStatusText}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm italic">
                  No purchase orders found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION SECTION */}
      <div className="flex flex-col md:flex-row items-center justify-between px-2 gap-6 pb-4">
        <div className="flex items-center gap-6">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Showing <span className="text-foreground">{filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="text-foreground">{Math.min(currentPage * pageSize, filteredData.length)}</span> of {filteredData.length} entries
          </p>
          
          <div className="flex items-center gap-2 border-l border-border pl-6">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Per Page:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[75px] h-8 text-[11px] font-bold bg-card border-border shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map(size => <SelectItem key={size} value={size.toString()}>{size}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-border shadow-none"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center justify-center min-w-[110px] h-8 text-[10px] font-black bg-foreground text-background rounded-md px-4 uppercase tracking-tighter shadow-sm">
            Page {currentPage} of {totalPages}
          </div>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-border shadow-none"
            disabled={currentPage === totalPages || filteredData.length === 0}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}