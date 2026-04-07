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
<<<<<<< HEAD
<<<<<<< HEAD
import { useState } from "react";
=======
import { useEffect, useState } from "react";
>>>>>>> 1b6130b (feat(sku): add multi-image gallery support and modal)
=======
import { useState } from "react";
>>>>>>> 3d63756 (cleared run eslint issue)
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
<<<<<<< HEAD
<<<<<<< HEAD
  const [prevSkuId, setPrevSkuId] = useState<string | number | undefined>(undefined);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);

  const currentSkuId = sku ? (sku.id || sku.product_id) : undefined;

  if (currentSkuId !== prevSkuId || isOpen !== prevIsOpen) {
    setPrevSkuId(currentSkuId);
    setPrevIsOpen(isOpen);
    
    if (isOpen && sku) {
      setProductImage(sku.main_image || sku.product_images || null);
    } else if (!isOpen) {
      setProductImage(null);
    }
  }
=======
=======
  const [prevSkuId, setPrevSkuId] = useState<string | number | undefined>(undefined);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);
>>>>>>> 3d63756 (cleared run eslint issue)

  const currentSkuId = sku ? (sku.id || sku.product_id) : undefined;

  if (currentSkuId !== prevSkuId || isOpen !== prevIsOpen) {
    setPrevSkuId(currentSkuId);
    setPrevIsOpen(isOpen);
    
    if (isOpen && sku) {
      setProductImage(sku.main_image || sku.product_images || null);
<<<<<<< HEAD
    else if (!isOpen) setProductImage(null);
  }, [sku, isOpen]);
>>>>>>> 1b6130b (feat(sku): add multi-image gallery support and modal)
=======
    } else if (!isOpen) {
      setProductImage(null);
    }
  }
>>>>>>> 3d63756 (cleared run eslint issue)

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
