"use client";

import * as React from "react";
import { useStockOutModule } from "./hooks/useStockOutModule";
import { StockOutSummaryCards } from "./components/StockOutSummaryCards";
import { StockOutToolbar } from "./components/StockOutToolbar";
import { StockOutHistoryTable } from "./components/StockOutHistoryTable";
import { RecordStockOutDialog } from "./components/RecordStockOutDialog";

export default function StockOutModule() {
  const {
    movements,
    branches,
    loading,
    search,
    setSearch,
    selectedBranch,
    setSelectedBranch,
    selectedType,
    setSelectedType,
    metrics,
    refresh,
  } = useStockOutModule();

  const [recordOpen, setRecordOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      {/* 1. KPI Summary Cards */}
      <StockOutSummaryCards
        totalTransactions={metrics.totalTransactions}
        totalQty={metrics.totalQty}
        totalValuation={metrics.totalValuation}
        issueCount={metrics.issueCount}
        scrapDisposalCount={metrics.scrapDisposalCount}
      />

      {/* 2. Filter & Action Toolbar */}
      <StockOutToolbar
        search={search}
        onSearchChange={setSearch}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        branches={branches}
        loading={loading}
        onRefresh={refresh}
        onOpenRecordModal={() => setRecordOpen(true)}
      />

      {/* 3. Movements History Table */}
      <StockOutHistoryTable items={movements} loading={loading} />

      {/* 4. Record Stock Out Dialog */}
      <RecordStockOutDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        branches={branches}
        onSuccess={refresh}
      />
    </div>
  );
}
