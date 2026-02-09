"use client";

import * as React from "react";
import { useStatisticsDeliveries } from "./hooks/useStatisticsDeliveries";

import { DeliveryStatisticsFilters } from "./components/DeliveryStatisticsFilters";
import { DeliveryStatisticsSummaryCards } from "./components/DeliveryStatisticsSummaryCards";
import { DeliveryStatusDistributionCard } from "./components/DeliveryStatusDistributionCard";
import { DeliveryTrendsCard } from "./components/DeliveryTrendsCard";
import { SalesTrendCard } from "./components/SalesTrendCard";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

export default function DeliveryStatisticsModule() {
  const s = useStatisticsDeliveries();

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-6 lg:px-10">
        {/* Header + Controls (match screenshot: left title, right filter pill) */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Statistics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Overview of delivery performance and sales
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DeliveryStatisticsFilters
              filterType={s.filterType}
              setFilterType={s.setFilterType}
              customStartDate={s.customStartDate}
              setCustomStartDate={s.setCustomStartDate}
              customEndDate={s.customEndDate}
              setCustomEndDate={s.setCustomEndDate}
            />

            <Button
              variant="outline"
              size="icon"
              onClick={() => s.refetch()}
              disabled={s.loading}
              className="h-10 w-10 rounded-xl"
              aria-label="Refresh"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error */}
        {s.error ? (
          <div className="mb-6">
            <Alert variant="destructive">
              <AlertTitle>Failed to load</AlertTitle>
              <AlertDescription>{s.error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        {/* Summary Cards */}
        <div className="mb-6">
          <DeliveryStatisticsSummaryCards loading={s.loading} data={s.data} />
        </div>

        {/* Charts Grid */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DeliveryStatusDistributionCard
            loading={s.loading}
            counts={s.data.deliveryStatusCounts}
          />
          <DeliveryTrendsCard
            loading={s.loading}
            chartData={s.data.chartData}
            filterType={s.filterType}
          />
        </div>

        {/* Sales Trend */}
        <SalesTrendCard loading={s.loading} chartData={s.data.chartData} />
      </div>
    </div>
  );
}
