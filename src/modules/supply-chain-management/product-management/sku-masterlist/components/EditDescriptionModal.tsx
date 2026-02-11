"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Info, FileText, Tag, Package, Factory, LayoutGrid, Barcode, Box } from "lucide-react";
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { CellHelpers } from "../../sku-creation/utils/sku-helpers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditDescriptionModalProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number | string, description: string) => Promise<void>;
  isLoading?: boolean;
  masterData: MasterData | null;
}

export function EditDescriptionModal({
  sku,
  isOpen,
  onClose,
  onSave,
  isLoading,
  masterData,
}: EditDescriptionModalProps) {
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (sku) {
      setDescription(sku.description || "");
    }
  }, [sku]);

  const handleSave = async () => {
    if (!sku) return;
    const id = (sku as any).id || (sku as any).product_id;
    await onSave(id, description);
    onClose();
  };

  const InfoItem = ({ label, value, icon: Icon }: { label: string, value: string | number, icon: any }) => (
    <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-muted-foreground/5 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        <Icon className="h-3 w-3 text-primary/60" />
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground/90 truncate" title={String(value)}>
        {value || "—"}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-none">
        <DialogHeader className="p-6 pb-4 bg-background border-b">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight">Product Details & Maintenance</DialogTitle>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-primary font-bold uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
                  {sku?.product_code || "SKU-CODE"}
                </p>
                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="text-xs text-muted-foreground font-medium">{sku?.inventory_type || "Regular"} Product</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Header Data Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-3">
                <InfoItem label="Product Name" value={sku?.product_name || "—"} icon={Package} />
              </div>
              <InfoItem label="Category" value={CellHelpers.renderMasterText(sku?.product_category, masterData?.categories)} icon={LayoutGrid} />
              <InfoItem label="Brand" value={CellHelpers.renderMasterText(sku?.product_brand, masterData?.brands)} icon={Tag} />
              <InfoItem label="Supplier" value={CellHelpers.renderMasterText(sku?.product_supplier, masterData?.suppliers)} icon={Factory} />
              
              {sku?.barcode && <InfoItem label="Barcode" value={sku.barcode} icon={Barcode} />}
              {sku?.flavor && <InfoItem label="Flavor" value={sku.flavor} icon={Box} />}
              {sku?.size && <InfoItem label="Size" value={sku.size} icon={Box} />}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Description (Editable)
                </Label>
                <span className="text-[10px] text-primary/60 font-medium">Click to edit</span>
              </div>
              <Textarea
                id="description"
                placeholder="Enter product description..."
                className="min-h-[140px] resize-none focus-visible:ring-primary/20 transition-all border-primary/20 bg-primary/[0.02] active:bg-background focus:bg-background"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="mt-0.5 pt-0.5">
                <Info className="h-4 w-4 text-amber-600" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-amber-900/80 leading-relaxed font-medium transition-opacity">
                  Data Integrity Guard Active:
                </p>
                <p className="text-[11px] text-amber-800/60 leading-relaxed">
                  Only the <span className="font-bold">Description</span> can be modified for active master records. All primary identifier fields are locked to maintain synchronization across supply chain modules.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 bg-muted/30 border-t flex flex-row items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} className="font-semibold text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading} 
            className="px-8 bg-primary hover:bg-primary/90 text-white font-bold"
          >
            {isLoading ? "Saving Changes..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
