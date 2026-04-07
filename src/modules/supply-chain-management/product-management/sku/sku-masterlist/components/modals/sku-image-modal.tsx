"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { useEffect, useState } from "react";
import { ImageUpload } from "../../../sku-creation/components/ImageUpload";
import { skuService } from "../../../sku-creation/services/sku";

interface SKUImageModalProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number | string, imageId: string | null) => Promise<void>;
  isLoading?: boolean;
}

export function SKUImageModal({
  sku,
  isOpen,
  onClose,
  onSave,
  isLoading,
}: SKUImageModalProps) {
  const [productImage, setProductImage] = useState<string | null>(null);

  useEffect(() => {
    if (sku && isOpen)
      setProductImage(sku.main_image || sku.product_images || null);
    else if (!isOpen) setProductImage(null);
  }, [sku, isOpen]);

  const handleSave = async () => {
    if (!sku) return;
    await onSave((sku.id || sku.product_id)!, productImage);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Update Product Image</DialogTitle>
          <DialogDescription>
            {sku?.product_name}
            {sku?.product_code ? ` · ${sku.product_code}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <ImageUpload
            value={productImage}
            onChange={setProductImage}
            onUpload={(fd) => skuService.uploadImage(fd, "main")}
            disabled={isLoading}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
