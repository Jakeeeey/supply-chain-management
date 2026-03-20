"use client";

import React, { useState, useMemo } from "react";
import { ColumnDef, CellContext } from "@tanstack/react-table";
import {
  RotateCcw,
  Filter,
  ChevronsUpDown,
  Check,
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

import { SalesReturn } from "../type";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

const columns: ColumnDef<SalesReturn>[] = [
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
    accessorKey: "salesmanName",
    header: "Salesman",
    meta: { label: "Salesman" },
    cell: ({ row }) => (
      <span
        className="text-sm font-medium truncate max-w-[200px] block"
        title={row.original.salesmanName}
      >
        {row.original.salesmanName || "-"}
      </span>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    meta: { label: "Customer" },
    cell: ({ row }) => (
      <span
        className="text-sm font-medium truncate max-w-[220px] block"
        title={row.original.customerName}
      >
        {row.original.customerName || row.original.customerCode}
      </span>
    ),
  },
  {
    accessorKey: "returnDate",
    header: "Date",
    meta: { label: "Date" },
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.returnDate}
      </span>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right">Total Amount</div>,
    meta: { label: "Total Amount" },
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
  {
    accessorKey: "status",
    header: () => <div className="text-center">Status</div>,
    meta: { label: "Status" },
    cell: ({ row }) => {
      const status = row.original.status?.toLowerCase();
      return (
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className={cn(
              "font-medium shadow-sm px-2.5 py-0.5 rounded-full border text-[10px] uppercase",
              status === "received"
                ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
                : status === "pending"
                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                  : "bg-muted text-foreground border-border",
            )}
          >
            {row.original.status}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "remarks",
    header: "Remarks",
    meta: { label: "Remarks" },
    cell: ({ row }) => (
      <span
        className="text-sm text-muted-foreground italic truncate max-w-[250px] block"
        title={row.original.remarks}
      >
        {row.original.remarks || "-"}
      </span>
    ),
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

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
  // --- Filter Dropdown State ---
  const [openSalesman, setOpenSalesman] = useState(false);
  const [openCustomer, setOpenCustomer] = useState(false);
  const [salesmanSearch, setSalesmanSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  // --- Derived Filter Lists ---
  const filteredSalesmenList = useMemo(
    () =>
      salesmanSearch
        ? salesmenOptions.filter((s) =>
            s.label.toLowerCase().includes(salesmanSearch.toLowerCase()),
          )
        : salesmenOptions,
    [salesmenOptions, salesmanSearch],
  );

  const filteredCustomerList = useMemo(
    () =>
      customerSearch
        ? customerOptions.filter((c) =>
            c.label.toLowerCase().includes(customerSearch.toLowerCase()),
          )
        : customerOptions,
    [customerOptions, customerSearch],
  );

  const hasActiveFilters =
    filters.salesman !== "All" ||
    filters.customer !== "All" ||
    filters.status !== "All";

  const clearFilters = () => {
    onFilterChange({ salesman: "All", customer: "All", status: "All" });
    setSalesmanSearch("");
    setCustomerSearch("");
    onSearchChange("");
  };

  // --- Clickable column wrapper (open detail on row click) ---
  const clickableColumns: ColumnDef<SalesReturn>[] = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        cell: (props: CellContext<SalesReturn, unknown>) => (
          <div
            onClick={() => onRowClick(props.row.original)}
            className="cursor-pointer"
          >
            {typeof col.cell === "function"
              ? (
                  col.cell as (
                    props: CellContext<SalesReturn, unknown>,
                  ) => React.ReactNode
                )(props)
              : (props.getValue() as React.ReactNode)}
          </div>
        ),
      })),
    [onRowClick],
  );

  // --- Selected labels for filter buttons ---
  const selectedSalesmanLabel =
    filters.salesman === "All"
      ? "All Salesmen"
      : salesmenOptions.find((s) => s.value === filters.salesman)?.label ||
        "All Salesmen";
  const selectedCustomerLabel =
    filters.customer === "All"
      ? "All Customers"
      : customerOptions.find((c) => c.value === filters.customer)?.label ||
        "All Customers";

  return (
    <div className="space-y-4">
      {/* ===== FILTER BAR ===== */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
        {/* Filter: Salesman Combobox */}
        <Popover open={openSalesman} onOpenChange={setOpenSalesman}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-[220px] justify-between h-10"
            >
              <span className="truncate">{selectedSalesmanLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search salesman..."
                value={salesmanSearch}
                onValueChange={setSalesmanSearch}
              />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>No salesman found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onFilterChange({ ...filters, salesman: "All" });
                      setOpenSalesman(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.salesman === "All"
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    All Salesmen
                  </CommandItem>
                  {filteredSalesmenList.map((s) => (
                    <CommandItem
                      key={s.value}
                      onSelect={() => {
                        onFilterChange({
                          ...filters,
                          salesman: s.value.toString(),
                        });
                        setOpenSalesman(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.salesman === s.value.toString()
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {s.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filter: Customer Combobox */}
        <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-[220px] justify-between h-10"
            >
              <span className="truncate">{selectedCustomerLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search customer..."
                value={customerSearch}
                onValueChange={setCustomerSearch}
              />
              <CommandList className="max-h-[200px]">
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onFilterChange({ ...filters, customer: "All" });
                      setOpenCustomer(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.customer === "All"
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    All Customers
                  </CommandItem>
                  {filteredCustomerList.map((c) => (
                    <CommandItem
                      key={c.value}
                      onSelect={() => {
                        onFilterChange({ ...filters, customer: c.value });
                        setOpenCustomer(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.customer === c.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {c.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Filter: Status Select */}
        <Select
          value={filters.status}
          onValueChange={(val) =>
            onFilterChange({ ...filters, status: val })
          }
        >
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Received">Received</SelectItem>
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
        data={data}
        searchKey="returnNo"
        onSearch={onSearchChange}
        isLoading={loading}
        manualPagination={true}
        pageCount={totalPages}
        pagination={{ pageIndex: page - 1, pageSize: 10 }}
        onPaginationChange={(p) => onPageChange(p.pageIndex + 1)}
        emptyTitle="No return records found"
        emptyDescription={
          hasActiveFilters
            ? "Try adjusting your filters."
            : "No Sales Return transactions yet."
        }
        actionComponent={
          <Button
            variant="outline"
            onClick={() => {
              clearFilters();
            }}
            disabled={loading}
            className="h-10"
          >
            <RotateCcw
              className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />
    </div>
  );
}
