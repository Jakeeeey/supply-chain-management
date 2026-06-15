"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandApiRow } from "../types";

interface ViewBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBrand: BrandApiRow | null;
}

export function ViewBrandDialog({
  open,
  onOpenChange,
  selectedBrand,
}: ViewBrandDialogProps) {
  if (!selectedBrand) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>View Brand</DialogTitle>
          <DialogDescription>
            Details for this brand.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Brand Image</h4>
            {selectedBrand.image ? (
              <div className="relative w-full h-[200px] rounded-lg border bg-muted/30 overflow-hidden">
                <Image 
                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${selectedBrand.image}`} 
                  alt={selectedBrand.brand_name} 
                  fill
                  className="object-contain p-2 rounded-md" 
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/5">
                <p className="text-sm text-muted-foreground italic">No image uploaded.</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Brand Name</h4>
            <p className="text-base font-medium">{selectedBrand.brand_name}</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">SKU Code</h4>
            <p className="text-base font-medium">{selectedBrand.sku_code || "-"}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
