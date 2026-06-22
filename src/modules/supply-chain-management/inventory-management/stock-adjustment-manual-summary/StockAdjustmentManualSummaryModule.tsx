"use client";

import { useRouter } from "next/navigation";
import { useStockAdjustmentManual } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-summary/hooks/useStockAdjustmentManual";
import { StockAdjustmentManualList } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-summary/components/StockAdjustmentManualList";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

export default function StockAdjustmentManualSummaryModule() {
  const router = useRouter();
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
    branches,
    suppliers,
    stats,
    filters 
  } = useStockAdjustmentManual();

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

  const handleDetail = (id: number) => {
    router.push(`/scm/inventory-management/stock-adjustment-manual-posting?id=${id}`);
  };

  return (
    <div className="stock-adjustment-manual-summary-module">
      <StockAdjustmentManualList
        data={data}
        totalItems={totalItems}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        setPageSize={setPageSize}
        resetFilters={resetFilters}
        onDetail={handleDetail}
        branches={branches}
        suppliers={suppliers}
        stats={stats}
        filters={filters}
        onReload={refresh}
      />
    </div>
  );
}
