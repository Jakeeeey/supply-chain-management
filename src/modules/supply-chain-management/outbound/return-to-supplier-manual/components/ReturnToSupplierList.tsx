"use client";

import React, { useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  FileDown,
  RotateCcw,
  Filter,
  ChevronsUpDown,
  Check,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui/new-data-table";

import { CreateReturnModal } from "./CreateReturnModal";
import { ReturnDetailsModal } from "./ReturnDetailsModal";
import { ExportReportModal } from "./ExportReportModal";

import type { ReturnToSupplier } from "../types/rts.schema";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

const columns: ColumnDef<ReturnToSupplier>[] = [
  {
    accessorKey: "returnNo",
    header: "Return No.",
    meta: { label: "Return No." },
    cell: ({ row }) => (
      <span className="font-mono text-sm font-bold text-primary hover:underline cursor-pointer">
        {row.original.returnNo}
      </span>
    ),
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    meta: { label: "Supplier" },
    cell: ({ row }) => (
      <span className="text-sm font-medium truncate max-w-[200px] block">
        {row.original.supplier}
      </span>
    ),
  },
  {
    accessorKey: "branch",
    header: "Branch",
    meta: { label: "Branch" },
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
        {row.original.branch}
      </span>
    ),
  },
  {
    accessorKey: "returnDate",
    header: "Date",
    meta: { label: "Date" },
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.returnDate).toLocaleDateString()}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-bold uppercase px-2 py-0.5",
          row.original.status === "Posted"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200",
        )}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "grossAmount",
    header: () => <div className="text-right">Gross</div>,
    meta: { label: "Gross" },
    cell: ({ row }) => (
      <div className="text-right text-sm text-muted-foreground">
        ₱{" "}
        {row.original.grossAmount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    ),
  },
  {
    accessorKey: "discountAmount",
    header: () => <div className="text-right">Discount</div>,
    meta: { label: "Discount" },
    cell: ({ row }) => (
      <div className="text-right text-sm">
        {row.original.discountAmount > 0
          ? `₱ ${row.original.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right">Net Amount</div>,
    meta: { label: "Net Amount" },
    cell: ({ row }) => (
      <div className="text-right font-bold text-sm">
        ₱{" "}
        {row.original.totalAmount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    ),
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

interface ReturnToSupplierListProps {
  data: ReturnToSupplier[];
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * Main list view for Return-to-Supplier transactions.
 * Uses the shared DataTable component with column definitions.
 * Provides filtering (supplier, branch, status) and action modals.
 */
export function ReturnToSupplierList({
  data,
  isLoading,
  onRefresh,
}: ReturnToSupplierListProps) {
  // ----- Filter State -----
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");

  // ----- Modal State -----
  const [showCreate, setShowCreate] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [detailData, setDetailData] = useState<ReturnToSupplier | null>(null);

  // ----- Derived Filter Lists -----
  const uniqueSuppliers = useMemo(() => {
    const set = new Set(data.map((d) => d.supplier));
    return Array.from(set).sort();
  }, [data]);

  const uniqueBranches = useMemo(() => {
    const set = new Set(data.map((d) => d.branch));
    return Array.from(set).sort();
  }, [data]);

  const filteredSupplierList = useMemo(
    () =>
      supplierSearch
        ? uniqueSuppliers.filter((s) =>
            s.toLowerCase().includes(supplierSearch.toLowerCase()),
          )
        : uniqueSuppliers,
    [uniqueSuppliers, supplierSearch],
  );

  const filteredBranchList = useMemo(
    () =>
      branchSearch
        ? uniqueBranches.filter((b) =>
            b.toLowerCase().includes(branchSearch.toLowerCase()),
          )
        : uniqueBranches,
    [uniqueBranches, branchSearch],
  );

  // ----- Filtered Data (supplier, branch, status only — search is handled by DataTable) -----
  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchesSupplier =
        filterSupplier === "all" || item.supplier === filterSupplier;
      const matchesBranch =
        filterBranch === "all" || item.branch === filterBranch;
      const matchesStatus =
        filterStatus === "all" || item.status === filterStatus;

      return matchesSupplier && matchesBranch && matchesStatus;
    });
  }, [data, filterSupplier, filterBranch, filterStatus]);

  const hasActiveFilters =
    filterSupplier !== "all" || filterBranch !== "all" || filterStatus !== "all";

  const clearFilters = () => {
    setFilterSupplier("all");
    setFilterBranch("all");
    setFilterStatus("all");
  };

  // ----- Click-through columns (open detail on row click) -----
  const clickableColumns: ColumnDef<ReturnToSupplier>[] = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        cell: (props: any) => (
          <div
            onClick={() => setDetailData(props.row.original)}
            className="cursor-pointer"
          >
            {typeof col.cell === "function"
              ? col.cell(props)
              : props.getValue()}
          </div>
        ),
      })),
    [],
  );

  return (
    <div className="space-y-4">
      {/* ===== FILTER BAR ===== */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* Filter: Supplier Combobox */}
        <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-[220px] justify-between h-10"
            >
              <span className="truncate">
                {filterSupplier === "all" ? "All Suppliers" : filterSupplier}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search supplier..."
                value={supplierSearch}
                onValueChange={setSupplierSearch}
              />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>No supplier found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setFilterSupplier("all");
                      setOpenSupplier(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filterSupplier === "all" ? "opacity-100" : "opacity-0",
                      )}
                    />
                    All Suppliers
                  </CommandItem>
                  {filteredSupplierList.map((s) => (
                    <CommandItem
                      key={s}
                      onSelect={() => {
                        setFilterSupplier(s);
                        setOpenSupplier(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filterSupplier === s ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {s}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filter: Branch Combobox */}
        <Popover open={openBranch} onOpenChange={setOpenBranch}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-[220px] justify-between h-10"
            >
              <span className="truncate">
                {filterBranch === "all" ? "All Branches" : filterBranch}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search branch..."
                value={branchSearch}
                onValueChange={setBranchSearch}
              />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>No branch found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setFilterBranch("all");
                      setOpenBranch(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filterBranch === "all" ? "opacity-100" : "opacity-0",
                      )}
                    />
                    All Branches
                  </CommandItem>
                  {filteredBranchList.map((b) => (
                    <CommandItem
                      key={b}
                      onSelect={() => {
                        setFilterBranch(b);
                        setOpenBranch(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filterBranch === b ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {b}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filter: Status */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Posted">Posted</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="h-10 text-muted-foreground"
          >
            <Filter className="mr-2 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {/* ===== DATA TABLE ===== */}
      <DataTable
        columns={clickableColumns}
        data={filtered}
        searchKey="returnNo"
        isLoading={isLoading}
        emptyTitle="No returns found"
        emptyDescription={
          hasActiveFilters
            ? "Try adjusting your filters."
            : "No Return-to-Supplier transactions yet."
        }
        actionComponent={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-10"
            >
              <RotateCcw
                className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowExport(true)}
              className="h-10"
            >
              <FileDown className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button
              onClick={() => setShowCreate(true)}
              className="h-10"
            >
              <Plus className="mr-2 h-4 w-4" /> Create Return
            </Button>
          </div>
        }
      />

      {/* ===== MODALS ===== */}
      <CreateReturnModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onReturnCreated={onRefresh}
      />

      <ReturnDetailsModal
        isOpen={!!detailData}
        onClose={() => setDetailData(null)}
        data={detailData}
        onUpdateSuccess={onRefresh}
      />

      <ExportReportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        allData={data}
      />
    </div>
  );
}
