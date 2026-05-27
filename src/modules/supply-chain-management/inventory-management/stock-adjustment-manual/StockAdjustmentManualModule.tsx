"use client";

import { useState } from "react";
import { useStockAdjustmentManual } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/hooks/useStockAdjustmentManual";
import { StockAdjustmentManualList } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/components/StockAdjustmentManualList";
import { StockAdjustmentManualForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/components/forms/StockAdjustmentManualForm";
import { StockAdjustmentManualDetailView } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual/components/StockAdjustmentManualDetailView";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

export default function StockAdjustmentManualModule() {
  const { 
    data, 
    totalItems,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    setPageSize,
    isLoading, 
    error, 
    refresh, 
    resetFilters,
    filters 
  } = useStockAdjustmentManual();
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreate = () => {
    setSelectedId(null);
    setView("create");
    scrollToTop();
  };

  const handleEdit = (id: number) => {
    setSelectedId(id);
    setView("edit");
    scrollToTop();
  };

  const handleDetail = (id: number) => {
    setSelectedId(id);
    setView("detail");
    scrollToTop();
  };

  const handleBack = () => {
    setSelectedId(null);
    setView("list");
    scrollToTop();
  };

  return (
    <div className="stock-adjustment-manual-module">
      {view === "list" && (
        <StockAdjustmentManualList
          data={data}
          totalItems={totalItems}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          setPageSize={setPageSize}
          resetFilters={resetFilters}
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
