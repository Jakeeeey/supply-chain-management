"use client";

import React, { useState, useMemo, useRef, useEffect, useTransition, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterX, ListFilter, Printer, Calendar, Search, ChevronDown, X, Package, FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PurchaseOrder, Supplier, StatusRef } from "./types";
import { generatePOSummaryPDF } from "./utils/generatePOSummaryPDF";
import { DataTable } from "@/components/ui/new-data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorPage from "@/components/shared/ErrorPage";

interface Allocation {
  id: string | number;
  productId: number;
  productName: string;
  branchName: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  discount: number;
  total: number;
  status: "FULFILLED" | "PARTIAL" | "OPEN";
}

interface ReceiptItem {
  productName: string;
  branchName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  batchNo: string;
  expiryDate: string;
}

interface Receipt {
  receiptNo: string;
  receiptDate: string;
  isPosted: boolean;
  items: ReceiptItem[];
}

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
  const [filterTransType, setFilterTransType] = useState("1");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // PO Detail state (Allocations & Receipts)
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());

  const toggleReceipt = useCallback((receiptNo: string) => {
    setExpandedReceipts(prev => {
      const next = new Set(prev);
      if (next.has(receiptNo)) next.delete(receiptNo);
      else next.add(receiptNo);
      return next;
    });
  }, []);

  // Fetch PO details when a PO is selected
  useEffect(() => {
    if (!selectedPO) {
      setAllocations([]);
      setReceipts([]);
      setExpandedReceipts(new Set());
      return;
    }
    let cancelled = false;
    async function load() {
      setIsLoadingDetails(true);
      try {
        const res = await fetch("/api/scm/supplier-management/purchase-order-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_po_details", poId: selectedPO!.purchase_order_id }),
        });
        const json = await res.json();
        if (!cancelled) {
          setAllocations(json?.data?.allocations ?? []);
          setReceipts(json?.data?.receipts ?? []);
          // Auto-expand the first receipt
          const first = json?.data?.receipts?.[0]?.receiptNo;
          if (first) setExpandedReceipts(new Set([first]));
        }
      } catch (err) {
        if (!cancelled) {
          setAllocations([]);
          setReceipts([]);
        }
      } finally {
        if (!cancelled) setIsLoadingDetails(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedPO]);

  // States to simulate loading and handle actual errors
  const [isPending, startTransition] = useTransition();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Sort PO data by date descending (latest first)
  const sortedPoData = useMemo(() => {
    if (!poData) return [];
    return [...poData].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [poData]);

  // Simulate initial load for the pulse effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 1000); // 1-second initial load pulse mapping to the user requirement

    // Check for prop error conceptually (e.g. if poData is totally missing due to fetch error)
    if (!poData || !suppliers) {
      setError(new Error("Failed to load necessary data from server."));
    }

    return () => clearTimeout(timer);
  }, [poData, suppliers]);

  const getInventoryStatusColor = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("approval")) return "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400";
    if (s === "received") return "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400";
    if (s.includes("partially")) return "bg-cyan-500/15 text-cyan-600 border-cyan-500/30 dark:text-cyan-400";
    if (s.includes("receiving")) return "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400";
    if (s.includes("pickup")) return "bg-indigo-500/15 text-indigo-600 border-indigo-500/30 dark:text-indigo-400";
    if (s.includes("route") || s.includes("transit")) return "bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400";
    if (s.includes("cancel")) return "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400";
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
    return sortedPoData.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const supplierName = suppliers.find(s => s.id === item.supplier_name)?.supplier_name || "";
      const transTypeText = item.transaction_type === 1 ? "trade" : "non-trade";

      const matchesSearch =
        (item.purchase_order_no || "").toLowerCase().includes(searchLower) ||
        (item.remark || "").toLowerCase().includes(searchLower) ||
        supplierName.toLowerCase().includes(searchLower) ||
        transTypeText.includes(searchLower);

      const matchesSupplier = filterSupplier === "all" || item.supplier_name?.toString() === filterSupplier;
      const matchesInv = filterInvStatus === "all" || item.inventory_status?.toString() === filterInvStatus;
      const matchesPay = filterPayStatus === "all" || item.payment_status?.toString() === filterPayStatus;
      const matchesTrans = filterTransType === "all" || item.transaction_type?.toString() === filterTransType;

      const matchesDate = (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo);

      return matchesSearch && matchesSupplier && matchesInv && matchesPay && matchesTrans && matchesDate;
    });
  }, [searchTerm, filterSupplier, filterInvStatus, filterPayStatus, filterTransType, sortedPoData, dateFrom, dateTo, suppliers]);

  const previewTotals = useMemo(() => {
    return filteredData.reduce(
      (acc, po) => {
        const gross = Number(po.gross_amount ?? po.grossAmount ?? po.subtotal ?? 0);
        const disc = Number(po.discounted_amount ?? po.discountAmount ?? po.discount_amount ?? po.discount_value ?? 0);
        const net = Number(po.total_amount ?? po.total ?? po.net_amount ?? 0);
        return {
          gross: acc.gross + gross,
          discount: acc.discount + disc,
          net: acc.net + net,
        };
      },
      { gross: 0, discount: 0, net: 0 }
    );
  }, [filteredData]);

  const resetFilters = () => {
    startTransition(() => {
      setSearchTerm("");
      setFilterSupplier("all");
      setFilterInvStatus("all");
      setFilterPayStatus("all");
      setFilterTransType("all");
      setDateFrom("");
      setDateTo("");
    });
  };

  // Helper to wrap state updates with transition for pulse loading effect
  const handleFilterChange = (updater: () => void) => {
    startTransition(() => {
      updater();
    });
  };

  // ── Searchable Filter Dropdown Component ──
  function SearchableFilter({
    label, value, onChange, options, allLabel
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { id: string; label: string }[];
    allLabel: string;
  }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter(o =>
      o.label.toLowerCase().includes(query.toLowerCase())
    );

    const selectedLabel = value === "all"
      ? allLabel
      : options.find(o => o.id === value)?.label || allLabel;

    return (
      <div className="space-y-1.5">
        <span className="text-[9px] font-bold uppercase text-muted-foreground/70 ml-1">{label}</span>
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => { setOpen(!open); setQuery(""); }}
            className="flex items-center justify-between w-full h-10 px-3 text-xs bg-background border border-border rounded-md hover:bg-muted/50 transition-colors text-left"
          >
            <span className="truncate">{selectedLabel}</span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {value !== "all" && (
                <span
                  onClick={(e) => { e.stopPropagation(); handleFilterChange(() => onChange("all")); }}
                  className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {open && (
            <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150">
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type to search..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-muted/30 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto p-1">
                <button
                  type="button"
                  onClick={() => { handleFilterChange(() => onChange("all")); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${value === "all" ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground"}`}
                >
                  {allLabel}
                </button>
                {filtered.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { handleFilterChange(() => onChange(o.id)); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${value === o.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground"}`}
                  >
                    {o.label}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center italic">No matches found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const supplierOptions = useMemo(() =>
    suppliers
      .filter(s => s.supplier_type?.toUpperCase() === "TRADE")
      .map(s => ({ id: s.id.toString(), label: s.supplier_name })),
    [suppliers]
  );
  const invStatusOptions = useMemo(() => transactionStatuses.map(s => ({ id: s.id.toString(), label: s.status })), [transactionStatuses]);
  const payStatusOptions = useMemo(() => paymentStatuses.map(s => ({ id: s.id.toString(), label: s.status })), [paymentStatuses]);

  const isLoading = isInitialLoad || isPending;

  // ── DataTable Columns Definition ──
  const columns: ColumnDef<PurchaseOrder>[] = useMemo(() => [
    {
      accessorKey: "purchase_order_no",
      header: "PO Number",
      cell: ({ row }) => {
        return (
          <div
            className="font-bold text-primary hover:underline cursor-pointer"
            onClick={() => setSelectedPO(row.original)}
          >
            {row.original.purchase_order_no}
          </div>
        );
      },
      enableHiding: false, // critical column
    },
    {
      accessorKey: "transaction_type",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-muted-foreground">
          {row.original.transaction_type === 1 ? "Trade" : "Non-Trade"}
        </span>
      ),
    },
    {
      accessorKey: "supplier_name",
      header: "Supplier Name",
      cell: ({ row }) => {
        const supplierName = suppliers.find(s => s.id === row.original.supplier_name)?.supplier_name || row.original.supplier_name;
        return <span className="text-xs font-semibold text-foreground uppercase">{supplierName}</span>;
      },
    },
    {
      accessorKey: "date",
      header: "Date Requested",
      cell: ({ row }) => <span className="text-xs text-muted-foreground whitespace-nowrap">{row.original.date || "--"}</span>,
    },
    {
      accessorKey: "remark",
      header: "Remarks",
      cell: ({ row }) => <span className="text-xs text-muted-foreground italic truncate max-w-[200px] block">{row.original.remark || "--"}</span>,
    },
    {
      accessorKey: "total_amount",
      header: () => <div className="text-right">Total Amount</div>,
      cell: ({ row }) => {
        const val = row.original.total_amount ?? row.original.total ?? row.original.net_amount ?? 0;
        return (
          <div className="text-right text-xs font-bold font-mono text-foreground">
            {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        );
      },
    },
    {
      accessorKey: "inventory_status",
      header: () => <div className="text-center">Inventory Status</div>,
      cell: ({ row }) => {
        const invStatusText = transactionStatuses.find(s => s.id === row.original.inventory_status)?.status || "Unknown";
        return (
          <div className="flex justify-center">
            <Badge variant="outline" className={`${getInventoryStatusColor(invStatusText)} px-2.5 py-1 text-[10px] font-black border rounded-md shadow-none uppercase`}>
              {invStatusText}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "payment_status",
      header: () => <div className="text-center">Payment Status</div>,
      cell: ({ row }) => {
        const payStatusText = paymentStatuses.find(s => s.id === row.original.payment_status)?.status || "Unknown";
        return (
          <div className="flex justify-center">
            <Badge variant="outline" className={`${getPaymentStatusColor(payStatusText)} px-2.5 py-1 text-[10px] font-black border rounded-md shadow-none uppercase`}>
              {payStatusText}
            </Badge>
          </div>
        );
      },
    },
  ], [suppliers, transactionStatuses, paymentStatuses]);

  if (error) {
    return <ErrorPage
      code="500"
      title="Data Loading Failed"
      message={error.message}
      reset={() => window.location.reload()}
    />;
  }


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
              onClick={() => setIsPreviewOpen(true)}
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
              <FilterX className="w-3.5 h-3.5" /> Clear Filter
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Search Row */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Search</label>
            <div className="relative">
              {isInitialLoad ? (
                <Skeleton className="h-11 w-full" />
              ) : (
                <Input
                  placeholder="Search by PO number, supplier, transaction type, or remarks..."
                  className="h-11 bg-muted/20 border-border focus-visible:ring-1"
                  value={searchTerm}
                  onChange={(e) => { handleFilterChange(() => setSearchTerm(e.target.value)); }}
                />
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <label className="text-[10px] font-bold uppercase text-muted-foreground mb-3 block">Filter By</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Supplier - Searchable */}
              {isInitialLoad ? (
                <div className="space-y-1.5"><Skeleton className="h-10 w-full" /></div>
              ) : (
                <SearchableFilter
                  label="Supplier"
                  value={filterSupplier}
                  onChange={setFilterSupplier}
                  options={supplierOptions}
                  allLabel="All Suppliers"
                />
              )}

              {/* Transaction Type */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70 ml-1">Transaction Type</span>
                {isInitialLoad ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={filterTransType} onValueChange={(v) => { handleFilterChange(() => setFilterTransType(v)); }}>
                    <SelectTrigger className="h-10 text-xs bg-background border-border">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Trade</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Inventory Status - Searchable */}
              {isInitialLoad ? (
                <div className="space-y-1.5"><Skeleton className="h-10 w-full" /></div>
              ) : (
                <SearchableFilter
                  label="Inventory Status"
                  value={filterInvStatus}
                  onChange={setFilterInvStatus}
                  options={invStatusOptions}
                  allLabel="All Statuses"
                />
              )}

              {/* Payment Status - Searchable */}
              {isInitialLoad ? (
                <div className="space-y-1.5"><Skeleton className="h-10 w-full" /></div>
              ) : (
                <SearchableFilter
                  label="Payment Status"
                  value={filterPayStatus}
                  onChange={setFilterPayStatus}
                  options={payStatusOptions}
                  allLabel="All Statuses"
                />
              )}

              {/* Date Requested Range */}
              <div className="space-y-1.5 lg:col-span-2">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70 ml-1">Date Requested (From - To)</span>
                {isInitialLoad ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-full flex-1" />
                    <div className="text-muted-foreground text-xs">—</div>
                    <Skeleton className="h-10 w-full flex-1" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-8 h-10 text-xs bg-background border-border"
                        value={dateFrom}
                        onChange={(e) => { handleFilterChange(() => setDateFrom(e.target.value)); }}
                      />
                    </div>
                    <div className="text-muted-foreground text-xs">—</div>
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-8 h-10 text-xs bg-background border-border"
                        value={dateTo}
                        onChange={(e) => { handleFilterChange(() => setDateTo(e.target.value)); }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        searchKey="purchase_order_no"
        emptyTitle="No purchase orders found matching your filters."
      />

      {/* MODAL POP-UP FOR ROW DETAILS */}
      <Dialog open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)}>
        <DialogContent className="sm:max-w-5xl max-w-[95vw] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-primary flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              Transaction Details
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
            {selectedPO && (() => {
              const invStatusText = transactionStatuses.find(s => s.id === selectedPO.inventory_status)?.status || "Unknown";
              const payStatusText = paymentStatuses.find(s => s.id === selectedPO.payment_status)?.status || "Unknown";
              const supplierName = suppliers.find(s => s.id === selectedPO.supplier_name)?.supplier_name || selectedPO.supplier_name;
              const gross = Number(selectedPO.gross_amount ?? selectedPO.grossAmount ?? selectedPO.subtotal ?? 0);
              const disc = Number(selectedPO.discounted_amount ?? selectedPO.discountAmount ?? selectedPO.discount_amount ?? selectedPO.discount_value ?? 0);
              const net = Number(selectedPO.total_amount ?? selectedPO.total ?? selectedPO.net_amount ?? 0);

              return (
                <div className="space-y-8">
                  {/* Horizontal Table Container */}
                  <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/80">
                        <TableRow className="hover:bg-transparent border-b border-border">
                          <TableHead className="font-bold text-[10px] uppercase tracking-widest h-12 px-6">PO Number</TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-widest px-4">Type</TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-widest px-4">Supplier</TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-widest px-4">Date</TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-widest text-center px-4">Inv Status</TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-widest text-center px-4">Pay Status</TableHead>
                          <TableHead className="font-bold text-[10px] uppercase tracking-widest px-6">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-transparent border-none">
                          <TableCell className="font-black text-primary font-mono py-6 px-6 text-sm tracking-tighter">
                            {selectedPO.purchase_order_no}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap px-4 uppercase">
                            {selectedPO.transaction_type === 1 ? "Trade" : "Non-Trade"}
                          </TableCell>
                          <TableCell className="text-xs font-black text-foreground max-w-[180px] truncate px-4 uppercase tracking-tight">
                            {supplierName}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-muted-foreground whitespace-nowrap px-4">
                            {selectedPO.date || "--"}
                          </TableCell>
                          <TableCell className="text-center px-4">
                            <Badge variant="outline" className={`${getInventoryStatusColor(invStatusText)} px-3 py-1 text-[10px] font-black border-2 rounded-lg uppercase shrink-0 shadow-sm`}>
                              {invStatusText}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center px-4">
                            <Badge variant="outline" className={`${getPaymentStatusColor(payStatusText)} px-3 py-1 text-[10px] font-black border-2 rounded-lg uppercase shrink-0 shadow-sm`}>
                              {payStatusText}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground italic min-w-[160px] px-6">
                            {selectedPO.remark || "--"}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl border border-border bg-muted/30 space-y-2 shadow-inner transition-all hover:border-border/80">
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Gross Amount</div>
                      <div className="text-2xl font-black font-mono text-foreground flex items-baseline gap-1">
                        <span className="text-sm font-bold opacity-50">₱</span>
                        {gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-border bg-muted/30 space-y-2 shadow-inner transition-all hover:border-border/80">
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Discount</div>
                      <div className="text-2xl font-black font-mono text-destructive flex items-baseline gap-1 text-red-500">
                        <span className="text-sm font-bold opacity-50">- ₱</span>
                        {disc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-2 shadow-[0_0_20px_rgba(var(--primary),0.1)] transition-all hover:border-primary/50 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-primary" />
                      </div>
                      <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Total Net Amount</div>
                      <div className="text-4xl font-black font-mono text-primary flex items-baseline gap-2">
                        <span className="text-lg font-bold opacity-40">₱</span>
                        {net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {/* ── Ordered Items Summary (Cross-Reference) ── */}
                  {isLoadingDetails ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : allocations.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Ordered Items Summary</h3>
                        <Badge variant="outline" className="text-[9px] font-black border-primary/30 text-primary px-2 py-0.5">
                          {allocations.length} {allocations.length === 1 ? "ITEM" : "ITEMS"}
                        </Badge>
                      </div>

                      <div className="rounded-xl border border-border overflow-hidden bg-card/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-transparent border-b border-border">
                              <TableHead className="text-[9px] font-bold uppercase tracking-widest h-10 px-4">Product</TableHead>
                              <TableHead className="text-[9px] font-bold uppercase tracking-widest px-3">Branch</TableHead>
                              <TableHead className="text-[9px] font-bold uppercase tracking-widest text-center px-2">Ordered</TableHead>
                              <TableHead className="text-[9px] font-bold uppercase tracking-widest text-center px-2">Received</TableHead>
                              <TableHead className="text-[9px] font-bold uppercase tracking-widest text-center px-2">Balance</TableHead>
                              <TableHead className="text-[9px] font-bold uppercase tracking-widest text-right px-4">Amount (Est.)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allocations.map((item) => {
                              const balance = Math.max(0, item.orderedQty - item.receivedQty);
                              const isComplete = item.receivedQty >= item.orderedQty;
                              const isPartial = item.receivedQty > 0 && item.receivedQty < item.orderedQty;

                              return (
                                <TableRow key={item.id} className="border-border hover:bg-muted/20 transition-colors">
                                  <TableCell className="text-xs font-black text-foreground uppercase tracking-tight px-4 py-3 max-w-[250px] truncate">
                                    {item.productName}
                                  </TableCell>
                                  <TableCell className="text-[10px] text-muted-foreground font-semibold px-3 truncate">
                                    {item.branchName}
                                  </TableCell>
                                  <TableCell className="text-[11px] font-black text-center px-2 font-mono">
                                    {item.orderedQty}
                                  </TableCell>
                                  <TableCell className={`text-[11px] font-black text-center px-2 font-mono ${isComplete ? 'text-green-600' : (isPartial ? 'text-blue-600' : 'text-muted-foreground/50')}`}>
                                    {item.receivedQty}
                                  </TableCell>
                                  <TableCell className={`text-[11px] font-black text-center px-2 font-mono ${balance > 0 ? 'text-destructive' : 'text-green-600 opacity-30'}`}>
                                    {balance}
                                  </TableCell>
                                  <TableCell className="text-[11px] font-black font-mono text-right text-foreground px-4">
                                    ₱{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                          <TableFooter className="bg-muted/30 hover:bg-muted/30">
                            <TableRow>
                              <TableCell colSpan={2} className="text-[10px] font-bold uppercase text-muted-foreground px-4 py-3">Total Estimated</TableCell>
                              <TableCell className="text-center font-black font-mono text-[11px]">
                                {allocations.reduce((s, i) => s + i.orderedQty, 0)}
                              </TableCell>
                              <TableCell className="text-center font-black font-mono text-[11px] text-primary">
                                {allocations.reduce((s, i) => s + i.receivedQty, 0)}
                              </TableCell>
                              <TableCell className="text-center font-black font-mono text-[11px] text-destructive">
                                {allocations.reduce((s, i) => s + Math.max(0, i.orderedQty - i.receivedQty), 0)}
                              </TableCell>
                              <TableCell className="text-right font-black font-mono text-[11px] text-foreground px-4">
                                ₱{allocations.reduce((s, i) => s + i.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-border/50 pt-2" />

                  {/* ── Receipts & Items History ── */}
                  {isLoadingDetails ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : receipts.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Receipts & Items History</h3>
                        <Badge variant="outline" className="text-[9px] font-black border-primary/30 text-primary px-2 py-0.5">
                          {receipts.length} {receipts.length === 1 ? "RECEIPT" : "RECEIPTS"}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {receipts.map((receipt) => {
                          const isExpanded = expandedReceipts.has(receipt.receiptNo);
                          const totalQty = receipt.items.reduce((s, i) => s + i.quantity, 0);
                          const totalAmt = receipt.items.reduce((s, i) => s + i.total, 0);
                          return (
                            <div key={receipt.receiptNo} className="rounded-xl border border-border overflow-hidden bg-card/50 shadow-sm">
                              {/* Receipt Header */}
                              <button
                                type="button"
                                onClick={() => toggleReceipt(receipt.receiptNo)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-black text-foreground font-mono tracking-tight">{receipt.receiptNo}</span>
                                    <Badge variant="outline" className={`text-[8px] font-black px-1.5 py-0 border rounded-md uppercase ${receipt.isPosted
                                      ? 'bg-green-500/15 text-green-600 border-green-500/30'
                                      : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                                      }`}>
                                      {receipt.isPosted ? 'Posted' : 'Unposted'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                  <span className="text-[10px] text-muted-foreground">{receipt.receiptDate || '—'}</span>
                                  <span className="text-[10px] font-bold text-muted-foreground">{totalQty} items</span>
                                  <span className="text-[10px] font-black font-mono text-primary">₱{totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                              </button>

                              {/* Receipt Items Table */}
                              {isExpanded && (
                                <div className="border-t border-border overflow-x-auto">
                                  <Table>
                                    <TableHeader className="bg-muted/30">
                                      <TableRow className="hover:bg-transparent border-b border-border">
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest h-9 px-4">Product</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest px-3">Branch</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-center px-3">Qty</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-right px-3">Unit Price</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-right px-3">Discount</TableHead>
                                        <TableHead className="text-[9px] font-bold uppercase tracking-widest text-right px-4">Total</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {receipt.items.map((item, idx) => (
                                        <TableRow key={idx} className="border-border hover:bg-muted/20">
                                          <TableCell className="text-[10px] font-bold text-foreground uppercase tracking-tight px-4 py-2.5 max-w-[220px]">
                                            <div className="truncate">{item.productName}</div>
                                            {(item.batchNo || item.expiryDate) && (
                                              <div className="flex gap-2 mt-0.5">
                                                {item.batchNo && <span className="text-[8px] text-muted-foreground">Batch: {item.batchNo}</span>}
                                                {item.expiryDate && <span className="text-[8px] text-muted-foreground">Exp: {item.expiryDate}</span>}
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-[10px] text-muted-foreground font-medium px-3">{item.branchName}</TableCell>
                                          <TableCell className="text-[10px] font-black text-center px-3">{item.quantity}</TableCell>
                                          <TableCell className="text-[10px] font-mono text-right text-muted-foreground px-3">
                                            {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell className="text-[10px] font-mono text-right text-red-500/80 px-3">
                                            {item.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell className="text-[10px] font-black font-mono text-right text-primary px-4">
                                            {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Package className="w-8 h-8 opacity-30 mb-2" />
                      <p className="text-xs font-medium">No receipts recorded yet</p>
                      <p className="text-[10px] text-muted-foreground/60">Receipts will appear here once items are received.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* PRINT PREVIEW MODAL */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-6xl max-w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              Print Preview
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-bold text-foreground h-10 text-[10px] uppercase tracking-wider">Date</TableHead>
                    <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-wider">Supplier</TableHead>
                    <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-wider">PO #</TableHead>
                    <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-wider">Remarks</TableHead>
                    <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-wider text-right">Gross Amount</TableHead>
                    <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-wider text-right">Discount</TableHead>
                    <TableHead className="font-bold text-foreground text-[10px] uppercase tracking-wider text-right">Net Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((po) => {
                      const supplierName = suppliers.find(s => s.id === po.supplier_name)?.supplier_name || po.supplier_name;
                      const gross = Number(po.gross_amount ?? po.grossAmount ?? po.subtotal ?? 0);
                      const disc = Number(po.discounted_amount ?? po.discountAmount ?? po.discount_amount ?? po.discount_value ?? 0);
                      const net = Number(po.total_amount ?? po.total ?? po.net_amount ?? 0);

                      return (
                        <TableRow key={po.purchase_order_id} className="border-border">
                          <TableCell className="text-[10px] text-muted-foreground">{po.date || "--"}</TableCell>
                          <TableCell className="text-[10px] font-semibold text-foreground uppercase">{supplierName}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{po.purchase_order_no || "--"}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground italic">{po.remark || "--"}</TableCell>
                          <TableCell className="text-right text-[10px] font-mono text-muted-foreground">
                            {gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-[10px] font-mono text-muted-foreground">
                            {disc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-[10px] font-bold font-mono text-foreground">
                            {net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs italic">
                        No data to print.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredData.length > 0 && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={4} className="text-right text-[10px] font-bold uppercase tracking-wider text-foreground">
                        Total
                      </TableCell>
                      <TableCell className="text-right text-[10px] font-bold font-mono text-foreground">
                        {previewTotals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-[10px] font-bold font-mono text-foreground">
                        {previewTotals.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-[10px] font-bold font-mono text-foreground">
                        {previewTotals.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end gap-3 shrink-0 pt-2 pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={filteredData.length === 0}
              onClick={() => {
                generatePOSummaryPDF(filteredData, suppliers);
                setIsPreviewOpen(false);
              }}
              className="text-xs font-semibold gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 mb-0.5" />
              Confirm & Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}