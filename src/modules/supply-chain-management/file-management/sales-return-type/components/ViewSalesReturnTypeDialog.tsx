"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ClipboardList, 
  AlignLeft, 
  UserCircle2, 
  CalendarDays, 
  History,
  Info
} from "lucide-react";
import { SalesReturnType } from "../types";

interface ViewSalesReturnTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: SalesReturnType | null;
}

export function ViewSalesReturnTypeDialog({
  open,
  onOpenChange,
  selectedType,
}: ViewSalesReturnTypeDialogProps) {
  if (!selectedType) return null;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    const cleanDate = dateString.endsWith("Z")
      ? dateString
      : `${dateString.replace(" ", "T")}Z`;
    return new Date(cleanDate).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 bg-muted/40 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">Sales Return Type Details</DialogTitle>
              <DialogDescription className="text-xs">
                Classification for customer-returned items.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Type Name</span>
              </div>
              <p className="text-lg font-semibold tracking-tight leading-none px-3 py-2 bg-muted/20 border rounded-lg">
                {selectedType.type_name}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlignLeft className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Description</span>
              </div>
              <div className="text-sm text-foreground/80 leading-relaxed px-3 py-3 bg-muted/20 border rounded-lg min-h-[80px] whitespace-pre-wrap">
                {selectedType.description || "No description provided for this classification."}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest flex-1">Audit Trail</span>
              <Separator className="flex-1 shrink opacity-50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/30 border rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                   <UserCircle2 className="h-3 w-3" />
                   <span className="text-[9px] font-bold uppercase tracking-tighter">Created By</span>
                </div>
                <p className="text-sm font-medium">{selectedType.created_by_name || "System"}</p>
              </div>

              <div className="p-3 bg-muted/30 border rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                   <CalendarDays className="h-3 w-3" />
                   <span className="text-[9px] font-bold uppercase tracking-tighter">Date Created</span>
                </div>
                <p className="text-sm font-medium">{formatDate(selectedType.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/20 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto px-8 rounded-lg active:scale-95 transition-all"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
