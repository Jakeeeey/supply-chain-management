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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Cuboid, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { StockConversionProduct } from "../types";

interface StockConversionModalProps {
  product: StockConversionProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    qtyToConvert: number,
    targetUnit: { unitId: number; targetProductId?: number },
    convertedQuantity: number,
  ) => void;
  sourceQuantity?: number;
}

export function StockConversionModal({
  product,
  isOpen,
  onClose,
  onConfirm,
  sourceQuantity,
}: StockConversionModalProps) {
  const [qtyToConvert, setQtyToConvert] = useState<number | "">("");
  const [selectedTargetUnit, setSelectedTargetUnit] = useState<number | null>(
    null,
  );

  const isSourceBoxOrPack = product?.currentUnit?.toLowerCase().includes("box") || product?.currentUnit?.toLowerCase().includes("pack");
  const isRfidLocked = isSourceBoxOrPack && !!sourceQuantity;

  useEffect(() => {
    if (isOpen && product) {
      const timer = setTimeout(() => {
        setQtyToConvert(isRfidLocked ? (sourceQuantity || 1) : "");
        setSelectedTargetUnit(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, product, isRfidLocked, sourceQuantity]);

  if (!product) return null;

  // Calculate converted amount
  const targetUnit = product.availableUnits?.find(
    (u) => u.unitId === selectedTargetUnit,
  );

  let convertedAmount = 0;
  let wholeUnits = 0;
  let actualSourceQtyUsed = 0;
  let remainderSourceUnits = 0;

  if (qtyToConvert && targetUnit) {
    const sourceFactor = Number(product.conversionFactor) || 1;
    const targetFactor = Number(targetUnit.conversionFactor) || 1;

    // 1. Total available base pieces if we converted the entire typed quantity
    const totalBaseUnits = Number(qtyToConvert) * sourceFactor;

    // 2. Conversion with rounding down
    if (targetFactor > 0) {
      convertedAmount = totalBaseUnits / targetFactor;
      wholeUnits = Math.floor(convertedAmount);

      // 3. How much of the source quantity is actually used to make those whole units
      actualSourceQtyUsed = (wholeUnits * targetFactor) / sourceFactor;

      // 4. What is left over in the source unit
      remainderSourceUnits = Number(qtyToConvert) - actualSourceQtyUsed;
    }
  }

  const totalBaseUnits = qtyToConvert ? Number(qtyToConvert) * (product.conversionFactor || 1) : 0;
  const targetFactor = targetUnit ? Number(targetUnit.conversionFactor) || 1 : 1;
  const isUomRequirementNotMet = !!(qtyToConvert && targetUnit && totalBaseUnits < targetFactor);

  const handleConfirm = () => {
    if (qtyToConvert && targetUnit && wholeUnits > 0) {
      onConfirm(actualSourceQtyUsed, targetUnit, wholeUnits);
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
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Brand
            </div>
            <div className="text-sm font-semibold">{product.brand}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Category
            </div>
            <div className="text-sm font-semibold">{product.category}</div>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
              Current Stock
            </Label>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {product.quantity}
              </div>
              <div className="text-xs font-bold text-blue-500/80 uppercase tracking-tighter">
                {product.currentUnit}(S)
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="qtyToConvert"
              className="text-xs font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-2"
            >
              Quantity to Convert
              {isRfidLocked && (
                <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/20 lowercase font-normal">
                  Fixed for RFID batch ({sourceQuantity || 1})
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="qtyToConvert"
                type="number"
                min={1}
                max={product.quantity}
                value={qtyToConvert}
                disabled={isRfidLocked}
                onChange={(e) =>
                  setQtyToConvert(e.target.value ? Number(e.target.value) : "")
                }
                placeholder={isRfidLocked ? String(sourceQuantity || 1) : "Enter quantity"}
                className={`bg-background border-input focus-visible:ring-blue-500 ${isRfidLocked ? "bg-muted/50 font-bold text-blue-600 cursor-not-allowed" : ""}`}
              />
              {isRfidLocked && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                   <AlertCircle className="w-4 h-4 text-amber-500/50" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
              Convert To
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.availableUnits?.map((u) => (
                <div
                  key={u.unitId}
                  className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                    selectedTargetUnit === u.unitId
                      ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500 shadow-sm"
                      : "border-border bg-card hover:border-blue-400/50 hover:bg-accent/50"
                  }`}
                  onClick={() => setSelectedTargetUnit(u.unitId)}
                >
                  <div
                    className={`font-bold flex items-center justify-between ${selectedTargetUnit === u.unitId ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}
                  >
                    <span>{u.name}</span>
                    {(u.name?.toLowerCase().includes("box") || u.name?.toLowerCase().includes("pack")) && (
                       <Cuboid className="w-3.5 h-3.5 opacity-50" />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                    UoM Count: {u.conversionFactor}
                  </div>
                </div>
              ))}
              {(!product.availableUnits ||
                product.availableUnits.length === 0) && (
                <div className="col-span-full text-xs text-muted-foreground italic p-4 border border-dashed rounded-md bg-muted/20 text-center">
                  No target units available for conversion.
                </div>
              )}
            </div>
          </div>

            <div className={`border rounded-md p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 transition-colors ${wholeUnits > 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/30 border-dashed border-muted-foreground/30"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-tight ${wholeUnits > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    Converted Result
                  </div>
                  <div className={`text-2xl font-black ${wholeUnits > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"}`}>
                    {wholeUnits || "0"}
                  </div>
                  <div className={`text-xs font-bold uppercase tracking-tighter ${wholeUnits > 0 ? "text-emerald-600/80" : "text-muted-foreground/40"}`}>
                    {targetUnit?.name || "Select Unit"}(S)
                  </div>
                </div>
                <div className={`p-2 rounded-full transition-colors ${wholeUnits > 0 ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-muted/50 text-muted-foreground/30"}`}>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              {remainderSourceUnits > 0 && (
                <div className="mt-1 pt-2 border-t border-emerald-500/10">
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase flex items-center gap-1.5 leading-none">
                    <AlertCircle className="w-3 h-3" />
                    Remaining stock: {remainderSourceUnits.toFixed(2)} {product.currentUnit}(s) will stay in inventory
                  </div>
                </div>
              )}
            </div>

          {isUomRequirementNotMet && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-destructive uppercase tracking-tight">
                  Requirement Not Met
                </div>
                <div className="text-sm font-medium text-destructive leading-tight">
                  Sorry you cannot convert this product you must meet the required quantity of it to convert.
                </div>
                <div className="text-[10px] text-destructive/70 font-bold uppercase">
                  Need {targetFactor} base units, but you only have {totalBaseUnits}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-md font-bold text-xs uppercase tracking-widest border-border hover:bg-accent transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !qtyToConvert || !selectedTargetUnit || wholeUnits <= 0 || isUomRequirementNotMet
            }
            className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-md font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-500/20"
          >
            Confirm Conversion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
