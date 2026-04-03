"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle as ShadCardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";


import { money } from "../utils/money";
import { useInvoiceDetails } from "../hooks/useInvoiceDetails";

function ReadonlyField({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</div>
      <div className="flex min-h-[2.25rem] w-full items-center rounded-md bg-muted/50 border px-3 py-1 text-sm">
        {value || "-"}
      </div>
    </div>
  );
}

/* ------------------------------ Skeleton UI ------------------------------ */

function InvoiceDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header block */}
      <div className="bg-card p-5 rounded-lg border dark:border-white/60 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 space-y-2">
            <Skeleton className="h-3 w-28" />
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
              <Skeleton className="h-3 w-20" />
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

      {/* Table + Summary */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 rounded-lg border dark:border-white/60 bg-card shadow-sm overflow-hidden min-h-[300px]">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>

        <Card className="w-full xl:w-[320px] shadow-sm h-fit dark:border-white/60">
          <CardHeader className="bg-muted/50 py-3 border-b">
            <ShadCardTitle className="text-sm font-semibold text-primary">Summary</ShadCardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Separator />
            <div className="flex items-center justify-between font-bold">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------- Component ------------------------------ */

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

  // Sonner for errors (no inline banners)
  const lastErrRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!open) return;
    if (!error) {
      lastErrRef.current = null;
      return;
    }
    if (lastErrRef.current === error) return;
    lastErrRef.current = error;
    toast.error(error);
  }, [open, error]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] md:max-w-[1300px] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-primary text-xl font-bold">Invoice #{invoiceNo ?? ""}</DialogTitle>

          {/* Keep badges only when header exists */}
          {h && (
            <div className="flex gap-2">
              <Badge className="px-3 py-1 font-semibold">{h.status || "Unknown"}</Badge>
              {h.dispatch_plan && h.dispatch_plan !== "unlinked" && (
                <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10">
                  Plan: {h.dispatch_plan}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
          {loading && <InvoiceDetailsSkeleton />}

          {!loading && data && h && (
            <div className="space-y-6">
              <div className="bg-card p-5 rounded-lg border dark:border-white/60 shadow-sm space-y-4">
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
                <div className="flex-1 rounded-lg border dark:border-white/60 bg-card shadow-sm overflow-hidden min-h-[300px]">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Code</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Description</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-center">Unit</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Qty</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Price</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Gross</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-center">Disc Type</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Disc Amt</TableHead>
                        <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Net Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.lines.map((l) => (
                        <TableRow key={String(l.id)} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{l.product_id ?? "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{l.product_name ?? "-"}</TableCell>
                          <TableCell className="text-center">{l.unit ?? "-"}</TableCell>
                          <TableCell className="text-right">{l.qty}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{money(l.price)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{money(l.gross)}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground/60">{l.disc_type || "-"}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{money(l.disc_amt)}</TableCell>
                          <TableCell className="text-right font-bold">{money(l.net_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Card className="w-full xl:w-[320px] shadow-sm h-fit dark:border-white/60">
                  <CardHeader className="bg-muted/50 py-3 border-b">
                    <ShadCardTitle className="text-sm font-semibold text-primary">Summary</ShadCardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Amount</span>
                      <span>{money(data.summary.gross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span>{money(data.summary.discount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vatable</span>
                      <span>{money(data.summary.vatable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memo</span>
                      <span>0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-primary font-medium">
                      <span>Net</span>
                      <span>{money(data.summary.net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT</span>
                      <span>{money(data.summary.vat)}</span>
                    </div>
                    <Separator className="h-[2px]" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>TOTAL</span>
                      <span>{money(data.summary.total)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-destructive">
                      <span>Balance</span>
                      <span>{money(data.summary.balance)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* If request failed and no data, we just show empty (toast already displayed) */}
          {!loading && !data && <div className="h-10" />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
