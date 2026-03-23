"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { ConsolidatorDetailsDto } from "../types";
import { Loader2 } from "lucide-react";

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

    // Calculate how many more items are needed to reach the max ordered amount
    const remainingQty = (activeDetail?.orderedQuantity || 0) - (activeDetail?.pickedQuantity || 0);

    const handleQuickAdd = (amount: number) => {
        const current = Number(manualQuantity) || 0;
        let next = current + amount;
        if (next < 0) next = 0;
        if (next > remainingQty) next = remainingQty;
        setManualQuantity(next === 0 ? "" : next);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isScanning && onClose()}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl p-4 md:p-6">
                <DialogHeader className="mb-2">
                    <DialogTitle className="text-xl font-black uppercase italic tracking-tighter flex items-center justify-between">
                        Manual Entry
                        {isScanning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </DialogTitle>
                </DialogHeader>

                {activeDetail && (
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex flex-col gap-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex flex-wrap gap-x-1.5">
                            <span className="text-primary">{supplier}</span>
                            <span>•</span>
                            <span>{activeDetail.brandName || "NO BRAND"}</span>
                        </div>
                        <div className="text-base font-black leading-tight text-foreground line-clamp-2">
                            {activeDetail.productName}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground flex gap-1.5 mt-0.5">
                            <span className="bg-background px-1.5 py-0.5 rounded border border-border/50 shadow-sm">
                                {activeDetail.unitName || "PC"}
                            </span>
                            {activeDetail.barcode && (
                                <span className="bg-background px-1.5 py-0.5 rounded border border-border/50 shadow-sm font-mono">
                                    {activeDetail.barcode}
                                </span>
                            )}
                            <span className="bg-background px-1.5 py-0.5 rounded border border-border/50 shadow-sm text-primary">
                                Req: {remainingQty}
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 py-2">
                    <Input
                        type="number"
                        autoFocus
                        disabled={isScanning}
                        placeholder="Enter Qty"
                        className="h-14 text-center text-3xl font-black italic bg-muted/20 border-border/50 focus-visible:ring-primary/50"
                        value={manualQuantity}
                        onChange={(e) => {
                            const val = e.target.value;
                            setManualQuantity(val === "" ? "" : Number(val));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && manualQuantity !== "" && onSubmit()}
                    />

                    {/* 🚀 QUICK TAP BUTTONS FOR FAST WAREHOUSE ENTRY */}
                    <div className="grid grid-cols-4 gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleQuickAdd(-1)} disabled={isScanning || !manualQuantity} className="font-bold">-1</Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuickAdd(1)} disabled={isScanning || Number(manualQuantity) >= remainingQty} className="font-bold">+1</Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuickAdd(5)} disabled={isScanning || Number(manualQuantity) >= remainingQty} className="font-bold">+5</Button>
                        <Button variant="secondary" size="sm" onClick={() => setManualQuantity(remainingQty)} disabled={isScanning || Number(manualQuantity) === remainingQty} className="font-black text-primary">MAX</Button>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-2">
                    <Button variant="ghost" onClick={onClose} disabled={isScanning} className="font-black uppercase tracking-widest text-xs">
                        Cancel
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={manualQuantity === "" || Number(manualQuantity) <= 0 || isScanning}
                        className="font-black uppercase tracking-widest text-xs min-w-[120px]"
                    >
                        {isScanning ? "Saving..." : "Confirm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}