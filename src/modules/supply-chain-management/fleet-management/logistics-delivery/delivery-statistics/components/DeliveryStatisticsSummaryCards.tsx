"use client";

import * as React from "react";
import type { DashboardData } from "../types";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { CheckCircle, Package, XCircle, PhilippinePeso } from "lucide-react";

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DeliveryStatisticsSummaryCards(props: {
  loading: boolean;
  data: DashboardData;
}) {
  const { loading, data } = props;

  const counts = data.deliveryStatusCounts ?? [];
  const fulfilled = counts.find((x) => x.name === "Fulfilled")?.value ?? 0;
  const notFulfilled = counts.find((x) => x.name === "Not Fulfilled")?.value ?? 0;
  const concerns = counts.find((x) => x.name === "Fulfilled With Concerns")?.value ?? 0;
  const returns = counts.find((x) => x.name === "Fulfilled With Returns")?.value ?? 0;

  const totalDeliveries = counts.reduce((a, b) => a + (b.value || 0), 0) || 1;
  const fulfillmentRate = ((fulfilled / totalDeliveries) * 100).toFixed(1);
  const issuesCount = concerns + returns;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {/* Fulfilled */}
      <Card className="rounded-2xl border bg-card shadow-sm dark:border-white/60">
        <CardContent className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Fulfilled Deliveries</p>
            <div className="text-3xl font-semibold tracking-tight">
              {loading ? <Skeleton className="h-9 w-20" /> : fulfilled}
            </div>
          </div>

          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-5 w-24 rounded-full" />
            ) : (
              <Badge variant="secondary" className="rounded-full bg-emerald-500/10 text-emerald-700">
                {fulfillmentRate}% rate
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Not Fulfilled */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10">
              <Package className="h-6 w-6 text-amber-600" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Not Fulfilled</p>
            <div className="text-3xl font-semibold tracking-tight">
              {loading ? <Skeleton className="h-9 w-20" /> : notFulfilled}
            </div>
          </div>

          <p className="mt-3 text-sm text-amber-700">Pending completion</p>
        </CardContent>
      </Card>

      {/* Issues */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Concerns &amp; Returns</p>
            <div className="text-3xl font-semibold tracking-tight">
              {loading ? <Skeleton className="h-9 w-20" /> : issuesCount}
            </div>
          </div>

          <p className="mt-3 text-sm text-red-700">Requires attention</p>
        </CardContent>
      </Card>

      {/* Total Sales */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6 flex items-start justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10">
              <PhilippinePeso className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Sales (Net)</p>
            <div className="text-3xl font-semibold tracking-tight">
              {loading ? <Skeleton className="h-9 w-52" /> : formatPHP(data.totalSales || 0)}
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Avg:{" "}
            {loading ? (
              "…"
            ) : (
              `₱${(data.avgSales || 0).toLocaleString("en-PH", {
                maximumFractionDigits: 0,
              })} / order`
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
