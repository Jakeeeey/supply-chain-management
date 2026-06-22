"use client";

import React from "react";
import { StockAdjustmentSummaryProvider, useStockAdjustmentSummaryContext } from "./providers/StockAdjustmentSummaryProvider";
import { FilterToolbar } from "./components/FilterToolbar";
import { OverviewKPIs } from "./components/OverviewKPIs";
import { RecentLog } from "./components/RecentLog";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { Button } from "@/components/ui/button";
import { BarChart3, RotateCcw } from "lucide-react";

function StockAdjustmentSummaryInner() {
  const { isLoading, error, refresh, rawData } = useStockAdjustmentSummaryContext();

  if (isLoading && rawData.length === 0) {
    return <ModuleSkeleton hasTabs={false} rowCount={6} />;
  }

  if (error) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Failed to Load Stock Adjustment Summary"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Stock Adjustment Summary
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overview and list of inventory stock entries and corrections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="gap-2 border-border/50 text-xs font-semibold rounded-lg hover:bg-muted/50 h-10 px-4"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reload Data
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <FilterToolbar />

      {/* KPI Cards Grid & Mini-Stats */}
      <OverviewKPIs />

      {/* Recent Activity Log */}
      <RecentLog />

    </div>
  );
}

export default function StockAdjustmentSummaryModule() {
  return (
    <StockAdjustmentSummaryProvider>
      <div className="stock-adjustment-summary-module p-4 h-full bg-background/50">
        <StockAdjustmentSummaryInner />
      </div>
    </StockAdjustmentSummaryProvider>
  );
}
