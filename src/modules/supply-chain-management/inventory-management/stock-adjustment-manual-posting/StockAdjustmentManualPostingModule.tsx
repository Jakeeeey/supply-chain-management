"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStockAdjustmentManual } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-posting/hooks/useStockAdjustmentManual";
import { StockAdjustmentManualForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-posting/components/forms/StockAdjustmentManualForm";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

interface StockAdjustmentManualPostingModuleProps {
  mode?: "creation" | "posting";
  initialId?: number | null;
}

export default function StockAdjustmentManualPostingModule({ 
  mode = "posting", 
  initialId = null 
}: StockAdjustmentManualPostingModuleProps) {
  const router = useRouter();
  const { unfilteredData: data = [], isLoading, error, refresh } = useStockAdjustmentManual("Unposted");
  const [selectedId, setSelectedId] = useState<number | null>(initialId || null);

  // Automatically load first unposted draft or auto-switch to next available draft when current is posted/deleted
  const activeId = (() => {
    if (selectedId && data.some((item) => item.id === selectedId)) {
      return selectedId;
    }
    if (initialId && data.some((item) => item.id === initialId)) {
      return initialId;
    }
    return data[0]?.id || null;
  })();

  if (isLoading && activeId === null && data.length === 0) {
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

  if (!isLoading && data.length === 0 && activeId === null) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-card border border-border/40 rounded-xl max-w-7xl mx-auto w-full mt-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-foreground">No Pending Stock Adjustments</h2>
        <p className="text-sm text-muted-foreground mt-2 font-medium">
          There are currently no draft or unposted manual stock adjustments to review.
        </p>
      </div>
    );
  }

  return (
    <div className="stock-adjustment-manual-posting-module">
      {activeId && (
        <StockAdjustmentManualForm
          key={activeId} // Force remounting form when selected document changes
          id={activeId}
          onCancel={undefined} // Hides cancel/back-to-list buttons, shows "Reset Changes" instead (implied by no onCancel)
          onSuccess={() => {
            router.push("/scm/inventory-management/stock-adjustment-manual-summary");
          }}
          mode={mode}
          unpostedList={data}
          onSelectId={setSelectedId}
        />
      )}
    </div>
  );
}

