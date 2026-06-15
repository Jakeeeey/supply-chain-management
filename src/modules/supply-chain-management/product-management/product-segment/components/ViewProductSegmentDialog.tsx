import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductSegmentApiRow } from "../types";

interface ViewProductSegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductSegment: ProductSegmentApiRow | null;
}

export function ViewProductSegmentDialog({
  open,
  onOpenChange,
  selectedProductSegment,
}: ViewProductSegmentDialogProps) {
  if (!selectedProductSegment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View Product Segment</DialogTitle>
          <DialogDescription>
            Details for this product segment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Segment Name</h4>
            <p className="text-base font-semibold">{selectedProductSegment.segment_name}</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {selectedProductSegment.description || "—"}
            </p>
          </div>

          {selectedProductSegment.created_at && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Created At</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedProductSegment.created_at).toLocaleString()}
              </p>
            </div>
          )}

          {selectedProductSegment.updated_at && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground">Updated At</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(selectedProductSegment.updated_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
