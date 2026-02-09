"use client";

import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SKUForm } from "@/modules/supply-chain-management/product-management/sku-creation/components/forms/SKUForm";
import { Badge } from "@/components/ui/badge";

interface SKUModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialData?: SKU;
  masterData: MasterData | null;
  onSubmit: (data: SKU) => Promise<void>;
  loading?: boolean;
}

export function SKUModal({ open, setOpen, initialData, masterData, onSubmit, loading }: SKUModalProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center gap-2">
            <DialogTitle>
              {initialData ? "Edit SKU" : "Register New SKU"}
            </DialogTitle>
            {initialData?.status && (
              <Badge variant="secondary">
                {initialData.status}
              </Badge>
            )}
          </div>
          <DialogDescription>
            {initialData 
              ? `Manage product details for ${initialData.product_name}.` 
              : "Enter product information to register a new SKU."}
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <SKUForm 
            initialData={initialData} 
            masterData={masterData}
            onSubmit={async (data) => {
              await onSubmit(data);
              setOpen(false);
            }} 
            loading={loading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
