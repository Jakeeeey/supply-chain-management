"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryApiRow } from "../types";

interface ViewCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: CategoryApiRow | null;
}

export function ViewCategoryDialog({
  open,
  onOpenChange,
  selectedCategory,
}: ViewCategoryDialogProps) {
  if (!selectedCategory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>View Category</DialogTitle>
          <DialogDescription>
            Details for this category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Category Image</h4>
            {selectedCategory.image ? (
              <div className="relative w-full min-h-[200px] max-h-[300px] rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${selectedCategory.image}`} 
                  alt={selectedCategory.category_name} 
                  className="max-w-full max-h-[300px] object-contain drop-shadow-sm" 
                />
              </div>
            ) : (
              <div className="w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/5">
                <p className="text-sm text-muted-foreground italic">No image uploaded.</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Category Name</h4>
            <p className="text-base font-medium">{selectedCategory.category_name}</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">SKU Code</h4>
            <p className="text-base font-medium">{selectedCategory.sku_code || "-"}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
