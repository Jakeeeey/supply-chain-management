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
  const isLocked = initialData?.status === "For Approval" || initialData?.status === "Active";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 border-none shadow-2xl">
        <DialogHeader className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {initialData ? "Product Maintenance" : "New SKU Registration"}
            </DialogTitle>
            {initialData?.status && (
              <Badge variant="outline" className="border-white/20 text-white uppercase text-[10px] tracking-widest">
                {initialData.status}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-slate-300 text-sm mt-2 font-medium max-w-2xl leading-relaxed">
            {initialData 
              ? `Reviewing record for ${initialData.product_name}. ${isLocked ? "Strategic fields are locked to maintain data integrity." : "Complete the fields below to update the record."}` 
              : "Register a new product into the system. The record will be saved as a draft for verification before activation."}
          </DialogDescription>
        </DialogHeader>
        <div className="p-8 bg-background">
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
