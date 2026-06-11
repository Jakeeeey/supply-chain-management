"use client";

import React, { useState } from "react";
import { StockAdjustmentSummaryProvider, useStockAdjustmentSummaryContext } from "./providers/StockAdjustmentSummaryProvider";
import { FilterToolbar } from "./components/FilterToolbar";
import { OverviewKPIs } from "./components/OverviewKPIs";
import { OverviewCharts } from "./components/OverviewCharts";
import { ProductSupplierCharts } from "./components/ProductSupplierCharts";
import { RecentLog } from "./components/RecentLog";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { Button } from "@/components/ui/button";
import { BarChart3, PieChart as PieIcon, RotateCcw } from "lucide-react";

function StockAdjustmentSummaryInner() {
  const { isLoading, error, refresh, rawData } = useStockAdjustmentSummaryContext();
  const [activeTab, setActiveTab] = useState<"overview" | "items">("overview");

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
            Overview and visualization of inventory stock entries and corrections
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          className="gap-2 border-border/50 text-xs font-semibold rounded-lg hover:bg-muted/50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reload Data
        </Button>
      </div>

      {/* Filter Section */}
      <FilterToolbar />

      {/* KPI Cards Grid & Mini-Stats */}
      <OverviewKPIs />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/30">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" /> Overview & Charts
        </button>
        <button
          onClick={() => setActiveTab("items")}
          className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "items"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PieIcon className="h-3.5 w-3.5" /> Product & Supplier Analytics
        </button>
      </div>

      {/* Charts Grid */}
      {activeTab === "overview" ? <OverviewCharts /> : <ProductSupplierCharts />}

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
