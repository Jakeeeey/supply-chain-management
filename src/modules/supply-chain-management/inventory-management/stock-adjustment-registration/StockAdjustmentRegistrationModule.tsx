"use client";

import { useRouter } from "next/navigation";
import { StockAdjustmentForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/components/forms/StockAdjustmentForm";

interface StockAdjustmentModuleProps {
  mode?: "creation" | "posting";
}

export default function StockAdjustmentModule({ mode = "creation" }: StockAdjustmentModuleProps) {
  const router = useRouter();

  return (
    <div className="stock-adjustment-module">
      <StockAdjustmentForm
        id={null}
        onCancel={undefined} // Hides cancel/back-to-list buttons, shows "Clear Form" instead
        onSuccess={() => {
          router.push("/scm/inventory-management/stock-adjustment-summary");
        }}
        mode={mode}
      />
    </div>
  );
}
