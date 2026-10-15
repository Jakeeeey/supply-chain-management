"use client";

import * as React from "react";
import type { VehicleJobOrder, CompleteJOPayload } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCheck } from "lucide-react";

interface CompleteJODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrder: VehicleJobOrder | null;
  onSubmit: (payload: CompleteJOPayload) => Promise<void>;
  loading: boolean;
}

export function CompleteJODialog({
  open,
  onOpenChange,
  jobOrder,
  onSubmit,
  loading,
}: CompleteJODialogProps) {
  const [remarks, setRemarks] = React.useState<string>("");
  const [laborCost, setLaborCost] = React.useState<string>("");
  const [finalOdometer, setFinalOdometer] = React.useState<string>("");

  React.useEffect(() => {
    if (open && jobOrder) {
      setRemarks("");
      setLaborCost("");
      setFinalOdometer(
        jobOrder.odometer_reading ? String(jobOrder.odometer_reading) : ""
      );
    }
  }, [open, jobOrder]);

  if (!jobOrder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      job_order_id: jobOrder.id,
      completion_remarks: remarks,
      labor_cost: laborCost ? Number(laborCost) : 0,
      final_odometer: finalOdometer ? Number(finalOdometer) : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCheck className="h-5 w-5 text-emerald-600" />
            Complete Job Order
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="bg-muted/40 p-3 rounded-md text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">JO Number:</span>
              <span className="font-semibold">{jobOrder.jo_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span>{jobOrder.jo_type}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="completionRemarks">Completion Remarks *</Label>
            <Textarea
              id="completionRemarks"
              placeholder="Summary of repair actions done, test drive results, or maintenance notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="laborCost">Labor Cost (₱)</Label>
              <Input
                id="laborCost"
                type="number"
                placeholder="0.00"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="finalOdometer">Post-Service Odometer (km)</Label>
              <Input
                id="finalOdometer"
                type="number"
                placeholder="e.g. 45200"
                value={finalOdometer}
                onChange={(e) => setFinalOdometer(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !remarks.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Closing JO..." : "Complete & Close JO"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
