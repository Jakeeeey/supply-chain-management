"use client";

import React, { useState, useMemo } from "react";
import { FileText, Loader2, Printer, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SearchableSelect } from "./SearchableSelect";
import type {
  SummaryCustomerOption,
  SummarySalesmanOption,
  SummarySupplierOption,
  API_SalesReturnType,
  SummaryReturnHeader,
  SummaryReturnItem,
  SummaryFilters,
} from "../type";

interface Props {
  customers: SummaryCustomerOption[];
  salesmen: SummarySalesmanOption[];
  suppliers: SummarySupplierOption[];
  returnTypes: API_SalesReturnType[];
}

// ⚠️ Keeps YYYY-MM-DD for Input fields (Required by HTML5)
const fmtDate = (d: Date) => d.toISOString().split("T")[0];

export function SalesReturnExportDialog({
  customers,
  salesmen,
  suppliers,
  returnTypes,
}: Props) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rangeType, setRangeType] = useState<string>("thisMonth");

  const [dateFrom, setDateFrom] = useState<string>(
    fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
  );
  const [dateTo, setDateTo] = useState<string>(fmtDate(new Date()));
  const [status, setStatus] = useState<string>("All");
  const [customerCode, setCustomerCode] = useState<string>("All");
  const [salesmanId, setSalesmanId] = useState<string>("All");
  const [supplierName, setSupplierName] = useState<string>("All");
  const [returnCategory, setReturnCategory] = useState<string>("All");

  const handleDatePreset = (type: string) => {
    setRangeType(type);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (type) {
      case "all":
        start = new Date("2000-01-01");
        end = now;
        break;
      case "today":
        start = now;
        end = now;
        break;
      case "tomorrow":
        start = new Date(now);
        start.setDate(now.getDate() + 1);
        end = new Date(start);
        break;
      case "thisWeek":
        const day = now.getDay();
        const diff = now.getDate() - day;
        start = new Date(now.setDate(diff));
        end = new Date();
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      case "custom":
        break;
    }
    if (type !== "custom") {
      setDateFrom(fmtDate(start));
      setDateTo(fmtDate(end));
    }
  };

  const filters: SummaryFilters = useMemo(
    () => ({
      dateFrom,
      dateTo,
      status,
      customerCode,
      salesmanId,
      supplierName,
      returnCategory,
    }),
    [
      dateFrom,
      dateTo,
      status,
      customerCode,
      salesmanId,
      supplierName,
      returnCategory,
    ],
  );

  const customerItems = useMemo(
    () => customers.map((c) => ({ value: c.value, label: c.label })),
    [customers],
  );
  const salesmanItems = useMemo(
    () => salesmen.map((s) => ({ value: s.value, label: s.label })),
    [salesmen],
  );
  const supplierItems = useMemo(
    () => suppliers.map((s) => ({ value: s.name, label: s.name })),
    [suppliers],
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const params = new URLSearchParams({
        action: "report",
        page: "1",
        limit: "-1",
        search: "",
        ...filters as Record<string, string>
      });
      const companyResp = await fetch("/api/pdf/company").catch(() => null);
      let companyData: Record<string, string | number | null> | null = null;
      if (companyResp?.ok) {
        const body = await companyResp.json();
        companyData = body?.data?.[0] || body?.data;
      }

      const companyName = companyData?.company_name || "Men2 Marketing & Distribution Enterprise Corporation";
      const companyAddress = companyData?.company_address || "Gonzales Street, Bonuan Boquig, Dagupan, Pangasinan - 2400";
      const companyContact = companyData?.company_contact || "09125846321";
      const companyEmail = companyData?.company_email || "men2corp@men2corp.com";
      const companyLogo = companyData?.company_logo || "/logo.png";

      const res = await fetch(`/api/scm/inventories/sales-return-summary?${params.toString()}`).then((r) => r.json());

      const data = res.data || [];

      if (data.length === 0) {
        alert("No records found.");
        setGenerating(false);
        return;
      }

      const newWindow = window.open("", "_blank");
      if (!newWindow) {
        alert("Pop-up blocked.");
        setGenerating(false);
        return;
      }

      let totalQty = 0;
      let totalGross = 0;
      let totalDisc = 0;
      let totalNet = 0;

      const tableRows = (data as SummaryReturnHeader[])
        .flatMap((header: SummaryReturnHeader) => {
          let dateStr = "-";
          if (header.returnDate) {
            const isoDate = String(header.returnDate).split("T")[0];
            const [year, month, day] = isoDate.split("-");
            dateStr = `${month}-${day}-${year}`;
          }

          return (header.items || []).map((item: SummaryReturnItem) => {
            totalQty += Number(item.quantity) || 0;
            totalGross += Number(item.grossAmount) || 0;
            totalDisc += Number(item.discountAmount) || 0;
            totalNet += Number(item.netAmount) || 0;

            return `<tr>
              <td class="font-mono">${header.returnNumber}</td>
              <td>${dateStr}</td>
              <td>${header.salesmanName}</td>
              <td class="truncate-text" title="${header.customerName}">${header.customerName}</td>
              <td class="truncate-text">${item.supplierName || "-"}</td>
              <td>${item.productCategory || "-"}</td>
              <td class="wrap-text">${item.productName}</td>
              <td>${item.returnCategory || "-"}</td>
              <td class="italic text-gray-500 wrap-text">${item.specificReason || "-"}</td>
              <td class="text-center">${item.unit || "Pcs"}</td>
              <td class="text-right">${Number(item.quantity).toLocaleString()}</td>
              <td class="text-right no-truncate amount-cell">${Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right no-truncate amount-cell">${Number(item.grossAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="text-right text-red-600 no-truncate amount-cell">(${Number(item.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</td>
              <td class="text-right font-bold no-truncate amount-cell">${Number(item.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td class="wrap-text text-gray-600">${header.remarks || "-"}</td>
            </tr>`;
          });
        })
        .join("");

      const formatDateForHeader = (isoDate: string) => {
        const [y, m, d] = isoDate.split("-");
        return `${m}-${d}-${y}`;
      };

      const fullHtml = `<!DOCTYPE html><html><head><title>Sales Return Summary</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap');@page { size: A4 landscape; margin: 8mm; }body { font-family: 'Inter', sans-serif; font-size: 8px; margin: 0; padding: 10px; color: #111; }.official-header { display: flex; align-items: center; border-bottom: 1px solid #999; padding-bottom: 12px; margin-bottom: 15px; }.logo-container { width: 140px; margin-right: 20px; }.logo-container img { width: 100%; height: auto; display: block; }.company-info { flex: 1; }.company-name { font-size: 20px; font-weight: 800; color: #000; line-height: 1; margin-bottom: 4px; letter-spacing: -0.5px; }.company-details { font-size: 11px; color: #000; margin-bottom: 2px; }.contact-email { font-size: 11px; color: #000; }.report-info { text-align: right; margin-bottom: 10px; }.report-title { font-size: 14px; font-weight: 700; text-transform: uppercase; }.report-period { font-size: 10px; color: #444; }table { width: 100%; border-collapse: collapse; font-size: 6.5px; table-layout: fixed; }th { background: #f3f4f6; border: 1px solid #999; padding: 3px 1px; text-align: left; font-weight: 700; text-transform: uppercase; }td { border: 1px solid #ccc; padding: 2px 1px; vertical-align: top; }.text-right { text-align: right; }.text-center { text-align: center; }.font-mono { font-family: 'JetBrains Mono', monospace; }.font-bold { font-weight: 700; }.text-red-600 { color: #dc2626; }.uppercase { text-transform: uppercase; }.truncate-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.wrap-text { white-space: normal; word-break: break-word; }.no-truncate { white-space: nowrap; }.amount-cell { min-width: 45px; }tfoot tr td { background-color: #f3f4f6; font-weight: bold; border-top: 1px solid #000; font-size: 7.5px; }@media print { th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; } }</style></head><body>
      <div class="official-header">
        <div class="logo-container"><img src="${companyLogo}" alt="Logo" onerror="this.style.display='none'"/></div>
        <div class="company-info">
          <div class="company-name">${companyName}</div>
          <div class="company-details">${companyAddress}</div>
          <div class="contact-email">Contact: ${companyContact} | Email: ${companyEmail}</div>
        </div>
      </div>
      <div class="report-info">
        <div class="report-title">Sales Return Summary</div>
        <div class="report-period">Period: ${formatDateForHeader(dateFrom)} to ${formatDateForHeader(dateTo)}</div>
        <div style="font-size: 8px; color: #666; margin-top: 2px;">Generated on ${new Date().toLocaleString()}</div>
      </div>
      <table><thead><tr>
        <th width="6.5%">Return No</th>
        <th width="4.5%">Date</th>
        <th width="5%">Salesman</th>
        <th width="7.5%">Customer</th>
        <th width="5.5%">Supplier</th>
        <th width="5.5%">Category</th>
        <th width="10%">Product</th>
        <th width="4.5%">Type</th>
        <th width="4.5%">Reason</th>
        <th width="2.5%">Unit</th>
        <th width="3%">Qty</th>
        <th width="7.5%">Price</th>
        <th width="7.5%">Gross</th>
        <th width="7.5%">Disc</th>
        <th width="8.5%">Net</th>
        <th width="8%">Remarks</th>
      </tr></thead><tbody>${tableRows}</tbody><tfoot><tr><td colspan="10" class="text-right">GRAND TOTALS:</td><td class="text-right">${totalQty.toLocaleString()}</td><td></td><td class="text-right">${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td class="text-right text-red-600">(${totalDisc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</td><td class="text-right">${totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td></td></tr></tfoot></table></body></html>`;

      newWindow.document.write(fullHtml);
      newWindow.document.close();
      setGenerating(false);
      setOpen(false);
    } catch (error) {
      console.error(error);
      alert("Error generating report.");
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
        >
          <FileText className="h-4 w-4" /> Export Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            What needs to be printed?
          </DialogTitle>
          <DialogDescription>
            Filter select the criteria for the printed report.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Salesman
              </Label>
              <SearchableSelect
                options={salesmanItems}
                value={salesmanId}
                onChange={setSalesmanId}
                placeholder="All Salesmen"
                className="bg-white dark:bg-slate-900"
                modal={true}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Customer
              </Label>
              <SearchableSelect
                options={customerItems}
                value={customerCode}
                onChange={setCustomerCode}
                placeholder="All Customers"
                className="bg-white dark:bg-slate-900"
                modal={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Supplier
              </Label>
              <SearchableSelect
                options={supplierItems}
                value={supplierName}
                onChange={setSupplierName}
                placeholder="All Suppliers"
                className="bg-white dark:bg-slate-900"
                modal={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Return Type
              </Label>
              <Select value={returnCategory} onValueChange={setReturnCategory}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  {returnTypes.map((t) => (
                    <SelectItem key={t.type_name} value={t.type_name}>
                      {t.type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-bold text-slate-500 uppercase">
              Date Range
            </Label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "tomorrow", label: "Tomorrow" },
                { id: "thisWeek", label: "This Week" },
                { id: "thisMonth", label: "This Month" },
                { id: "thisYear", label: "This Year" },
                { id: "custom", label: "Custom" },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={rangeType === item.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDatePreset(item.id)}
                  className={cn(
                    "h-8 text-xs rounded-full px-3 transition-all",
                    rangeType === item.id
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border-slate-200",
                  )}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            {rangeType === "custom" && (
              <div className="flex items-center gap-2 mt-4 animate-in fade-in slide-in-from-top-2">
                <div className="relative flex-1">
                  <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-9 bg-white dark:bg-slate-900"
                  />
                </div>
                <span className="text-slate-400 font-bold">-</span>
                <div className="relative flex-1">
                  <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-9 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 border-t pt-4 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleGenerate}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" /> Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
