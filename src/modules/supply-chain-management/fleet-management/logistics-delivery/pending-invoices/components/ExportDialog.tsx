"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Download, Loader2, CircleHelp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subDays, addDays, startOfYear, endOfYear } from "date-fns";
import type { PendingInvoiceOptions } from "../types";
import { Input } from "@/components/ui/input";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const API_BASE = "/api/scm/fleet-management/logistics-delivery/pending-invoices";

function yyyyMMdd(d: Date) {
  return format(d, "yyyy-MM-dd");
}
function money(n: number) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Preset = "All Time" | "Yesterday" | "Today" | "Tomorrow" | "This Week" | "This Month" | "This Year" | "Custom";

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {value === "All" ? label : options.find((opt) => opt.value === value)?.label || label}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="All"
                onSelect={() => {
                  onChange("All");
                  setOpen(false);
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === "All" ? "opacity-100" : "opacity-0")} />
                All
              </CommandItem>

              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ExportDialog({ open, onClose, options }: { open: boolean; onClose: () => void; options: PendingInvoiceOptions | null }) {
  const [salesmanId, setSalesmanId] = React.useState<string>("All");
  const [customerCode, setCustomerCode] = React.useState<string>("All");
  const [status, setStatus] = React.useState<string>("All");

  const [preset, setPreset] = React.useState<Preset>("All Time");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  const [isExporting, setIsExporting] = React.useState(false);

  const salesmanOptions = React.useMemo(() => {
    return (options?.salesmen ?? []).map((s) => {
      const parts = s.label.split(" - ");
      let displayName = parts.length > 1 ? parts.slice(1).join(" - ").trim() : s.label;
      if (!displayName) displayName = parts[0].trim();
      return { value: String(s.id), label: displayName };
    });
  }, [options?.salesmen]);

  const customerOptions = React.useMemo(() => {
    return (options?.customers ?? []).map((c) => ({ value: c.code, label: c.label }));
  }, [options?.customers]);

  React.useEffect(() => {
    const now = new Date();
    if (preset === "All Time") {
      setDateFrom("");
      setDateTo("");
    } else if (preset === "Yesterday") {
      setDateFrom(yyyyMMdd(subDays(now, 1)));
      setDateTo(yyyyMMdd(subDays(now, 1)));
    } else if (preset === "Today") {
      setDateFrom(yyyyMMdd(now));
      setDateTo(yyyyMMdd(now));
    } else if (preset === "Tomorrow") {
      setDateFrom(yyyyMMdd(addDays(now, 1)));
      setDateTo(yyyyMMdd(addDays(now, 1)));
    } else if (preset === "This Month") {
      setDateFrom(yyyyMMdd(startOfMonth(now)));
      setDateTo(yyyyMMdd(endOfMonth(now)));
    } else if (preset === "This Year") {
      setDateFrom(yyyyMMdd(startOfYear(now)));
      setDateTo(yyyyMMdd(endOfYear(now)));
    } else if (preset === "This Week") {
      setDateFrom(yyyyMMdd(subDays(now, 3)));
      setDateTo(yyyyMMdd(addDays(now, 3)));
    }
  }, [preset]);

  async function loadReportRows() {
    const p = new URLSearchParams();
    if (status !== "All") p.set("status", status);
    if (salesmanId !== "All") p.set("salesmanId", salesmanId);
    if (customerCode !== "All") p.set("customerCode", customerCode);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);

    p.set("page", "1");
    p.set("pageSize", "100000");

    const res = await fetch(`${API_BASE}?${p.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch report data");
    const json = await res.json();
    return Array.isArray(json?.rows) ? json.rows : [];
  }

  async function handleExport() {
    try {
      setIsExporting(true);

      const rows = await loadReportRows();
      if (rows.length === 0) {
        toast.error("I can't find any data with those filters.", {
          icon: <CircleHelp className="h-5 w-5 text-red-500" />,
          className: "!border-red-500 !border bg-white",
        });
        return;
      }

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text("Pending Invoice Report", 40, 40);
      doc.setFontSize(10);

      const dateStr = preset === "All Time" ? "All Time" : `${dateFrom} to ${dateTo}`;
      doc.text(`Range: ${dateStr} | Status: ${status}`, 40, 55);

      const body = rows.map((r: Record<string, unknown>) => [
        r.invoice_no,
        r.invoice_date,
        String(r.customer ?? "").substring(0, 30),
        String(r.salesman ?? "").substring(0, 20),
        money(Number(r.net_amount || 0)),
        r.dispatch_plan === "unlinked" ? "-" : String(r.dispatch_plan || ""),
        String(r.pending_status || ""),
      ]);

      autoTable(doc, {
        startY: 70,
        head: [["Invoice No", "Date", "Customer", "Salesman", "Net Amount", "Plan", "Status"]],
        body,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [20, 20, 20] },
        columnStyles: { 4: { halign: "right" } },
      });

      doc.save(`PendingInvoices-${preset}.pdf`);

      onClose();
      toast.success("Report Generated", {
        description: "Your PDF has been downloaded.",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        className: "!border-green-500 !border bg-white",
      });
    } catch (e) {
      console.error(e);
      toast.error("Export Failed", {
        description: "An error occurred while generating the report. Please try again.",
        className: "!border-red-500 !border bg-white",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[700px] p-0 overflow-visible gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold">What needs to be printed?</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Filters select the criteria for the printed report.</p>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Salesman</label>
            <SearchableSelect label="All Salesmen" placeholder="Search salesman..." value={salesmanId} onChange={setSalesmanId} options={salesmanOptions} />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Customer</label>
            <SearchableSelect label="All Customers" placeholder="Search customer..." value={customerCode} onChange={setCustomerCode} options={customerOptions} />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["All", "Unlinked", "For Dispatch", "Inbound", "Cleared"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "All" ? "All Statuses (Full Matrix)" : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Date Range</label>
            <div className="flex flex-wrap gap-2">
              {["All Time", "Today", "Tomorrow", "This Week", "This Month", "This Year", "Custom"].map((p) => (
                <Button
                  key={p}
                  variant={preset === p ? "default" : "outline"}
                  onClick={() => setPreset(p as Preset)}
                  className={preset === p ? "" : "text-muted-foreground"}
                  size="sm"
                >
                  {p}
                </Button>
              ))}
            </div>

            {preset === "Custom" && (
              <div className="flex gap-4 pt-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-muted/30 p-4 border-t gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2 min-w-[140px]">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
