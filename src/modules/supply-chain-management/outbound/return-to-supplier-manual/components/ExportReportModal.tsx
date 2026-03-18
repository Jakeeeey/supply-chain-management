"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
// Removed useReactToPrint
import { Printer, X, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getReferences } from "../providers/fetchProviders";
import { PrintableReportSummary } from "./PrintableReportSummary";
import type { ReturnToSupplier } from "../types/rts.schema";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allData: ReturnToSupplier[];
}

interface SelectionSupplier {
  id: number;
  supplier_name: string;
}

interface SelectionBranch {
  id: number;
  branch_name: string;
}

export function ExportReportModal({
  isOpen,
  onClose,
  allData,
}: ExportReportModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState("thisMonth");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [supplierId, setSupplierId] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [status, setStatus] = useState("all");
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [refs, setRefs] = useState<{ suppliers: SelectionSupplier[]; branches: SelectionBranch[] }>({
    suppliers: [],
    branches: [],
  });

  useEffect(() => {
    if (isOpen) {
      getReferences().then((data) => {
        setRefs({ suppliers: data.suppliers, branches: data.branches });
      });
    }
  }, [isOpen]);

  const filteredSuppliers = refs.suppliers.filter((s) =>
    s.supplier_name.toLowerCase().includes(supplierSearch.toLowerCase()),
  );
  const filteredBranches = refs.branches.filter((b) =>
    b.branch_name.toLowerCase().includes(branchSearch.toLowerCase()),
  );

  const filteredData = useMemo(() => {
    return allData.filter((item) => {
      const itemDate = new Date(item.returnDate);
      const now = new Date();
      let dateMatch = true;

      if (dateRange === "today") {
        dateMatch = itemDate.toDateString() === now.toDateString();
      } else if (dateRange === "tomorrow") {
        const tmrw = new Date(now);
        tmrw.setDate(tmrw.getDate() + 1);
        dateMatch = itemDate.toDateString() === tmrw.toDateString();
      } else if (dateRange === "thisWeek") {
        const first = new Date(now.setDate(now.getDate() - now.getDay()));
        const last = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        dateMatch = itemDate >= first && itemDate <= last;
      } else if (dateRange === "thisMonth") {
        dateMatch =
          itemDate.getMonth() === new Date().getMonth() &&
          itemDate.getFullYear() === new Date().getFullYear();
      } else if (dateRange === "thisYear") {
        dateMatch = itemDate.getFullYear() === new Date().getFullYear();
      } else if (dateRange === "custom") {
        if (customStart && customEnd) {
          const start = new Date(customStart);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999);
          dateMatch = itemDate >= start && itemDate <= end;
        } else {
          dateMatch = false;
        }
      }

      let supplierMatch = true;
      if (supplierId !== "all") {
        const supObj = refs.suppliers.find((s) => String(s.id) === supplierId);
        if (supObj) supplierMatch = item.supplier === supObj.supplier_name;
      }

      let branchMatch = true;
      if (branchId !== "all") {
        const branchObj = refs.branches.find((b) => String(b.id) === branchId);
        if (branchObj) branchMatch = item.branch === branchObj.branch_name;
      }

      let statusMatch = true;
      if (status !== "all") {
        statusMatch = item.status === status;
      }

      return dateMatch && supplierMatch && branchMatch && statusMatch;
    });
  }, [
    allData,
    dateRange,
    customStart,
    customEnd,
    supplierId,
    branchId,
    status,
    refs,
  ]);

  // ✅ NEW: Handle Preview in New Tab
  const handlePreview = () => {
    if (!componentRef.current) return;

    const content = componentRef.current.innerHTML;
    const printWindow = window.open("", "_blank");

    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>RTS Summary Report Preview</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { background-color: #f8fafc; padding: 40px; }
              @media print {
                body { background-color: white; padding: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end;">
               <button onclick="window.print()" style="background-color: #0f172a; color: white; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none;">🖨️ Print Now</button>
               <button onclick="window.close()" style="background-color: white; color: #64748b; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">Close</button>
            </div>
            <div style="background: white; padding: 40px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px;">
              ${content}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[600px] bg-background p-0 gap-0 border shadow-xl sm:rounded-xl overflow-visible [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-xl font-bold">
              What needs to be printed?
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Filter select the criteria for the printed report.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* 1. Supplier & Branch (Searchable) */}
          <div className="grid grid-cols-2 gap-6">
            {/* Supplier Combobox */}
            <div className="space-y-2 flex flex-col">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Supplier
              </Label>
              <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-background text-foreground h-10 px-3"
                  >
                    <span className="truncate flex-1 text-left">
                      {supplierId === "all"
                        ? "All Suppliers"
                        : refs.suppliers.find(
                            (s) => String(s.id) === supplierId,
                          )?.supplier_name || "Select Supplier"}
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
                    <CommandList
                      className="max-h-[200px] overflow-y-auto"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <CommandEmpty>No supplier found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSupplierId("all");
                            setOpenSupplier(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              supplierId === "all"
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          All Suppliers
                        </CommandItem>
                        {filteredSuppliers.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={String(s.id)}
                            onSelect={() => {
                              setSupplierId(String(s.id));
                              setOpenSupplier(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                supplierId === String(s.id)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {s.supplier_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Branch Combobox */}
            <div className="space-y-2 flex flex-col">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Branch
              </Label>
              <Popover open={openBranch} onOpenChange={setOpenBranch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-background text-foreground h-10 px-3"
                  >
                    <span className="truncate flex-1 text-left">
                      {branchId === "all"
                        ? "All Branches"
                        : refs.branches.find((b) => String(b.id) === branchId)
                            ?.branch_name || "Select Branch"}
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
                    <CommandList
                      className="max-h-[200px] overflow-y-auto"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setBranchId("all");
                            setOpenBranch(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              branchId === "all" ? "opacity-100" : "opacity-0",
                            )}
                          />
                          All Branches
                        </CommandItem>
                        {filteredBranches.map((b) => (
                          <CommandItem
                            key={b.id}
                            value={String(b.id)}
                            onSelect={() => {
                              setBranchId(String(b.id));
                              setOpenBranch(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                branchId === String(b.id)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {b.branch_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Date Range
            </Label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "All Time", value: "all" },
                { label: "Today", value: "today" },
                { label: "Tomorrow", value: "tomorrow" },
                { label: "This Week", value: "thisWeek" },
                { label: "This Month", value: "thisMonth" },
                { label: "This Year", value: "thisYear" },
                { label: "Custom", value: "custom" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDateRange(opt.value)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
                    dateRange === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {dateRange === "custom" && (
              <div className="flex items-center gap-4 mt-3 bg-muted/30 p-4 rounded-lg border">
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    From
                  </Label>
                  <Input
                    type="date"
                    className="h-9 bg-background"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    To
                  </Label>
                  <Input
                    type="date"
                    className="h-9 bg-background"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Status
            </Label>
            <div className="w-1/2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 bg-background text-foreground">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Posted">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3 bg-muted/30 rounded-b-xl">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 px-6 text-foreground"
          >
            Cancel
          </Button>
          {/* ✅ UPDATE: Calls handlePreview instead of handlePrint */}
          <Button
            className="h-11 px-8 shadow-lg shadow-primary/10"
            onClick={() => handlePreview()}
          >
            <Printer className="w-4 h-4 mr-2" /> Export / Preview
          </Button>
        </div>
      </DialogContent>

      <div style={{ position: "absolute", top: "-10000px", left: "-10000px" }}>
        <PrintableReportSummary
          ref={componentRef}
          data={filteredData}
          filters={{
            dateRange: dateRange,
            supplier:
              supplierId === "all"
                ? "All Suppliers"
                : refs.suppliers.find((s) => String(s.id) === supplierId)
                    ?.supplier_name || "Unknown Supplier",
            branch:
              branchId === "all"
                ? "All Branches"
                : refs.branches.find((b) => String(b.id) === branchId)
                    ?.branch_name || "Unknown Branch",
            status: status,
            customStart,
            customEnd,
          }}
        />
      </div>
    </Dialog>
  );
}
