"use client";

import { useState, useEffect } from "react";
import { StockConversionProduct, RFIDTag } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, X, AlertCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface RFIDManagementModalProps {
  product: StockConversionProduct | null;
  conversionDetails: { qtyToConvert: number; targetUnitId: number; convertedQuantity: number; } | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tags: RFIDTag[]) => void;
  isSubmitting: boolean;
}

export function RFIDManagementModal({ 
  product, 
  conversionDetails, 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting 
}: RFIDManagementModalProps) {
  const [rfidInput, setRfidInput] = useState("");
  const [assignedTags, setAssignedTags] = useState<RFIDTag[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRfidInput("");
      setAssignedTags([]);
    }
  }, [isOpen]);

  if (!product || !conversionDetails) return null;

  const handleAddTag = () => {
    if (!rfidInput.trim()) return;
    
    // Check for duplicates
    if (assignedTags.some(t => t.rfid_tag === rfidInput.trim())) {
      setRfidInput("");
      return;
    }

    const newTag: RFIDTag = {
      id: uuidv4(),
      rfid_tag: rfidInput.trim(),
      status: "active",
      assignedDate: new Date().toISOString().split("T")[0],
    };

    setAssignedTags(prev => [...prev, newTag]);
    setRfidInput("");
  };

  const handleGenerate = () => {
    const randomTag = Math.floor(10000000 + Math.random() * 90000000).toString();
    setRfidInput(randomTag);
  };

  const handleRemoveTag = (id: string) => {
    setAssignedTags(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = () => {
    onSubmit(assignedTags);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-primary">
            <div className="p-1.5 bg-blue-500/10 rounded-md">
              <ScanLine className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            RFID Tag Management
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm font-medium">
            {product.productDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-4 rounded-lg border border-border my-2">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Brand</div>
            <div className="text-sm font-bold text-foreground">{product.brand}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Category</div>
            <div className="text-sm font-bold text-foreground">{product.category}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Stock</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{product.quantity} {product.currentUnit}(s)</div>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Scan or Enter RFID Tag</label>
             <div className="flex flex-col sm:flex-row gap-2">
                 <Input 
                   value={rfidInput}
                   onChange={e => setRfidInput(e.target.value)}
                   placeholder="Enter RFID tag number"
                   className="flex-1 bg-background border-input focus-visible:ring-blue-500 font-medium"
                   onKeyDown={e => {
                     if (e.key === "Enter") {
                       e.preventDefault();
                       handleAddTag();
                     }
                   }}
                 />
                 <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      onClick={handleAddTag} 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest px-4 gap-2 flex-1 sm:flex-initial"
                    >
                      <ScanLine className="w-4 h-4" />
                      Add Tag
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleGenerate}
                      className="text-blue-600 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold text-xs uppercase tracking-widest flex-1 sm:flex-initial"
                    >
                      Generate
                    </Button>
                 </div>
             </div>
          </div>

          <div className="space-y-2">
             <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Assigned RFID Tags ({assignedTags.length})</span>
                {assignedTags.length > 0 && (
                   <span className="text-xs text-blue-500 font-bold">Target: {conversionDetails.convertedQuantity} Unit(S)</span>
                )}
             </div>
             
             <div className="border border-border rounded-lg min-h-[140px] max-h-[260px] overflow-y-auto bg-muted/20 p-2 space-y-2 shadow-inner">
                {assignedTags.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10 animate-in fade-in duration-500">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50">
                         <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="font-bold text-primary tracking-tight">No RFID tags assigned</p>
                      <p className="text-[11px] font-medium opacity-70">Scan or generate tags to get started</p>
                   </div>
                ) : (
                   assignedTags.map((tag, index) => (
                     <div key={tag.id} className="flex items-center justify-between bg-card p-3 rounded-md border border-border shadow-sm hover:border-blue-500/30 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs border border-blue-500/20">
                              {index + 1}
                           </div>
                           <div>
                              <div className="font-bold text-foreground text-sm tracking-tight">{tag.rfid_tag}</div>
                              <div className="text-[10px] text-muted-foreground font-medium">Assigned: {tag.assignedDate}</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="hidden sm:inline-block px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded uppercase tracking-widest border border-emerald-500/20">
                              Active
                           </span>
                           <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 text-muted-foreground font-bold uppercase tracking-tighter hover:text-foreground">
                              Deactivate
                           </Button>
                           <button onClick={() => handleRemoveTag(tag.id as string)} className="text-destructive/60 hover:text-destructive p-1.5 rounded-full hover:bg-destructive/10 transition-colors">
                              <X className="w-4 h-4" />
                           </button>
                        </div>
                     </div>
                   ))
                )}
             </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-sm flex gap-3 items-start text-blue-700 dark:text-blue-400">
             <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
             <div className="space-y-1">
                <div className="text-[10px] font-black text-blue-600 dark:text-blue-300 uppercase tracking-widest">RFID Setup Guidelines</div>
                <ul className="list-disc pl-4 text-[11px] font-bold opacity-80 space-y-1 uppercase tracking-tighter">
                   <li>Multiple RFID tags can be tracked per product variant</li>
                   <li>Tags must be unique and registered in the system</li>
                   <li>Status can be toggled after conversion if needed</li>
                </ul>
             </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex sm:flex-row flex-col gap-3 justify-between items-center w-full border-t border-border pt-4">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center sm:text-left">Finalize setup to confirm conversion</div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-md px-6 font-bold text-xs uppercase tracking-widest border-border flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button 
               onClick={handleSubmit} 
               disabled={isSubmitting || assignedTags.length === 0}
               className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-xs uppercase tracking-widest px-6 gap-2 flex-1 sm:flex-initial shadow-md shadow-emerald-500/20"
            >
              {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Confirm Conversion
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
