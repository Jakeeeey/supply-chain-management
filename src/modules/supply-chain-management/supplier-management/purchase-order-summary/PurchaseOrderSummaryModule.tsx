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
import { Search, ChevronRight, ChevronLeft, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PurchaseOrder, Supplier, StatusRef } from "./types";

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

  // Reset to page 1 whenever a filter changes to avoid "empty" pages
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSupplier, filterInvStatus, filterPayStatus, filterTransType, pageSize]);

  // --- Helpers for Status Colors ---
  const getInventoryStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("approval")) return "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400";
    if (s.includes("received")) return "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400";
    if (s.includes("transit")) return "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400";
    if (s.includes("pending")) return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:text-yellow-400";
    if (s.includes("completed")) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400";
    return "bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400";
  };

  const getPaymentStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("pending")) return "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400";
    if (s.includes("paid")) return "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400";
    if (s.includes("unpaid")) return "bg-destructive/15 text-destructive border-destructive/30";
    if (s.includes("partial")) return "bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400";
    return "bg-slate-500/15 text-slate-600 border-slate-500/30 dark:text-slate-400";
  };

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    return poData.filter((item) => {
      const matchesSearch = (item.purchase_order_no || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSupplier = filterSupplier === "all" || item.supplier_name?.toString() === filterSupplier;
      const matchesInv = filterInvStatus === "all" || item.inventory_status?.toString() === filterInvStatus;
      const matchesPay = filterPayStatus === "all" || item.payment_status?.toString() === filterPayStatus;
      const matchesTrans = filterTransType === "all" || item.transaction_type?.toString() === filterTransType;
      return matchesSearch && matchesSupplier && matchesInv && matchesPay && matchesTrans;
    });
  }, [searchTerm, filterSupplier, filterInvStatus, filterPayStatus, filterTransType, poData]);

  // --- Pagination Logic ---
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
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      {/* FILTER PANEL */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[11px] font-black flex items-center gap-2 text-muted-foreground uppercase tracking-[0.1em]">
            <Search className="w-3.5 h-3.5" /> Search Filters
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters} 
            className="h-8 text-[10px] font-bold uppercase text-muted-foreground hover:text-destructive gap-1.5 transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" /> Reset Filters
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6">
          {/* Row 1: Search and Supplier */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground/80 ml-1">PO Number</label>
            <Input 
              placeholder="Search by PO number..." 
              className="h-10 text-sm bg-background border-border focus-visible:ring-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground/80 ml-1">Filter by Supplier</label>
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="h-10 text-sm bg-background border-border">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.supplier_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3" /> {/* Spacer */}

          {/* Row 2: Statuses Side by Side */}
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground/80 ml-1">Inventory Status</label>
            <Select value={filterInvStatus} onValueChange={setFilterInvStatus}>
              <SelectTrigger className="h-10 text-sm bg-background border-border">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {transactionStatuses.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground/80 ml-1">Payment Status</label>
            <Select value={filterPayStatus} onValueChange={setFilterPayStatus}>
              <SelectTrigger className="h-10 text-sm bg-background border-border">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {paymentStatuses.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground/80 ml-1">Trans. Type</label>
            <Select value={filterTransType} onValueChange={setFilterTransType}>
              <SelectTrigger className="h-10 text-sm bg-background border-border">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="1">Trade</SelectItem>
                <SelectItem value="2">Non-Trade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold text-foreground h-12 text-[11px] uppercase tracking-wider">PO Number</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Transaction Type</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Supplier Name</TableHead>
              <TableHead className="font-bold text-foreground text-[11px] uppercase tracking-wider">Date Requested</TableHead>
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
                  <TableRow key={po.purchase_order_id} className="border-border hover:bg-muted/20 transition-colors">
                    <TableCell className="font-bold text-primary hover:underline cursor-pointer py-5">{po.purchase_order_no}</TableCell>
                    <TableCell className="text-xs font-medium text-muted-foreground">
                      {po.transaction_type === 1 ? "Trade" : "Non-Trade"}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">{supplierName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{po.date}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`${getInventoryStatusColor(invStatusText)} px-2.5 py-1 text-[10px] font-bold border rounded-md shadow-none`}>
                        {invStatusText}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`${getPaymentStatusColor(payStatusText)} px-2.5 py-1 text-[10px] font-bold border rounded-md shadow-none`}>
                        {payStatusText}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm italic">
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
              <SelectTrigger className="w-[70px] h-8 text-[11px] font-bold bg-card border-border">
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
            className="h-8 w-8 border-border"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center justify-center min-w-[100px] h-8 text-[10px] font-black bg-foreground text-background rounded-md px-4 uppercase tracking-tighter">
            Page {currentPage} of {totalPages}
          </div>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 border-border"
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