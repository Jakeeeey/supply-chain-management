"use client";

import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SKUForm } from "@/modules/supply-chain-management/product-management/sku/sku-creation/components/forms/SKUForm";

interface DirectCreationModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialData?: SKU;
  masterData: MasterData | null;
  onSubmit: (data: SKU) => Promise<void>;
  loading?: boolean;
}

export function DirectCreationModal({
  open,
  setOpen,
  initialData,
  masterData,
  onSubmit,
  loading,
}: DirectCreationModalProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center gap-2">
            <DialogTitle>
              {initialData ? "Edit Product" : "Register New Product"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {initialData
              ? `Manage product details for ${initialData.product_name}.`
              : "Enter product information to register a new product directly into the masterlist."}
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 max-h-[75vh] overflow-y-auto pb-4">
          <SKUForm
            initialData={initialData}
            masterData={masterData}
            onSubmit={async (data) => {
              try {
                await onSubmit(data);
                setOpen(false);
              } catch {
                // Keep modal open on validation error
              }
            }}
            loading={loading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
