"use client";

import { useState } from "react";
import { useStockAdjustmentManual } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/hooks/useStockAdjustmentManual";
import { StockAdjustmentManualList } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/components/StockAdjustmentManualList";
import { StockAdjustmentManualForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/components/forms/StockAdjustmentManualForm";
import { StockAdjustmentManualDetailView } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/components/StockAdjustmentManualDetailView";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

export default function StockAdjustmentManualModule() {
  const { data, isLoading, error, refresh, filters } = useStockAdjustmentManual();
  // Form-specific data is fetched independently inside StockAdjustmentManualForm
  // via `useStockAdjustmentManualForm` — no duplicate list fetch.
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
    <div className="stock-adjustment-manual-module">
      {view === "list" && (
        <StockAdjustmentManualList
          data={data}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDetail={handleDetail}
          filters={filters}
        />
      )}

      {(view === "create" || view === "edit") && (
        <StockAdjustmentManualForm
          id={selectedId}
          onCancel={handleBack}
          onSuccess={() => {
            handleBack();
            refresh();
          }}
        />
      )}

      {view === "detail" && selectedId && (
        <StockAdjustmentManualDetailView
          id={selectedId}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
