"use client";

import { useState, useEffect } from "react";
import { useStockAdjustment } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-posting/hooks/useStockAdjustment";
import { StockAdjustmentForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-posting/components/forms/StockAdjustmentForm";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

interface StockAdjustmentModuleProps {
  mode?: "creation" | "posting";
  initialId?: number | null;
}

export default function StockAdjustmentModule({ mode = "creation", initialId = null }: StockAdjustmentModuleProps) {
  const { data, isLoading, error, refresh } = useStockAdjustment("Unposted");
  const [selectedId, setSelectedId] = useState<number | null>(initialId || null);

  // Require manual document number selection, do not auto-select first item
  useEffect(() => {
    if (!isLoading) {
      if (initialId && data.some((item) => item.id === initialId)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedId(initialId);
      } else if (data.length === 0) {
        setSelectedId(null);
      }
    }
  }, [isLoading, data, initialId]);

  if (isLoading && selectedId === null && data.length === 0) {
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

  if (!isLoading && data.length === 0 && selectedId === null) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-card border border-border/40 rounded-xl max-w-7xl mx-auto w-full mt-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-foreground">No Pending Stock Adjustments</h2>
        <p className="text-sm text-muted-foreground mt-2 font-medium">
          There are currently no draft or unposted stock adjustments to review.
        </p>
      </div>
    );
  }

  return (
    <div className="stock-adjustment-module">
      <StockAdjustmentForm
        key={selectedId || "empty"} // Force remounting form when selected document changes
        id={selectedId}
        onCancel={undefined} // Hides cancel/back-to-list buttons, shows "Reset Changes" instead
        onSuccess={() => {
          setSelectedId(null); // Reset selection after post/delete
          refresh();
        }}
        mode={mode}
        unpostedList={data}
        onSelectId={setSelectedId}
      />
    </div>
  );
}
