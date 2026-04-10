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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  History as HistoryIcon,
  Hash,
  Activity,
  FileText,
  User,
  Calendar
} from "lucide-react";
import { RTSReturnType } from "../types";

interface ViewRTSReturnTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: RTSReturnType | null;
}

export function ViewRTSReturnTypeDialog({
  open,
  onOpenChange,
  selectedType,
}: ViewRTSReturnTypeDialogProps) {
  if (!selectedType) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const cleanDate = dateStr.endsWith("Z") || dateStr.includes("+") 
      ? dateStr 
      : `${dateStr.replace(" ", "T")}Z`;
    return new Date(cleanDate).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 bg-muted/40 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                <DialogTitle className="text-xl font-bold tracking-tight">Return Type Details</DialogTitle>
                <DialogDescription className="text-xs">
                    Supplier Return classification profile.
                </DialogDescription>
                </div>
            </div>
            <Badge 
              variant={selectedType.isActive ? "default" : "secondary"}
              className="rounded-full px-3"
            >
              {selectedType.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Code</span>
              </div>
              <p className="text-sm font-semibold bg-muted/20 border rounded-lg px-3 py-2">
                {selectedType.return_type_code}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Type Name</span>
              </div>
              <p className="text-sm font-semibold bg-muted/20 border rounded-lg px-3 py-2">
                {selectedType.return_type_name}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Description</span>
            </div>
            <div className="text-sm text-foreground/80 leading-relaxed px-3 py-3 bg-muted/20 border rounded-lg min-h-[80px] whitespace-pre-wrap">
              {selectedType.description || "No description provided for this classification."}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HistoryIcon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest flex-1">Audit Trail</span>
              <Separator className="flex-1 shrink opacity-50" />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Created By</span>
                        </div>
                        <p className="text-sm font-medium">{selectedType.created_by_name || "System"}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Date Created</span>
                        </div>
                        <p className="text-sm font-medium">{formatDate(selectedType.created_at)}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Updated By</span>
                        </div>
                        <p className="text-sm font-medium">{selectedType.updated_by_name || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Last Modified</span>
                        </div>
                        <p className="text-sm font-medium">{formatDate(selectedType.updated_at)}</p>
                    </div>
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
