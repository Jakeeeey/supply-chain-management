"use client";

import { useState } from "react";
import { useStockAdjustment } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/hooks/useStockAdjustment";
import { StockAdjustmentList } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/components/StockAdjustmentList";
import { StockAdjustmentForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/components/forms/StockAdjustmentForm";
import { StockAdjustmentDetailView } from "@/modules/supply-chain-management/inventory-management/stock-adjustment/components/StockAdjustmentDetailView";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

export default function StockAdjustmentModule() {
  const { data, isLoading, error, refresh, filters } = useStockAdjustment();
  // Form-specific data is fetched independently inside StockAdjustmentForm
  // via `useStockAdjustmentForm` — no duplicate list fetch.
  const [view, setView] = useState<"list" | "create" | "edit" | "detail">("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isLoading && data.length === 0) {
    return <ModuleSkeleton hasTabs={false} rowCount={6} />;
  }

  if (error) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Failed to Load Stock Adjustments"
        message={error}
        reset={refresh}
      />
    );
  }

  const handleCreate = () => {
    setSelectedId(null);
    setView("create");
  };

  const handleEdit = (id: number) => {
    setSelectedId(id);
    setView("edit");
  };

  const handleDetail = (id: number) => {
    setSelectedId(id);
    setView("detail");
  };

  const handleBack = () => {
    setSelectedId(null);
    setView("list");
  };

  return (
    <div className="stock-adjustment-module">
      {view === "list" && (
        <StockAdjustmentList
          data={data}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDetail={handleDetail}
          filters={filters}
        />
      )}

      {(view === "create" || view === "edit") && (
        <StockAdjustmentForm
          id={selectedId}
          onCancel={handleBack}
          onSuccess={() => {
            handleBack();
            refresh();
          }}
        />
      )}

      {view === "detail" && selectedId && (
        <StockAdjustmentDetailView
          id={selectedId}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
