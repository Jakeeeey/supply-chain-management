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
      // In this logic, we assume unitOfBox is how many base pieces are in the current unit
      // and targetUnit.conversionFactor is how many base pieces are in the target.
      // E.g. Box has 24 pieces. Target Pack has 6 pieces.
      // Converted amount = (qtyToConvert * 24) / 6 = qtyToConvert * 4 packs
      
      // If we don't have accurate conversion factors, we can rely on standard unit naming
      let multiplier = 1;
      const tName = targetUnit.name.toLowerCase();
      
      if (tName.includes('pack') && product.pack) {
          multiplier = (product.unitOfBox || 24) / product.pack;
      } else if (tName.includes('piece')) {
          multiplier = product.unitOfBox || 24;
      }
      
      convertedAmount = Number(qtyToConvert) * multiplier;
  }

  const handleConfirm = () => {
    if (qtyToConvert && selectedTargetUnit && convertedAmount > 0) {
      onConfirm(Number(qtyToConvert), selectedTargetUnit, convertedAmount);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-blue-900">
            <Cuboid className="w-5 h-5 text-blue-600" />
            Convert Stock Units
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            {product.productDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2 mt-2">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Brand</div>
            <div className="text-sm font-medium">{product.brand}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Category</div>
            <div className="text-sm font-medium">{product.category}</div>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-slate-600">Current Stock</Label>
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
              <div className="text-2xl font-bold text-blue-900">{product.quantity}</div>
              <div className="text-xs text-blue-700">{product.currentUnit}(S)</div>
            </div>
          </div>

          <div className="space-y-2">
             <Label htmlFor="qtyToConvert" className="text-sm font-medium text-slate-600">Quantity to Convert</Label>
             <Input 
                 id="qtyToConvert" 
                 type="number" 
                 min={1} 
                 max={product.quantity}
                 value={qtyToConvert}
                 onChange={(e) => setQtyToConvert(e.target.value ? Number(e.target.value) : "")}
                 placeholder="Enter quantity"
             />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-600">Convert To</Label>
            <div className="grid grid-cols-2 gap-3">
               {product.availableUnits?.map(u => (
                  <div 
                    key={u.unitId}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                       selectedTargetUnit === u.unitId 
                         ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" 
                         : "border-slate-200 hover:border-slate-300"
                    }`}
                    onClick={() => setSelectedTargetUnit(u.unitId)}
                  >
                     <div className="font-semibold text-slate-800">{u.name}</div>
                     <div className="text-xs text-slate-500 opacity-80">
                         {u.name.toLowerCase().includes('pack') && product.pack ? `Pack (${product.pack} pcs)` : ''}
                         {u.name.toLowerCase().includes('piece') ? `Pieces` : ''}
                     </div>
                  </div>
               ))}
               {(!product.availableUnits || product.availableUnits.length === 0) && (
                 <div className="col-span-2 text-sm text-slate-500 italic p-2 border border-dashed rounded-md bg-slate-50 text-center">
                   No target units available for conversion.
                 </div>
               )}
            </div>
          </div>

          {convertedAmount > 0 && (
             <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center justify-between">
                <div>
                   <div className="text-xs text-emerald-600 font-medium">Converted Amount</div>
                   <div className="text-2xl font-bold text-emerald-700">{convertedAmount}</div>
                   <div className="text-xs text-emerald-600 font-medium">{targetUnit?.name}(S)</div>
                </div>
                <ArrowRight className="w-6 h-6 text-emerald-500" />
             </div>
          )}

          <div className="bg-slate-50 p-3 rounded-md text-xs text-slate-600 mt-4 border border-slate-100">
             <div className="font-semibold text-slate-700 mb-1">Conversion Details:</div>
             <ul className="list-disc pl-4 space-y-1">
                <li>Unit of Box: {product.unitOfBox || 24} pieces</li>
                <li>Pack: {product.pack || 6} pieces</li>
                <li>Tie: {product.tie || 0} pieces</li>
             </ul>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} className="rounded-md font-medium">
            Cancel
          </Button>
          <Button 
             onClick={handleConfirm} 
             disabled={!qtyToConvert || !selectedTargetUnit || convertedAmount <= 0}
             className="bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Confirm Conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
