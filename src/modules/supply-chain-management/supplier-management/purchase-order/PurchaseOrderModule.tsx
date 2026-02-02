"use client";

import { useState } from "react";

import { PurchaseOrderHeader } from "./components/header/PurchaseOrderHeader";
import { SupplierSelect } from "@/modules/supply-chain-management/supplier-management/purchase-order/components/create/SupplierSelect";
import { BranchSelect } from "@/modules/supply-chain-management/supplier-management/purchase-order/components/create/BranchSelect";
import { EmptyState } from "@/modules/supply-chain-management/supplier-management/purchase-order/components/create/EmptyState";
import { SavePOButton } from "@/modules/supply-chain-management/supplier-management/purchase-order/components/create/SavePOButton";
import { PurchaseOrderSummary } from "@/modules/supply-chain-management/supplier-management/purchase-order/components/create/PurchaseOrderSummary";
export function PurchaseOrderModule() {
    const [supplier, setSupplier] = useState<string>();
    const [branches, setBranches] = useState<string[]>([]);

    const showSummary = supplier && branches.length > 0;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <PurchaseOrderHeader />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Form */}
                <div className="lg:col-span-2 space-y-6 rounded-lg border p-6">
                    <SupplierSelect
                        value={supplier}
                        onChange={setSupplier}
                    />

                    <BranchSelect
                        value={branches}
                        onChange={setBranches}
                    />

                    {!showSummary && <EmptyState />}
                </div>

                {/* Right: Summary */}
                {showSummary && (
                    <PurchaseOrderSummary supplier={supplier!} />
                )}
            </div>

            <div className="flex justify-end">
                <SavePOButton />
            </div>
        </div>
    );
}
