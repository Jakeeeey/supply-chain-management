// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/CreatePurchaseOrderModule.tsx
"use client";

import * as React from "react";

import { useCreatePurchaseOrder } from "./hooks/useCreatePurchaseOrder";
import { CreatePurchaseOrderToolbar } from "./components/CreatePurchaseOrderToolbar";
import { BranchAllocations } from "./components/BranchAllocations";
import { PurchaseOrderSummary } from "./components/PurchaseOrderSummary";
import { ProductPickerDialog } from "./components/ProductPickerDialog";

export default function CreatePurchaseOrderModule() {
    const po = useCreatePurchaseOrder();

    return (
        <div className="w-full p-4 sm:p-6">
            <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                    Select a branch first, then add products to that branch
                </p>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-background shadow-sm overflow-hidden w-full min-w-0">
                <div className="p-4 sm:p-6 space-y-6 w-full min-w-0">
                    <CreatePurchaseOrderToolbar
                        // supplier
                        selectedSupplier={po.selectedSupplier}
                        supplierQuery={po.supplierQuery}
                        onSupplierQueryChange={po.setSupplierQuery}
                        suppliers={po.filteredSuppliers}
                        onSelectSupplier={po.setSelectedSupplier}
                        onClearSupplier={() => po.setSelectedSupplier(null)}
                        // branches
                        branchQuery={po.branchQuery}
                        onBranchQueryChange={po.setBranchQuery}
                        branches={po.filteredBranches}
                        onAddBranch={po.addBranch}
                    />

                    <BranchAllocations
                        branches={po.selectedBranches}
                        canAddProducts={po.canAddProducts}
                        onRemoveBranch={po.removeBranch}
                        onOpenPicker={po.openProductPicker}
                        onUpdateQty={po.updateItemQty}
                        onRemoveItem={po.removeItem}
                    />
                </div>
            </div>

            <div className="mt-6">
                <PurchaseOrderSummary
                    visible={po.hasAnyItems}
                    poNumber={po.poNumber}
                    poDate={po.poDate}
                    supplier={po.selectedSupplier}
                    branches={po.selectedBranches}
                    allItemsFlat={po.allItemsFlat}
                    subtotal={po.subtotal}
                    discount={po.discount}
                    tax={po.tax}
                    total={po.total}
                    onSave={po.savePO}
                    canSave={!!po.selectedSupplier}
                />
            </div>

            <ProductPickerDialog
                open={po.productPickerOpen}
                onOpenChange={(v) => (v ? null : po.closeProductPicker())}
                branchLabel={po.activeBranch?.branchName || "—"}
                supplierName={po.selectedSupplier?.name || ""}
                categories={po.categories}
                selectedCategory={po.selectedCategory}
                onCategoryChange={po.setSelectedCategory}
                searchQuery={po.searchQuery}
                onSearchChange={po.setSearchQuery}
                products={po.filteredProducts}
                tempCart={po.tempCart}
                onToggleProduct={po.toggleProduct}
                onUpdateTempUom={po.updateTempUom}
                onRemoveFromTemp={(item) => po.toggleProduct(item)}
                onUpdateTempQty={po.updateTempQty}
                onConfirm={po.confirmAddProducts}
            />
        </div>
    );
}
