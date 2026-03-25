import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClusterWithAreas } from "../types";

// =============================================================================
// PROPS
// =============================================================================

interface ViewClusterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: ClusterWithAreas | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ViewClusterDialog({
  open,
  onOpenChange,
  cluster,
}: ViewClusterDialogProps) {
  if (!cluster) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>View Cluster Details</DialogTitle>
          <DialogDescription>
            Detailed information about the selected cluster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Cluster Name
              </p>
              <p className="text-base font-medium mt-1">
                {cluster.cluster_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Minimum Amount
              </p>
              <p className="text-base font-medium mt-1">
                {Number(cluster.minimum_amount).toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Associated Areas</h4>
            {cluster.areas && cluster.areas.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Province</TableHead>
                      <TableHead>City / Municipality</TableHead>
                      <TableHead>Barangay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cluster.areas.map((area, idx) => (
                      <TableRow key={area.id ?? idx}>
                        <TableCell className="font-medium">{area.province || "-"}</TableCell>
                        <TableCell>{area.city || "-"}</TableCell>
                        <TableCell>{area.baranggay || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No areas defined.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
