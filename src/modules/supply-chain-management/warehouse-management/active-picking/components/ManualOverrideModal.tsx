"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { ConsolidatorDetailsDto } from "../types";
import { Loader2, Delete, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    manualQuantity: number | "";
    setManualQuantity: (val: number | "") => void;
    isScanning: boolean;
    activeDetail?: ConsolidatorDetailsDto;
}

export function ManualOverrideModal({
                                        isOpen, onClose, onSubmit, manualQuantity, setManualQuantity, isScanning, activeDetail
                                    }: Props) {
    const supplier = activeDetail?.supplierName || "UNASSIGNED";
    const remainingQty = (activeDetail?.orderedQuantity || 0) - (activeDetail?.pickedQuantity || 0);
    const isMaxedOut = manualQuantity === remainingQty;

    // Reset input when modal opens
    useEffect(() => {
        if (isOpen) setManualQuantity("");
    }, [isOpen, setManualQuantity]);

    // Custom Numpad Handlers
    const handleNumPress = (num: number) => {
        const current = manualQuantity === "" ? "" : manualQuantity.toString();
        const nextVal = Number(current + num);

        // Auto-cap at remaining quantity
        if (nextVal > remainingQty) {
            setManualQuantity(remainingQty);
        } else {
            setManualQuantity(nextVal);
        }
    };

    const handleDelete = () => {
        const current = manualQuantity.toString();
        if (current.length <= 1) setManualQuantity("");
        else setManualQuantity(Number(current.slice(0, -1)));
    };

    const handleQuickAdd = (amount: number) => {
        const current = Number(manualQuantity) || 0;
        let next = current + amount;
        if (next < 0) next = 0;
        if (next > remainingQty) next = remainingQty;
        setManualQuantity(next === 0 ? "" : next);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isScanning && onClose()}>
            <DialogContent className="sm:max-w-md w-[95vw] bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-[2rem] p-5 md:p-6 overflow-hidden">
                <DialogHeader className="mb-1">
                    <DialogTitle className="text-xl font-black uppercase italic tracking-tighter flex items-center justify-between">
                        Manual Entry
                        {isScanning && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    </DialogTitle>
                </DialogHeader>

                {/* ITEM INFO BANNER */}
                {activeDetail && (
                    <div className="bg-muted/40 p-3 rounded-xl border border-border/50 flex flex-col gap-1.5 shadow-inner">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex flex-wrap gap-x-1.5">
                            <span className="text-primary">{supplier}</span>
                            <span>•</span>
                            <span>{activeDetail.brandName || "NO BRAND"}</span>
                        </div>
                        <div className="text-sm md:text-base font-black leading-tight text-foreground line-clamp-2">
                            {activeDetail.productName}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <div className="text-[10px] font-bold text-muted-foreground flex gap-1.5">
                                <span className="bg-background px-2 py-0.5 rounded border border-border/50 shadow-sm">
                                    {activeDetail.unitName || "PC"}
                                </span>
                                {activeDetail.barcode && (
                                    <span className="bg-background px-2 py-0.5 rounded border border-border/50 shadow-sm font-mono text-primary/80">
                                        {activeDetail.barcode}
                                    </span>
                                )}
                            </div>
                            <div className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 text-[10px] font-black uppercase tracking-widest">
                                Req: {remainingQty}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4 py-2">
                    {/* INPUT DISPLAY */}
                    <Input
                        type="number"
                        autoFocus
                        inputMode="none" // 🚀 MAGIC: Prevents native touch keyboards from popping up!
                        disabled={isScanning}
                        placeholder={`Max: ${remainingQty}`}
                        className={cn(
                            "h-16 text-center text-4xl font-black italic rounded-xl border-2 transition-colors",
                            isMaxedOut
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 focus-visible:ring-emerald-500/50"
                                : "bg-muted/20 border-border/50 focus-visible:ring-primary/50"
                        )}
                        value={manualQuantity}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") setManualQuantity("");
                            else {
                                const num = Number(val);
                                setManualQuantity(num > remainingQty ? remainingQty : num);
                            }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && manualQuantity !== "" && onSubmit()}
                    />

                    {/* TOUCH NUMPAD & QUICK ACTIONS */}
                    <div className="flex gap-3">
                        {/* 1-9 Numpad */}
                        <div className="grid grid-cols-3 gap-2 flex-1">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    disabled={isScanning || isMaxedOut}
                                    onClick={() => handleNumPress(num)}
                                    className="h-12 md:h-14 text-xl font-black bg-card hover:bg-muted active:scale-95 transition-transform rounded-xl border-border/60"
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button
                                variant="destructive"
                                disabled={isScanning || manualQuantity === ""}
                                onClick={() => setManualQuantity("")}
                                className="h-12 md:h-14 text-sm font-black uppercase tracking-widest active:scale-95 transition-transform rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 border-none"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="outline"
                                disabled={isScanning || isMaxedOut}
                                onClick={() => handleNumPress(0)}
                                className="h-12 md:h-14 text-xl font-black bg-card hover:bg-muted active:scale-95 transition-transform rounded-xl border-border/60"
                            >
                                0
                            </Button>
                            <Button
                                variant="outline"
                                disabled={isScanning || manualQuantity === ""}
                                onClick={handleDelete}
                                className="h-12 md:h-14 active:scale-95 transition-transform rounded-xl border-border/60 text-muted-foreground hover:text-foreground bg-muted/30"
                            >
                                <Delete className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Quick Action Side Column */}
                        <div className="flex flex-col gap-2 w-[80px]">
                            <Button
                                variant="secondary"
                                onClick={() => setManualQuantity(remainingQty)}
                                disabled={isScanning || isMaxedOut}
                                className="flex-1 font-black text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl active:scale-95 transition-transform"
                            >
                                MAX
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleQuickAdd(5)}
                                disabled={isScanning || isMaxedOut}
                                className="flex-1 font-black text-lg rounded-xl border-border/60 active:scale-95 transition-transform"
                            >
                                +5
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleQuickAdd(1)}
                                disabled={isScanning || isMaxedOut}
                                className="flex-1 font-black text-lg rounded-xl border-border/60 active:scale-95 transition-transform"
                            >
                                +1
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-3 sm:gap-2 mt-2 border-t border-border/40 pt-4">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isScanning}
                        className="font-black uppercase tracking-widest text-xs h-12 w-full sm:w-auto rounded-xl hover:bg-muted"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={manualQuantity === "" || Number(manualQuantity) <= 0 || isScanning}
                        className={cn(
                            "font-black uppercase tracking-widest text-sm h-12 w-full sm:w-auto rounded-xl shadow-lg transition-all active:scale-[0.98]",
                            isMaxedOut ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "min-w-[140px]"
                        )}
                    >
                        {isScanning ? "Saving..." : "Confirm Pick"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}