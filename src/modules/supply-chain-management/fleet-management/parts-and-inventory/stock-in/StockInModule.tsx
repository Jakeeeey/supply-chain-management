"use client";

import * as React from "react";
import { useStockIn } from "./hooks/useStockIn";
import type { BatchStockInInput } from "./types";
import { StockInToolbar } from "./components/StockInToolbar";
import { StockInTable } from "./components/StockInTable";
import { BatchStockInDialog } from "./components/BatchStockInDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function StockInModule() {
  const {
    movements,
    parts,
    branches,
    loading,
    saving,
    error,
    search,
    setSearch,
    branchFilter,
    setBranchFilter,
    reload,
    recordStockIn,
  } = useStockIn();

  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleSaveStockIn = async (payload: BatchStockInInput) => {
    return await recordStockIn(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock In Management</h1>
        <p className="text-sm text-muted-foreground">
          Receive deliveries, record bulk spare parts inventory, and update available stocks.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <StockInToolbar
        search={search}
        onSearchChange={setSearch}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        branches={branches}
        onOpenBatchStockIn={() => setDialogOpen(true)}
        onRefresh={reload}
        loading={loading}
      />

      <StockInTable movements={movements} branches={branches} loading={loading} />

      <BatchStockInDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        parts={parts}
        branches={branches}
        saving={saving}
        onSave={handleSaveStockIn}
      />
    </div>
  );
}
