"use client";

import React from "react";
import { useBiaFilters } from "./hooks/useBiaFilters";
import { useSupplierReliability } from "./hooks/useSupplierReliability";
import { useBiaLookups } from "../inventory-performance-dashboard/hooks/useBiaLookups";
import { BiaFilterBar } from "./components/BiaFilterBar";
import { SummaryCard } from "./components/SummaryCard";
import ErrorPage from "@/components/shared/ErrorPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/new-data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, Truck } from "lucide-react";

export default function SupplierReliabilityScorecard() {
  const { filters, updateFilters } = useBiaFilters();
  const { data, isLoading, error, refresh } = useSupplierReliability(filters);
  const { lookups } = useBiaLookups();

  if (error) {
    return (
      <div className="space-y-6">
        <BiaFilterBar
          filters={filters}
          onFilterChange={updateFilters}
          onRefresh={refresh}
          isLoading={isLoading}
          branches={lookups.branches}
          suppliers={lookups.suppliers}
        />
        <ErrorPage
          title="Supplier Reliability Scorecard Error"
          message={error}
          reset={refresh}
        />
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  const supplierReliability = data || { items: [] };
  const items = supplierReliability.items || [];

  const avgLeadTime =
    items.length > 0
      ? items.reduce((sum, s) => sum + s.avgLeadTime, 0) / items.length
      : 0;

  const avgFulfillment =
    items.length > 0
      ? items.reduce((sum, s) => sum + s.avgFulfillmentRate, 0) / items.length
      : 0;

  const atRiskSuppliers = items.filter((s) => s.isAtRisk);

  return (
    <div className="space-y-6">
      <BiaFilterBar
        filters={filters}
        onFilterChange={updateFilters}
        onRefresh={refresh}
        isLoading={isLoading}
        branches={lookups.branches}
        suppliers={lookups.suppliers}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard
          title="Avg Lead Time"
          value={`${avgLeadTime.toFixed(1)} Days`}
          description="System-wide average across all POs"
          gradient="bg-gradient-to-t from-blue-600 to-blue-400"
          type="number"
        />
        <SummaryCard
          title="Global Fulfillment Rate"
          value={`${avgFulfillment.toFixed(1)}%`}
          description="Average received vs ordered quantity"
          gradient="bg-gradient-to-t from-emerald-600 to-emerald-400"
          type="percentage"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Supplier Performance Scorecard</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { accessorKey: "supplierName", header: "Supplier" },
              {
                accessorKey: "avgLeadTime",
                header: "Avg Lead Time (Days)",
                cell: ({ row }) => row.original.avgLeadTime.toFixed(1),
              },
              {
                accessorKey: "avgFulfillmentRate",
                header: "Fulfillment Rate (%)",
                cell: ({ row }) => {
                  const rate = row.original.avgFulfillmentRate;
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full",
                            rate < 95 ? "bg-rose-500" : "bg-emerald-500",
                          )}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          rate < 95
                            ? "text-rose-600 font-bold"
                            : "text-emerald-600",
                        )}
                      >
                        {rate.toFixed(1)}%
                      </span>
                    </div>
                  );
                },
              },
              {
                accessorKey: "isAtRisk",
                header: "Status",
                cell: ({ row }) =>
                  row.original.isAtRisk ? (
                    <Badge variant="destructive">Below Threshold</Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-emerald-500 border-emerald-200 text-xs"
                    >
                      Preferred
                    </Badge>
                  ),
              },
            ]}
            data={items}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lead Time Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground italic">
            Lead time trend visualization pending historical snapshot
            integration...
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compliance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {atRiskSuppliers.length > 0 ? (
                atRiskSuppliers.map((supplier) => (
                  <div
                    key={supplier.supplierId}
                    className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-100"
                  >
                    <TrendingUp className="h-5 w-5 text-rose-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-rose-900">
                        {supplier.supplierName}
                      </p>
                      <p className="text-xs text-rose-700">
                        Fulfillment at {supplier.avgFulfillmentRate.toFixed(1)}%
                        this period.
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  All suppliers are meeting fulfillment thresholds.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
