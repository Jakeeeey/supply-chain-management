"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { FiltersState } from "./types";
import { usePendingInvoices } from "./hooks/usePendingInvoices";
import { usePendingInvoiceOptions } from "./hooks/usePendingInvoiceOptions";

import { DashboardCards } from "./components/DashboardCards";
import { StatusCharts } from "./components/StatusCharts";
import { FiltersBar } from "./components/FiltersBar";
import { PendingInvoicesTable } from "./components/PendingInvoicesTable";
import { ExportDialog } from "./components/ExportDialog";
import { InvoiceDetailsDialog } from "./components/InvoiceDetailsDialog";

function PendingInvoicesTableSkeleton() {
  return (
    <div className="rounded-md border bg-white overflow-hidden">
      {/* header */}
      <div className="bg-slate-50 px-4 py-3">
        <div className="grid grid-cols-12 gap-3 items-center">
          <Skeleton className="h-4 col-span-2" />
          <Skeleton className="h-4 col-span-2" />
          <Skeleton className="h-4 col-span-3" />
          <Skeleton className="h-4 col-span-2" />
          <Skeleton className="h-4 col-span-1 justify-self-center" />
          <Skeleton className="h-4 col-span-2 justify-self-end" />
        </div>
      </div>

      {/* rows */}
      <div className="px-4 py-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 items-center">
            <Skeleton className="h-4 col-span-2" />
            <Skeleton className="h-4 col-span-2" />
            <Skeleton className="h-4 col-span-3" />
            <Skeleton className="h-4 col-span-2" />
            <Skeleton className="h-4 col-span-1 justify-self-center" />
            <div className="col-span-2 justify-self-end">
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PendingInvoicesModule() {
  const [filters, setFilters] = React.useState<FiltersState>({
    q: "",
    status: "All",
    salesmanId: "All",
    customerCode: "All",
    page: 1,
    pageSize: 25,
  });

  const { data, loading, error } = usePendingInvoices(filters);
  const { data: options } = usePendingInvoiceOptions();

  const [exportOpen, setExportOpen] = React.useState(false);
  const [detailsInvoiceNo, setDetailsInvoiceNo] = React.useState<string | null>(null);

  const totalPages = data ? Math.ceil(data.total / filters.pageSize) : 1;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <div className="text-2xl font-bold tracking-tight">Pending Invoice Monitoring Dashboard</div>
        <div className="text-sm text-muted-foreground mt-1">Track undelivered and uncleared printed receipts</div>
      </div>

      <DashboardCards kpis={data?.kpis} loading={loading} />
      <StatusCharts kpis={data?.kpis} loading={loading} />

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6 space-y-4">
          <FiltersBar
            filters={filters}
            setFilters={setFilters}
            options={options}
            onExport={() => setExportOpen(true)}
          />

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          {loading && <PendingInvoicesTableSkeleton />}

          {!loading && data && (
            <>
              <PendingInvoicesTable rows={data.rows} onOpenInvoice={(inv) => setDetailsInvoiceNo(inv)} />

              <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground border-t mt-4">
                <div>
                  Page <span className="font-medium text-foreground">{filters.page}</span> of{" "}
                  <span className="font-medium text-foreground">{totalPages || 1}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= totalPages}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} options={options} />

      <InvoiceDetailsDialog
        open={!!detailsInvoiceNo}
        invoiceNo={detailsInvoiceNo}
        onClose={() => setDetailsInvoiceNo(null)}
      />
    </div>
  );
}
