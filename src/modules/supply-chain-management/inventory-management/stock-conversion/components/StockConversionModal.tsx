"use client";

import { useState, useEffect } from "react";
import { StockConversionProduct } from "../types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cuboid, ArrowRight } from "lucide-react";

interface StockConversionModalProps {
  product: StockConversionProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (qtyToConvert: number, targetUnitId: number, convertedQuantity: number) => void;
}

export function StockConversionModal({ product, isOpen, onClose, onConfirm }: StockConversionModalProps) {
  const [qtyToConvert, setQtyToConvert] = useState<number | "">("");
  const [selectedTargetUnit, setSelectedTargetUnit] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQtyToConvert("");
      setSelectedTargetUnit(null);
    }
  }, [isOpen]);

  if (!product) return null;

  // Calculate converted amount
  const targetUnit = product.availableUnits?.find(u => u.unitId === selectedTargetUnit);
  
  let convertedAmount = 0;
  if (qtyToConvert && targetUnit) {
      // Get the source factor (how many base units are in one item of the current unit)
      let sourceFactor = 1;
      const currentUnitName = product.currentUnit.toLowerCase();
      
      if (currentUnitName.includes('box')) {
          sourceFactor = product.unitOfBox || 24;
      } else if (currentUnitName.includes('pack')) {
          sourceFactor = product.pack || 6;
      } else if (currentUnitName.includes('tie')) {
          sourceFactor = product.tie || 12; // Default to 12 if tie is 0
      } else if (currentUnitName.includes('piece')) {
          sourceFactor = 1;
      } else {
          sourceFactor = 1; 
      }
      
      // Ensure sourceFactor is never 0
      if (sourceFactor <= 0) sourceFactor = 1;

      // Get target factor
      const targetFactor = targetUnit.conversionFactor || 1;
      
      // Conversion formula: (Quantity * Source Factor) / Target Factor
      // Example: 1 Box (24pcs) to Pack (6pcs) => (1 * 24) / 6 = 4 Packs
      // Example: 24 Pieces (1pc) to Box (24pcs) => (24 * 1) / 24 = 1 Box
      
      if (targetFactor > 0) {
          convertedAmount = (Number(qtyToConvert) * sourceFactor) / targetFactor;
          // Round to 2 decimal places if needed, but usually these are whole numbers in this context
          if (convertedAmount % 1 !== 0) {
              convertedAmount = Number(convertedAmount.toFixed(2));
          }
      }
  }

  const handleConfirm = () => {
    console.log("[StockConversionModal] Confirm clicked. Qty:", qtyToConvert, "TargetUnit:", selectedTargetUnit, "Amount:", convertedAmount);
    if (qtyToConvert && selectedTargetUnit && convertedAmount > 0) {
      onConfirm(Number(qtyToConvert), selectedTargetUnit, convertedAmount);
    } else {
      console.warn("[StockConversionModal] Confirm blocked: Missing inputs or amount is 0");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-primary">
            <Cuboid className="w-5 h-5 text-blue-500" />
            Convert Stock Units
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {product.productDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border mb-2 mt-2">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Brand</div>
            <div className="text-sm font-semibold">{product.brand}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</div>
            <div className="text-sm font-semibold">{product.category}</div>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Current Stock</Label>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{product.quantity}</div>
              <div className="text-xs font-bold text-blue-500/80 uppercase tracking-tighter">{product.currentUnit}(S)</div>
            </div>
          </div>

          <div className="space-y-2">
             <Label htmlFor="qtyToConvert" className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Quantity to Convert</Label>
             <Input 
                 id="qtyToConvert" 
                 type="number" 
                 min={1} 
                 max={product.quantity}
                 value={qtyToConvert}
                 onChange={(e) => setQtyToConvert(e.target.value ? Number(e.target.value) : "")}
                 placeholder="Enter quantity"
                 className="bg-background border-input focus-visible:ring-blue-500"
             />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Convert To</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {product.availableUnits?.map(u => (
                  <div 
                    key={u.unitId}
                    className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                       selectedTargetUnit === u.unitId 
                         ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500 shadow-sm" 
                         : "border-border bg-card hover:border-blue-400/50 hover:bg-accent/50"
                    }`}
                    onClick={() => setSelectedTargetUnit(u.unitId)}
                  >
                     <div className={`font-bold ${selectedTargetUnit === u.unitId ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}>
                        {u.name}
                     </div>
                     <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                         {u.name.toLowerCase().includes('pack') && product.pack ? `Pack (${product.pack} pcs)` : ''}
                         {u.name.toLowerCase().includes('piece') ? `Individual Pieces` : ''}
                         {u.name.toLowerCase().includes('box') ? `Full Box` : ''}
                     </div>
                  </div>
               ))}
               {(!product.availableUnits || product.availableUnits.length === 0) && (
                  <div className="col-span-full text-xs text-muted-foreground italic p-4 border border-dashed rounded-md bg-muted/20 text-center">
                    No target units available for conversion.
                  </div>
               )}
            </div>
          </div>

          {convertedAmount > 0 && (
             <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                <div>
                   <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tight">Converted Result</div>
                   <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{convertedAmount}</div>
                   <div className="text-xs font-bold text-emerald-600/80 uppercase tracking-tighter">{targetUnit?.name}(S)</div>
                </div>
                <div className="bg-emerald-500/20 p-2 rounded-full">
                  <ArrowRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
             </div>
          )}

          <div className="bg-muted/50 p-3 rounded-md text-[11px] text-muted-foreground mt-4 border border-border">
             <div className="font-bold text-foreground mb-1.5 uppercase tracking-wide text-[10px]">Reference Factors:</div>
             <ul className="grid grid-cols-2 gap-y-1 gap-x-4 list-none">
                <li className="flex justify-between border-b border-border/50 pb-0.5">
                  <span className="opacity-80">Unit of Box:</span> 
                  <span className="font-bold text-foreground">{product.unitOfBox || 24} pc</span>
                </li>
                <li className="flex justify-between border-b border-border/50 pb-0.5">
                  <span className="opacity-80">Pack:</span>
                  <span className="font-bold text-foreground">{product.pack || 6} pc</span>
                </li>
                <li className="flex justify-between border-b border-border/50 pb-0.5">
                  <span className="opacity-80">Tie:</span>
                  <span className="font-bold text-foreground">{product.tie || 0} pc</span>
                </li>
             </ul>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-md font-bold text-xs uppercase tracking-widest border-border hover:bg-accent transition-colors">
            Cancel
          </Button>
          <Button 
             onClick={handleConfirm} 
             disabled={!qtyToConvert || !selectedTargetUnit || convertedAmount <= 0}
             className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-md font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-500/20"
          >
            Confirm Conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
