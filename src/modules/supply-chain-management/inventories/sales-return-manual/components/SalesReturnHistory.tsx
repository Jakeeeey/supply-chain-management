"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreHorizontal,
  ChevronsLeft,
  ChevronsRight,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SalesReturn } from "../type";

interface SalesReturnHistoryProps {
  data: SalesReturn[];
  loading: boolean;
  page: number;
  totalPages: number;
  filters: { salesman: string; customer: string; status: string };
  salesmenOptions: { value: string; label: string }[];
  customerOptions: { value: string; label: string }[];
  onPageChange: (page: number) => void;
  onSearchChange: (term: string) => void;
  onFilterChange: (filters: {
    salesman: string;
    customer: string;
    status: string;
  }) => void;
  onRowClick: (record: SalesReturn) => void;
}

export function SalesReturnHistory({
  data,
  loading,
  page,
  totalPages,
  filters,
  salesmenOptions,
  customerOptions,
  onPageChange,
  onSearchChange,
  onFilterChange,
  onRowClick,
}: SalesReturnHistoryProps) {
  // --- STATE FOR CUSTOM DROPDOWNS ---
  const [isSalesmanOpen, setIsSalesmanOpen] = useState(false);
  const [salesmanSearch, setSalesmanSearch] = useState("");
  const salesmanRef = useRef<HTMLDivElement>(null);

  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const customerRef = useRef<HTMLDivElement>(null);

  // --- CLICK OUTSIDE LISTENER ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        salesmanRef.current &&
        !salesmanRef.current.contains(event.target as Node)
      ) {
        setIsSalesmanOpen(false);
      }
      if (
        customerRef.current &&
        !customerRef.current.contains(event.target as Node)
      ) {
        setIsCustomerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HELPERS ---
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "received":
        return "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20";
      case "pending":
        return "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const handleReset = () => {
    onFilterChange({
      salesman: "All",
      customer: "All",
      status: "All",
    });
    setSalesmanSearch("");
    setCustomerSearch("");
    onSearchChange("");
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (page <= 3) pageNumbers.push(1, 2, 3, "...", totalPages);
      else if (page >= totalPages - 2)
        pageNumbers.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      else
        pageNumbers.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pageNumbers;
  };

  // Filter the options based on the internal search inputs
  const filteredSalesmen = salesmenOptions.filter((s) =>
    s.label.toLowerCase().includes(salesmanSearch.toLowerCase()),
  );
  const filteredCustomers = customerOptions.filter((c) =>
    c.label.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  // Helper to get selected label for the button text
  const getSelectedLabel = (
    options: { value: string; label: string }[],
    currentValue: string,
    placeholder: string,
  ) => {
    if (currentValue === "All" || !currentValue) return placeholder;
    return (
      options.find((o) => o.value.toString() === currentValue)?.label ||
      placeholder
    );
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* --- 1. SEARCH BAR --- */}
      <div className="bg-background p-1 rounded-xl border border-primary/20 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search return #, invoice, customer..."
            className="pl-10 h-11 border-none focus-visible:ring-0 text-base"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* --- 2. FILTERS CONTAINER --- */}
      <div className="bg-background p-5 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-end w-full">
          {/* SALESMAN FILTER (Custom Searchable) */}
          <div
            className="w-full md:flex-1 space-y-1.5 relative"
            ref={salesmanRef}
          >
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Salesman
            </label>
            <div
              className="h-10 w-full bg-muted/30 border border-border rounded-md flex items-center justify-between px-3 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setIsSalesmanOpen(!isSalesmanOpen)}
            >
              <span className="text-sm text-foreground truncate">
                {getSelectedLabel(
                  salesmenOptions,
                  filters.salesman,
                  "All Salesmen",
                )}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>

            {/* Dropdown Content */}
            {isSalesmanOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-lg max-h-[300px] flex flex-col">
                <div className="p-2 border-b border-border sticky top-0 bg-background z-10">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      className="w-full h-8 pl-8 pr-2 text-xs bg-muted/30 border border-border rounded-sm focus:outline-none focus:border-primary"
                      placeholder="Search salesman..."
                      value={salesmanSearch}
                      onChange={(e) => setSalesmanSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-1">
                  <div
                    className={cn(
                      "px-2 py-1.5 text-sm rounded-sm cursor-pointer flex items-center justify-between",
                      filters.salesman === "All"
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/30 text-foreground",
                    )}
                    onClick={() => {
                      onFilterChange({ ...filters, salesman: "All" });
                      setIsSalesmanOpen(false);
                    }}
                  >
                    All Salesmen
                    {filters.salesman === "All" && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  {filteredSalesmen.map((s) => (
                    <div
                      key={s.value}
                      className={cn(
                        "px-2 py-1.5 text-sm rounded-sm cursor-pointer flex items-center justify-between",
                        filters.salesman === s.value.toString()
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/30 text-foreground",
                      )}
                      onClick={() => {
                        onFilterChange({
                          ...filters,
                          salesman: s.value.toString(),
                        });
                        setIsSalesmanOpen(false);
                      }}
                    >
                      {s.label}
                      {filters.salesman === s.value.toString() && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  ))}
                  {filteredSalesmen.length === 0 && (
                    <div className="p-2 text-xs text-center text-muted-foreground">
                      No results found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CUSTOMER FILTER (Custom Searchable) */}
          <div
            className="w-full md:flex-1 space-y-1.5 relative"
            ref={customerRef}
          >
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Customer
            </label>
            <div
              className="h-10 w-full bg-muted/30 border border-border rounded-md flex items-center justify-between px-3 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setIsCustomerOpen(!isCustomerOpen)}
            >
              <span className="text-sm text-foreground truncate">
                {getSelectedLabel(
                  customerOptions,
                  filters.customer,
                  "All Customers",
                )}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>

            {/* Dropdown Content */}
            {isCustomerOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-lg max-h-[300px] flex flex-col">
                <div className="p-2 border-b border-border sticky top-0 bg-background z-10">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      className="w-full h-8 pl-8 pr-2 text-xs bg-muted/30 border border-border rounded-sm focus:outline-none focus:border-primary"
                      placeholder="Search customer..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-1">
                  <div
                    className={cn(
                      "px-2 py-1.5 text-sm rounded-sm cursor-pointer flex items-center justify-between",
                      filters.customer === "All"
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/30 text-foreground",
                    )}
                    onClick={() => {
                      onFilterChange({ ...filters, customer: "All" });
                      setIsCustomerOpen(false);
                    }}
                  >
                    All Customers
                    {filters.customer === "All" && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  {filteredCustomers.map((c) => (
                    <div
                      key={c.value}
                      className={cn(
                        "px-2 py-1.5 text-sm rounded-sm cursor-pointer flex items-center justify-between",
                        filters.customer === c.value
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/30 text-foreground",
                      )}
                      onClick={() => {
                        onFilterChange({ ...filters, customer: c.value });
                        setIsCustomerOpen(false);
                      }}
                    >
                      {c.label}
                      {filters.customer === c.value && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="p-2 text-xs text-center text-muted-foreground">
                      No results found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STATUS FILTER (Standard Select is fine here as options are few) */}
          <div className="w-full md:flex-1 space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Status
            </label>
            <Select
              value={filters.status}
              onValueChange={(val) =>
                onFilterChange({ ...filters, status: val })
              }
            >
              <SelectTrigger className="h-10 bg-muted/30 border-border text-foreground text-sm focus:ring-primary/20 w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Button */}
          <div className="w-full md:w-auto pb-0.5">
            <Button
              variant="ghost"
              onClick={handleReset}
              className="w-full md:w-auto h-9 px-4 text-primary hover:text-primary hover:bg-primary/10 font-medium text-sm transition-colors whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5 mr-1.5" /> Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* --- 3. DATA TABLE --- */}
      <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-foreground pl-6 w-[140px] h-12">
                  Return No.
                </TableHead>
                <TableHead className="font-bold text-foreground min-w-[180px] h-12">
                  Salesman
                </TableHead>
                <TableHead className="font-bold text-foreground min-w-[220px] h-12">
                  Customer
                </TableHead>
                <TableHead className="font-bold text-foreground w-[120px] h-12">
                  Date
                </TableHead>
                <TableHead className="font-bold text-foreground text-right w-[120px] h-12">
                  Total Amount
                </TableHead>

                {/* 🟢 CENTERED STATUS HEADER */}
                <TableHead className="font-bold text-foreground text-center w-[120px] h-12">
                  Status
                </TableHead>

                <TableHead className="font-bold text-foreground min-w-[200px] h-12">
                  Remarks
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Loading records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-64 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p>No return records found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group cursor-pointer hover:bg-muted/60 transition-colors border-b last:border-0"
                    onClick={() => onRowClick(row)}
                  >
                    <TableCell className="py-4 pl-6 font-semibold text-primary group-hover:text-primary transition-colors">
                      {row.returnNo}
                    </TableCell>

                    <TableCell className="py-4 text-foreground font-medium">
                      <div
                        className="truncate w-full max-w-[220px]"
                        title={row.salesmanName}
                      >
                        {row.salesmanName || "-"}
                      </div>
                    </TableCell>

                    <TableCell className="py-4 font-medium text-foreground">
                      <div
                        className="truncate w-full max-w-[300px]"
                        title={row.customerName}
                      >
                        {row.customerName || row.customerCode}
                      </div>
                    </TableCell>

                    <TableCell className="py-4 text-muted-foreground text-sm">
                      {row.returnDate}
                    </TableCell>

                    <TableCell className="py-4 text-right font-bold text-foreground">
                      {row.totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    {/* 🟢 CENTERED STATUS CELL */}
                    <TableCell className="py-4">
                      <div className="flex w-full justify-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium shadow-sm px-2.5 py-0.5 rounded-full border",
                            getStatusColor(row.status),
                          )}
                        >
                          {row.status}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 text-muted-foreground text-xs italic">
                      <div
                        className="truncate w-full max-w-[250px]"
                        title={row.remarks}
                      >
                        {row.remarks || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* --- 4. PAGINATION --- */}
        <div className="p-4 border-t border-border bg-background flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-0 z-20">
          <div className="text-sm text-muted-foreground">
            Showing page{" "}
            <span className="font-bold text-foreground">{page}</span> of{" "}
            <span className="font-bold text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(1)}
              disabled={page === 1 || loading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center px-2">
              {getPageNumbers().map((pNum, idx) => (
                <React.Fragment key={idx}>
                  {pNum === "..." ? (
                    <span className="text-xs text-muted-foreground mx-1">...</span>
                  ) : (
                    <button
                      onClick={() => onPageChange(Number(pNum))}
                      disabled={loading}
                      className={cn(
                        "w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-colors mx-0.5",
                        page === pNum
                          ? "bg-muted text-white shadow-sm"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {pNum}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages || loading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
