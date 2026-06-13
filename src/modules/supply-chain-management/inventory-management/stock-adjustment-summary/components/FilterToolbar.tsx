"use client";

import React from "react";
import { useStockAdjustmentSummary } from "../hooks/useStockAdjustmentSummary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

export function FilterToolbar() {
  const {
    search,
    setSearch,
    branchId,
    setBranchId,
    supplierId,
    setSupplierId,
    type,
    setType,
    status,
    setStatus,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    resetFilters,
    branches,
    suppliers
  } = useStockAdjustmentSummary();

  // Transform branches for searchable dropdown
  const branchOptions = React.useMemo(() => {
    const opts = branches.map((b) => ({
      value: String(b.id),
      label: b.branch_name
    }));
    return [{ value: "all", label: "All Branches" }, ...opts];
  }, [branches]);

  // Transform suppliers for searchable dropdown
  const supplierOptions = React.useMemo(() => {
    const opts = suppliers.map((s) => ({
      value: String(s.id),
      label: s.supplier_name
    }));
    return [{ value: "all", label: "All Suppliers" }, ...opts];
  }, [suppliers]);

  const currentBranchValue = branchId ? String(branchId) : "all";
  const currentSupplierValue = supplierId ? String(supplierId) : "all";

  return (
    <Card className="border border-border/40 shadow-sm bg-card/65 backdrop-blur-sm rounded-xl">
      <CardContent className="p-4 flex flex-wrap items-end gap-4">
        
        {/* Search */}
        <div className="flex flex-col gap-1 w-64">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider pl-1">Search Details</span>
          <Input
            placeholder="Search by doc number..."
            className="h-9 text-xs border-border bg-background rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Branch Dropdown (Searchable) */}
        <div className="flex flex-col gap-1 w-52">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider pl-1">Branch</span>
          <SearchableSelect
            options={branchOptions}
            value={currentBranchValue}
            placeholder="Select Branch"
            className="h-9 text-xs font-semibold rounded-lg bg-background border-border text-foreground/80 text-left justify-between"
            onValueChange={(val) => {
              setBranchId(val === "all" ? undefined : Number(val));
            }}
          />
        </div>

        {/* Supplier Dropdown (Searchable) */}
        <div className="flex flex-col gap-1 w-52">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider pl-1">Supplier</span>
          <SearchableSelect
            options={supplierOptions}
            value={currentSupplierValue}
            placeholder="Select Supplier"
            className="h-9 text-xs font-semibold rounded-lg bg-background border-border text-foreground/80 text-left justify-between"
            onValueChange={(val) => {
              setSupplierId(val === "all" ? undefined : Number(val));
            }}
          />
        </div>

        {/* Type Dropdown */}
        <div className="flex flex-col gap-1 w-44">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider pl-1">Type</span>
          <select
            value={type || ""}
            onChange={(e) => setType(e.target.value as "IN" | "OUT" | undefined)}
            className="h-9 px-3 border border-border bg-background rounded-lg text-xs font-semibold text-foreground/80 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="IN">Stock In (+)</option>
            <option value="OUT">Stock Out (-)</option>
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="flex flex-col gap-1 w-44">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider pl-1">Status</span>
          <select
            value={status || ""}
            onChange={(e) => setStatus(e.target.value as "Posted" | "Unposted" | undefined)}
            className="h-9 px-3 border border-border bg-background rounded-lg text-xs font-semibold text-foreground/80 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Posted">Posted</option>
            <option value="Unposted">Unposted (Draft)</option>
          </select>
        </div>

        {/* From Date Filter */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider pl-1">From Date</span>
          <input
            type="date"
            className="h-9 px-3 border border-border bg-background rounded-lg text-xs font-semibold text-foreground/80 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            value={fromDate || ""}
            onChange={(e) => setFromDate(e.target.value || undefined)}
          />
        </div>

        {/* To Date Filter */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider pl-1">To Date</span>
          <input
            type="date"
            className="h-9 px-3 border border-border bg-background rounded-lg text-xs font-semibold text-foreground/80 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            value={toDate || ""}
            onChange={(e) => setToDate(e.target.value || undefined)}
          />
        </div>

        <Button
          variant="ghost"
          onClick={resetFilters}
          className="h-9 px-4 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg"
        >
          Reset
        </Button>
      </CardContent>
    </Card>
  );
}
