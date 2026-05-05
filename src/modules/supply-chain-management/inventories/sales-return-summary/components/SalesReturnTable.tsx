import React from "react";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { SalesReturnExportDialog } from "./SalesReturnExportDialog";

const getStatusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "received")
    return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
  if (s === "pending")
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
};

const HeaderCell = ({ children, className = "" }: any) => (
  <TableHead
    className={`h-9 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap ${className}`}
  >
    {children}
  </TableHead>
);
const DataCell = ({ children, className = "", ...props }: any) => (
  <TableCell className={`text-xs px-3 py-2 align-top ${className}`} {...props}>
    {children}
  </TableCell>
);

// 🟢 HELPER: Format Date to MM-DD-YYYY
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}-${day}-${year}`;
};
export const SalesReturnTable = ({
  report,
  loading,
  pagination,
  setPagination,
  options,
}: any) => {
  const totalPages = Math.max(1, Math.ceil(report.total / pagination.limit));
  const { page, limit } = pagination;
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) pages.push(1, 2, 3, 4, 5, "...", totalPages);
      else if (page >= totalPages - 3)
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      else pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pages;
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div className="font-bold text-slate-800 dark:text-slate-200 text-lg">
          Sales Returns ({report.total})
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <SalesReturnExportDialog
            customers={options.customers}
            salesmen={options.salesmen}
            suppliers={options.suppliers.map((s: any) => ({
              ...s,
              value: s.name,
              label: s.name,
            }))}
            returnTypes={options.returnTypes}
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Rows:
          </span>
          <Select
            value={String(limit)}
            onValueChange={(val) =>
              setPagination({ page: 1, limit: Number(val) })
            }
          >
            <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
              {[5, 10, 20, 50, 100].map((v) => (
                <SelectItem key={v} value={String(v)}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[1800px]">
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
              <HeaderCell>Return No</HeaderCell>
              <HeaderCell>Date</HeaderCell>
              <HeaderCell>Salesman</HeaderCell>
              <HeaderCell>Customer</HeaderCell>
              <HeaderCell>Supplier</HeaderCell>
              <HeaderCell>Brand</HeaderCell>
              <HeaderCell>Category</HeaderCell>
              <HeaderCell>Product Name</HeaderCell>
              <HeaderCell>Return Type</HeaderCell>
              <HeaderCell>Reason</HeaderCell>
              <HeaderCell className="text-center">Unit</HeaderCell>
              <HeaderCell className="text-right">Quantity</HeaderCell>
              <HeaderCell className="text-right">Unit Price</HeaderCell>
              <HeaderCell className="text-right">Gross Amount</HeaderCell>
              <HeaderCell>Discount Type</HeaderCell>
              <HeaderCell className="text-right">Discount Amt</HeaderCell>
              <HeaderCell className="text-right">Net Amount</HeaderCell>
              <HeaderCell>Applied To</HeaderCell>
              <HeaderCell className="text-center">Status</HeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={19}
                  className="py-12 text-center text-slate-500 animate-pulse"
                >
                  Loading data...
                </TableCell>
              </TableRow>
            ) : report.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={19}
                  className="py-12 text-center text-slate-500"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              report.rows.flatMap((r: any) =>
                (r.items || []).map((item: any) => (
                  <TableRow
                    key={String(item.detailId)}
                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors border-slate-200 dark:border-slate-800"
                  >
                    <DataCell className="text-blue-600 dark:text-blue-400 font-medium">
                      {r.returnNumber}
                    </DataCell>
                    <DataCell className="text-slate-600 dark:text-slate-400">
                      {formatDate(r.returnDate)}
                    </DataCell>
                    <DataCell className="text-slate-600 dark:text-slate-400">
                      {r.salesmanName}
                    </DataCell>
                    <DataCell
                      className="text-slate-600 dark:text-slate-400 max-w-[150px] truncate"
                      title={r.customerName}
                    >
                      {r.customerName}
                    </DataCell>
                    <DataCell className="text-slate-600 dark:text-slate-400 max-w-[120px] truncate">
                      {item.supplierName || "-"}
                    </DataCell>
                    <DataCell className="text-slate-600 dark:text-slate-400">
                      {item.brandName || "-"}
                    </DataCell>
                    <DataCell className="text-slate-600 dark:text-slate-400">
                      {item.productCategory || "-"}
                    </DataCell>
                    <DataCell className="text-slate-700 dark:text-slate-200 font-medium w-[250px] whitespace-normal wrap-break-word">
                      {item.productName}
                    </DataCell>
                    <DataCell className="text-slate-600 dark:text-slate-400">
                      {item.returnCategory || "-"}
                    </DataCell>
                    <DataCell className="text-slate-500 italic max-w-[150px] truncate">
                      {item.specificReason || "-"}
                    </DataCell>
                    <DataCell className="text-slate-600 dark:text-slate-400 text-center">
                      {item.unit || "-"}
                    </DataCell>
                    <DataCell className="text-slate-700 dark:text-slate-300 text-right">
                      {Number(item.quantity).toLocaleString()}
                    </DataCell>
                    <DataCell className="text-slate-700 dark:text-slate-300 text-right">
                      {Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </DataCell>
                    <DataCell className="text-slate-700 dark:text-slate-300 text-right">
                      {Number(item.grossAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </DataCell>
                    <DataCell className="text-slate-500 text-right">
                      {item.discountApplied || "-"}
                    </DataCell>
                    <DataCell className="text-slate-500 text-right">
                      {Number(item.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </DataCell>
                    <DataCell className="font-bold text-blue-600 dark:text-blue-400 text-right">
                      {Number(item.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </DataCell>
                    <DataCell className="text-slate-600 dark:text-slate-400">
                      {item.invoiceNo || r.invoiceNo || "-"}
                    </DataCell>
                    <DataCell className="text-center">
                      <Badge
                        variant="outline"
                        className={getStatusBadge(r.returnStatus)}
                      >
                        {r.returnStatus === "Received" ? "Approved" : "Pending"}
                      </Badge>
                    </DataCell>
                  </TableRow>
                )),
              )
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-left">
          Showing <b>{(page - 1) * limit + 1}</b> to{" "}
          <b>{Math.min(page * limit, report.total)}</b> of <b>{report.total}</b>{" "}
          entries
        </div>
        <div className="flex items-center gap-1 justify-center">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
            onClick={() => setPagination((p: any) => ({ ...p, page: 1 }))}
            disabled={page === 1 || loading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
            onClick={() =>
              setPagination((p: any) => ({ ...p, page: Math.max(1, page - 1) }))
            }
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((p, i) => (
              <Button
                key={i}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className={`h-8 w-8 p-0 ${p === "..." ? "cursor-default border-none hover:bg-transparent dark:hover:bg-transparent dark:text-slate-400" : ""} ${p === page ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:text-white" : "dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"}`}
                onClick={() =>
                  typeof p === "number" &&
                  setPagination((prev: any) => ({ ...prev, page: p }))
                }
                disabled={p === "..." || loading}
              >
                {p}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
            onClick={() =>
              setPagination((p: any) => ({
                ...p,
                page: Math.min(totalPages, page + 1),
              }))
            }
            disabled={page === totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
            onClick={() =>
              setPagination((p: any) => ({ ...p, page: totalPages }))
            }
            disabled={page === totalPages || loading}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
