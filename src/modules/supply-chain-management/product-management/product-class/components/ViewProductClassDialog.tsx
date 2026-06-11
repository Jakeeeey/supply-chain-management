import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductClassApiRow } from "../types";

interface ViewProductClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductClass: ProductClassApiRow | null;
}

export function ViewProductClassDialog({
  open,
  onOpenChange,
  selectedProductClass,
}: ViewProductClassDialogProps) {
  if (!selectedProductClass) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View Product Class</DialogTitle>
          <DialogDescription>
            Details for this product class.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Class Name</h4>
            <p className="text-base font-semibold">{selectedProductClass.class_name}</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {selectedProductClass.description || "—"}
            </p>
          </div>

          {selectedProductClass.created_at && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Created At</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedProductClass.created_at).toLocaleString()}
              </p>
            </div>
          )}

          {selectedProductClass.updated_at && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Updated At</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedProductClass.updated_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
