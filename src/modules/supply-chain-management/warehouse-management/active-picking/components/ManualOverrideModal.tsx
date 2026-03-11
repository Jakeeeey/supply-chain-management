import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { ConsolidatorDetailsDto } from "../types";

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
    const supplier = (activeDetail as any)?.supplierName || "UNASSIGNED";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">
                        Manual Pack Entry
                    </DialogTitle>
                    <DialogDescription className="font-bold uppercase tracking-widest text-[10px]">
                        Verify product details before overriding.
                    </DialogDescription>
                </DialogHeader>

                {/* 🚀 NEW: Detailed Product Info Reference */}
                {activeDetail && (
                    <div className="bg-muted/50 p-4 rounded-xl border border-border/50 flex flex-col gap-1 my-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex flex-wrap gap-x-2">
                            <span className="text-primary">{supplier}</span>
                            <span>•</span>
                            <span>{activeDetail.brandName || "NO BRAND"}</span>
                            <span>•</span>
                            <span>{activeDetail.categoryName || "UNCATEGORIZED"}</span>
                        </div>
                        <div className="text-lg font-black leading-tight mt-1 text-foreground">
                            {activeDetail.productName}
                        </div>
                        <div className="text-xs font-bold text-muted-foreground flex gap-2 mt-1">
                            <span className="bg-background px-2 py-0.5 rounded border border-border/50 shadow-sm">
                                Unit: {activeDetail.unitName || "PC"}
                            </span>
                            {activeDetail.barcode && (
                                <span className="bg-background px-2 py-0.5 rounded border border-border/50 shadow-sm font-mono">
                                    BC: {activeDetail.barcode}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 py-4">
                    <Input
                        type="number"
                        autoFocus
                        placeholder="Qty (e.g. 12)"
                        className="h-16 text-center text-4xl font-black italic bg-muted/30 border-border/50 focus-visible:ring-blue-500"
                        value={manualQuantity}
                        onChange={(e) => {
                            const val = e.target.value;
                            setManualQuantity(val === "" ? "" : Number(val));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="font-black uppercase tracking-widest">
                        Cancel
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={manualQuantity === "" || Number(manualQuantity) <= 0 || isScanning}
                        className="font-black uppercase tracking-widest bg-blue-500 text-white hover:bg-blue-600"
                    >
                        Confirm Quantity
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}