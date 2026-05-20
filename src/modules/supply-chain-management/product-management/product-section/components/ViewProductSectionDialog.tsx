import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductSectionApiRow } from "../types";

interface ViewProductSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductSection: ProductSectionApiRow | null;
}

export function ViewProductSectionDialog({
  open,
  onOpenChange,
  selectedProductSection,
}: ViewProductSectionDialogProps) {
  if (!selectedProductSection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View Product Section</DialogTitle>
          <DialogDescription>
            Details for this product section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Section Name</h4>
            <p className="text-base font-semibold">{selectedProductSection.section_name}</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {selectedProductSection.description || "—"}
            </p>
          </div>

          {selectedProductSection.created_at && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Created At</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedProductSection.created_at).toLocaleString()}
              </p>
            </div>
          )}

          {selectedProductSection.updated_at && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Updated At</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedProductSection.updated_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
