"use client";

import { useRouter } from "next/navigation";
import { StockAdjustmentManualForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-registration/components/forms/StockAdjustmentManualForm";

export default function StockAdjustmentManualRegistrationModule() {
  const router = useRouter();

  return (
    <div className="stock-adjustment-manual-registration-module">
      <StockAdjustmentManualForm
        id={null}
        onCancel={undefined} // Hides back-to-list, shows "Clear Form"
        onSuccess={() => {
          router.push("/scm/inventory-management/stock-adjustment-manual-summary");
        }}
        mode="creation"
      />
    </div>
  );
}
