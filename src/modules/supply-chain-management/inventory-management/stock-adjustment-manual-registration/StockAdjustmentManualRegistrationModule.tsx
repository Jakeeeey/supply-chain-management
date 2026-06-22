"use client";

import { useRouter } from "next/navigation";
import { StockAdjustmentManualForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-manual-registration/components/forms/StockAdjustmentManualForm";

interface StockAdjustmentManualRegistrationModuleProps {
  userFullName?: string;
}

export default function StockAdjustmentManualRegistrationModule({
  userFullName
}: StockAdjustmentManualRegistrationModuleProps) {
  const router = useRouter();

  return (
    <div className="stock-adjustment-manual-registration-module">
      <StockAdjustmentManualForm
        id={null}
        onCancel={undefined} // Hides back-to-list, shows "Clear Form"
        onSuccess={() => {
          router.push("/scm/inventory-management/stock-adjustment-summary");
        }}
        mode="creation"
        userFullName={userFullName}
      />
    </div>
  );
}
