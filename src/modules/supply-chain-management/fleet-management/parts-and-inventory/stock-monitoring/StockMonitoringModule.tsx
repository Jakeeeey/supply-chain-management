"use client";

import * as React from "react";
import { useStockMonitoring } from "./hooks/useStockMonitoring";
import { StockMonitoringKpiCards } from "./components/StockMonitoringKpiCards";
import { StockMonitoringToolbar } from "./components/StockMonitoringToolbar";
import { StockMonitoringTable } from "./components/StockMonitoringTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function StockMonitoringModule() {
  const {
    items,
    classifications,
    branches,
    kpis,
    loading,
    error,
    search,
    setSearch,
    branchFilter,
    setBranchFilter,
    statusFilter,
    setStatusFilter,
    classificationFilter,
    setClassificationFilter,
    viewMode,
    setViewMode,
    reload,
  } = useStockMonitoring();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Track real-time inventory counts, reserved quantities for Job Orders, and low stock threshold alerts.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <StockMonitoringKpiCards kpis={kpis} />

      <StockMonitoringToolbar
        search={search}
        onSearchChange={setSearch}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        branches={branches}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        classificationFilter={classificationFilter}
        onClassificationFilterChange={setClassificationFilter}
        classifications={classifications}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={reload}
        loading={loading}
      />

      <StockMonitoringTable items={items} loading={loading} viewMode={viewMode} />
    </div>
  );
}
