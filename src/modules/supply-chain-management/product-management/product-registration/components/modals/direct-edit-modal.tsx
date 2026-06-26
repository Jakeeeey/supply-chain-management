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
import { Input } from "@/components/ui/input";
import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { Combobox } from "@/modules/supply-chain-management/product-management/sku/sku-creation/components/Combobox";

interface DirectEditModalProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number | string, data: Partial<SKU>) => Promise<void>;
  isLoading?: boolean;
  masterData: MasterData | null;
}

export function DirectEditModal({
  sku,
  isOpen,
  onClose,
  onSave,
  isLoading,
  masterData,
}: DirectEditModalProps) {
  const [formData, setFormData] = useState<Partial<SKU>>({});

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setFormData({});
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (sku && isOpen) {
      const timer = setTimeout(() => {
        setFormData({
          product_name: sku.product_name,
          product_supplier: sku.product_supplier,
          product_class: sku.product_class,
          product_segment: sku.product_segment,
          product_section: sku.product_section,
          description: sku.description,
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sku, isOpen]);

  const handleSave = async () => {
    if (!sku) return;
    const id = sku.id || sku.product_id;
    try {
      await onSave(id!, formData);
      onClose();
    } catch {
      // Keep modal open on validation error
    }
  };

  const isSaveDisabled =
    isLoading ||
    !formData.product_name ||
    !formData.product_supplier ||
    !formData.description ||
    !formData.product_class ||
    !formData.product_segment ||
    !formData.product_section;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden border-none max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 bg-background border-b shrink-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight">
                Edit Product
              </DialogTitle>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-primary font-bold uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
                  {sku?.product_code || "SKU-CODE"}
                </p>
                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="text-xs text-muted-foreground font-medium">
                  {sku?.inventory_type || "Regular"} Product
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Product Name *
              </Label>
              <Input 
                value={formData.product_name || ""} 
                onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Supplier *
              </Label>
              <Combobox
                options={(masterData?.suppliers || []).map((c) => ({ value: c.id.toString(), label: c.name }))}
                value={formData.product_supplier?.toString() || ""}
                onValueChange={(v) => setFormData(prev => ({ ...prev, product_supplier: v ? parseInt(v) : undefined }))}
                placeholder="Select Supplier"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Description *
              </Label>
              <Textarea
                placeholder="Enter product description..."
                className="min-h-[120px] resize-none"
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Taxonomy *
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <Combobox
                  options={(masterData?.classes || []).map((c) => ({ value: c.id.toString(), label: c.name }))}
                  value={formData.product_class?.toString() || ""}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, product_class: v ? parseInt(v) : undefined }))}
                  placeholder="Select Class"
                  disabled={isLoading}
                />
                <Combobox
                  options={(masterData?.segments || []).map((s) => ({ value: s.id.toString(), label: s.name }))}
                  value={formData.product_segment?.toString() || ""}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, product_segment: v ? parseInt(v) : undefined }))}
                  placeholder="Select Segment"
                  disabled={isLoading}
                />
                <Combobox
                  options={(masterData?.sections || []).map((s) => ({ value: s.id.toString(), label: s.name }))}
                  value={formData.product_section?.toString() || ""}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, product_section: v ? parseInt(v) : undefined }))}
                  placeholder="Select Section"
                  disabled={isLoading}
                />
              </div>
            </div>
        </div>

        <DialogFooter className="p-6 bg-background border-t shrink-0 flex flex-row items-center justify-end gap-3 z-10">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="px-8 bg-primary hover:bg-primary/90 text-white font-bold"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
