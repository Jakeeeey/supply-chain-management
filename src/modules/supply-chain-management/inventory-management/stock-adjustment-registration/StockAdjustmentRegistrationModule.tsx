"use client";

import { useState } from "react";
import { StockAdjustmentForm } from "@/modules/supply-chain-management/inventory-management/stock-adjustment-registration/components/forms/StockAdjustmentForm";

interface StockAdjustmentModuleProps {
  mode?: "creation" | "posting";
}

export default function StockAdjustmentModule({ mode = "creation" }: StockAdjustmentModuleProps) {
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="stock-adjustment-module">
      <StockAdjustmentForm
        key={formKey}
        id={null}
        onCancel={undefined} // Hides cancel/back-to-list buttons, shows "Clear Form" instead
        onSuccess={() => {
          setFormKey((prev) => prev + 1);
        }}
        mode={mode}
      />
    </div>
  );
}
