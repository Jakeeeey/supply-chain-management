import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";

export const SalesReturnFilters = ({ logic }: { logic: any }) => {
  const {
    options,
    filters,
    setFilters,
    quickRange,
    setQuickRange,
    dateRange,
    setDateRange,
    loading,
    setPagination,
  } = logic;

  // Helper to reset pagination when filter changes
  const handleFilterChange = (key: string, val: string) => {
    setFilters((prev: any) => ({ ...prev, [key]: val }));
    setPagination((prev: any) => ({ ...prev, page: 1 }));
  };

  // Helper for date inputs to switch to 'custom' mode automatically
  const handleDateChange = (key: "from" | "to", val: string) => {
    setQuickRange("custom");
    setDateRange((prev: any) => ({ ...prev, [key]: val }));
    setPagination((prev: any) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setQuickRange("thismonth");
    setFilters({
      search: "",
      customerCode: "All",
      salesmanId: "All",
      status: "All",
      supplierName: "All",
      returnCategory: "All",
    });
    setPagination({ page: 1, limit: 10 });
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
      {/* Row 1: Search & Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Search
          </label>
          <Input
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            placeholder="Search Return no."
            className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Quick Range
          </label>
          <Select
            value={quickRange}
            onValueChange={(v) => {
              setQuickRange(v);
              setPagination((p: any) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="lastday">Last Day</SelectItem>
              <SelectItem value="thisweek">This Week</SelectItem>
              <SelectItem value="thismonth">This Month</SelectItem>
              <SelectItem value="thisyear">This Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Date From
          </label>
          <Input
            type="date"
            value={dateRange.from}
            onChange={(e) => handleDateChange("from", e.target.value)}
            className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Date To
          </label>
          <Input
            type="date"
            value={dateRange.to}
            onChange={(e) => handleDateChange("to", e.target.value)}
            className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-10 w-full dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={resetFilters}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>
      </div>

      {/* Row 2: Dropdowns - 🟢 REVISED LAYOUT (5 Columns for perfect alignment) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Customer */}
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Customer
          </label>
          <SearchableSelect
            options={options.customers}
            value={filters.customerCode}
            onChange={(v) => handleFilterChange("customerCode", v)}
            placeholder="All Customers"
          />
        </div>

        {/* 2. Salesman */}
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Salesman
          </label>
          <SearchableSelect
            options={options.salesmen}
            value={filters.salesmanId}
            onChange={(v) => handleFilterChange("salesmanId", v)}
            placeholder="All Salesmen"
          />
        </div>

        {/* 3. Supplier (🟢 Swapped Position) */}
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Supplier
          </label>
          <SearchableSelect
            options={options.suppliers.map((s: any) => ({
              value: s.name,
              label: s.name,
            }))}
            value={filters.supplierName}
            onChange={(v) => handleFilterChange("supplierName", v)}
            placeholder="All Suppliers"
          />
        </div>

        {/* 4. Status (🟢 Swapped Position) */}
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Status
          </label>
          <Select
            value={filters.status}
            onValueChange={(v) => handleFilterChange("status", v)}
          >
            <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Received">Received</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 5. Return Type */}
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Return Type
          </label>
          <Select
            value={filters.returnCategory}
            onValueChange={(v) => handleFilterChange("returnCategory", v)}
          >
            <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
              <SelectItem value="All">All Types</SelectItem>
              {options.returnTypes.map((t: any) => (
                <SelectItem key={t.type_name} value={t.type_name}>
                  {t.type_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
