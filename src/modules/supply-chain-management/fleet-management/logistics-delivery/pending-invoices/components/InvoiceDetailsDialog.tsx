"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvoiceDetailsResponse } from "../types";
import { money } from "../utils/money";
import { useInvoiceDetails } from "../hooks/useInvoiceDetails";

function ReadonlyField({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</div>
      <div className="flex min-h-[2.25rem] w-full items-center rounded-md bg-slate-50 border border-slate-200 px-3 py-1 text-sm text-slate-800">
        {value || "-"}
      </div>
    </div>
  );
}

function InvoiceDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Form Section Skeleton */}
      <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Table & Summary Section Skeleton */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 rounded-lg border bg-white shadow-sm overflow-hidden min-h-[300px]">
          <div className="p-4 space-y-3">
            <Skeleton className="h-9 w-full" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>

        <div className="w-full xl:w-[320px]">
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 py-3 px-4 border-b">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
              <Skeleton className="h-px w-full" />
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceDetailsDialog({
  open,
  invoiceNo,
  onClose,
}: {
  open: boolean;
  invoiceNo: string | null;
  onClose: () => void;
}) {
  const { data, loading, error } = useInvoiceDetails(open, invoiceNo);
  const h = data?.header;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-[1300px] h-[90vh] flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="px-6 py-4 border-b bg-white shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-blue-600 text-xl font-bold">Invoice #{invoiceNo ?? ""}</DialogTitle>
          {h && (
            <div className="flex gap-2">
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1">{h.status || "Unknown"}</Badge>
              {h.dispatch_plan && h.dispatch_plan !== "unlinked" && (
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                  Plan: {h.dispatch_plan}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          {loading && <InvoiceDetailsSkeleton />}
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          {!loading && data && h && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ReadonlyField label="Customer Name" value={h.customer_name} className="md:col-span-3" />
                  <ReadonlyField label="No." value={h.invoice_no} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ReadonlyField label="Customer Code" value={h.customer_code} />
                  <ReadonlyField label="Date" value={h.invoice_date} />
                  <ReadonlyField label="Due" value={h.invoice_date} />
                  <ReadonlyField label="Dispatch Date" value={h.dispatch_date} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <ReadonlyField label="Salesman" value={h.salesman} />
                  <ReadonlyField label="Location" value={h.address} />
                  <ReadonlyField label="Sales Type" value={h.sales_type} />
                  <ReadonlyField label="Receipt Type" value={h.invoice_type} />
                  <ReadonlyField label="Price Type" value={h.price_type} />
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 rounded-lg border bg-white shadow-sm overflow-hidden min-h-[300px]">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600">Code</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600">Description</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600 text-center">Unit</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600 text-right">Qty</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600 text-right">Price</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600 text-right">Gross</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600 text-center">Disc Type</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600 text-right">Disc Amt</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-slate-600 text-right">Net Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.lines.map((l) => (
                        <TableRow key={String(l.id)} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-700">{l.product_id ?? "-"}</TableCell>
                          <TableCell className="text-slate-600">{l.product_name ?? "-"}</TableCell>
                          <TableCell className="text-center">{l.unit ?? "-"}</TableCell>
                          <TableCell className="text-right">{l.qty}</TableCell>
                          <TableCell className="text-right text-slate-500">{money(l.price)}</TableCell>
                          <TableCell className="text-right text-slate-500">{money(l.gross)}</TableCell>
                          <TableCell className="text-center text-xs text-slate-400">{l.disc_type || "-"}</TableCell>
                          <TableCell className="text-right text-slate-500">{money(l.disc_amt)}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">{money(l.net_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Card className="w-full xl:w-[320px] shadow-sm h-fit">
                  <CardHeader className="bg-slate-50 py-3 border-b">
                    <ShadCardTitle className="text-sm font-semibold text-blue-700">Summary</ShadCardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Amount</span>
                      <span>{money(data.summary.gross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Discount</span>
                      <span>{money(data.summary.discount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vatable</span>
                      <span>{money(data.summary.vatable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Memo</span>
                      <span>0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-blue-600 font-medium">
                      <span>Net</span>
                      <span>{money(data.summary.net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">VAT</span>
                      <span>{money(data.summary.vat)}</span>
                    </div>
                    <Separator className="bg-slate-200 h-[2px]" />
                    <div className="flex justify-between font-bold text-lg text-slate-900">
                      <span>TOTAL</span>
                      <span>{money(data.summary.total)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-red-600">
                      <span>Balance</span>
                      <span>{money(data.summary.balance)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
