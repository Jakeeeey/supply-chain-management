"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import type { FiltersState } from "./types";
import { usePendingInvoices } from "./hooks/usePendingInvoices";
import { usePendingInvoiceOptions } from "./hooks/usePendingInvoiceOptions";

import { DashboardCards } from "./components/DashboardCards";
import { StatusCharts } from "./components/StatusCharts";
import { FiltersBar } from "./components/FiltersBar";
import { PendingInvoicesTable } from "./components/PendingInvoicesTable";
import { ExportDialog } from "./components/ExportDialog";
import { InvoiceDetailsDialog } from "./components/InvoiceDetailsDialog";

function TableSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
      <div className="pt-4 border-t mt-4 flex items-center justify-between">
        <Skeleton className="h-4 w-44" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
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

  // Sonner for errors (no inline banners)
  const lastErrRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!error) {
      lastErrRef.current = null;
      return;
    }
    if (lastErrRef.current === error) return;
    lastErrRef.current = error;
    toast.error(error);
  }, [error]);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <div className="text-2xl font-bold tracking-tight">Pending Invoice Monitoring Dashboard</div>
        <div className="text-sm text-muted-foreground mt-1">Track undelivered and uncleared printed receipts</div>
      </div>

      {/* Skeletons for KPI + Charts */}
      <DashboardCards kpis={data?.kpis} loading={loading && !data?.kpis} />
      <StatusCharts kpis={data?.kpis} loading={loading && !data?.kpis} />

      <Card className="shadow-sm border dark:border-white/60">
        <CardContent className="p-6 space-y-4">
          <FiltersBar filters={filters} setFilters={setFilters} options={options} onExport={() => setExportOpen(true)} />

          {loading && <TableSkeleton />}

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

          {/* If failed and no data, keep layout clean (toast already shown) */}
          {!loading && !data && <div className="h-10" />}
        </CardContent>
      </Card>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} options={options} />

      <InvoiceDetailsDialog open={!!detailsInvoiceNo} invoiceNo={detailsInvoiceNo} onClose={() => setDetailsInvoiceNo(null)} />
    </div>
  );
}
