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
import { MessageSquare } from "lucide-react";

interface PDPRemarksModalProps {
  open: boolean;
  onClose: () => void;
  remarks: string;
}

/**
 * Modal for viewing the full rejection remarks.
 */
export function PDPRemarksModal({
  open,
  onClose,
  remarks,
}: PDPRemarksModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <MessageSquare className="h-5 w-5" />
            <DialogTitle>Rejection Remarks</DialogTitle>
          </div>
          <DialogDescription>
            The following reason was provided by the planner for rejecting this plan.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 px-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-all italic text-muted-foreground">
            &ldquo;{remarks}&rdquo;
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
