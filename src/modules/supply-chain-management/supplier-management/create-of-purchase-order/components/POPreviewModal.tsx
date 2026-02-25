"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, Package, MapPin } from "lucide-react";
import { generatePurchaseOrderPDF } from "../../receiving-products/utils/printUtils";
import { cn, buildMoneyFormatter } from "../utils/calculations";

interface POPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmSave?: () => void | Promise<any>;
    isSubmitting?: boolean;
    locked?: boolean;
    data: {
        poNumber: string;
        poDate: string;
        supplierName: string;
        items: Array<{
            name: string;
            barcode: string;
            orderQty: number;
            uom: string;
            price: number;
            branchName: string;
        }>;
        subtotal: number;
        discount: number;
        vat: number;
        ewt: number;
        total: number;
    };
}

export function POPreviewModal({ 
    isOpen, 
    onClose, 
    onConfirmSave,
    isSubmitting,
    locked,
    data 
}: POPreviewModalProps) {
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    const handleDownloadOnly = () => {
        generatePurchaseOrderPDF(data);
    };

    const handleSaveAndDownload = async () => {
        if (onConfirmSave) {
            try {
                // Trigger save and wait for it
                await onConfirmSave();
                // If it didn't throw, download the PDF
                generatePurchaseOrderPDF(data);
            } catch (err) {
                // parent usually handles the toast for error
                console.error("Failed to save PO:", err);
            }
        } else {
            generatePurchaseOrderPDF(data);
        }
    };

    const scrollbarStyle = React.useMemo(() => {
        return {
            scrollbarColor: "hsl(var(--muted-foreground) / 0.35) transparent",
        } as React.CSSProperties;
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                style={{
                    maxWidth: "96vw",
                    width: "75rem",
                    height: "94vh",
                    maxHeight: "90vh",
                }}
                className={cn(
                    "p-0 gap-0 overflow-hidden border border-border shadow-2xl flex flex-col",
                    "bg-background text-foreground"
                )}
            >
                {/* TOP HEADER SECTION */}
                <div className="bg-background border-b border-border shrink-0">
                    <DialogHeader className="px-6 py-4 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <Printer className="h-5 w-5 text-primary" />
                                    Purchase Order Preview
                                </DialogTitle>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                    Review document content before printing
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* SUMMARY DATA BAR */}
                    <div className="px-6 py-4 bg-muted/20 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="space-y-1.5 font-bold">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                PO Information
                            </label>
                            <div className="bg-background border border-border rounded-xl p-3 shadow-sm space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase text-muted-foreground">Order Number:</span>
                                    <span className="text-xs font-mono font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                        {data.poNumber}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase text-muted-foreground">Order Date:</span>
                                    <span className="text-xs font-black text-foreground">{data.poDate}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5 font-bold">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                Supplier
                            </label>
                            <div className="bg-background border border-border rounded-xl p-3 shadow-sm flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <Package className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-tight truncate text-foreground">
                                        {data.supplierName}
                                    </p>
                                    <Badge variant="outline" className="text-[9px] font-bold h-4 px-1.5 mt-1 border-primary/30 text-primary uppercase">
                                        Official Supplier
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN SCROLLABLE CONTENT AREA */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-muted/5">
                    <div className="px-6 py-3 shrink-0 flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Order Contents</h4>
                        <Badge variant="secondary" className="text-[10px] font-black px-2 py-0.5 rounded-full">
                            {data.items.length} Products
                        </Badge>
                    </div>

                    <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col min-h-0">
                        <div className="flex-1 border border-border rounded-2xl overflow-hidden bg-background flex flex-col shadow-sm">
                            {/* TABLE HEADER */}
                            <div className="bg-muted/50 border-b border-border px-4 py-2 shrink-0 grid grid-cols-12 gap-4 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                <div className="col-span-12 sm:col-span-5">Product Details</div>
                                <div className="hidden sm:block col-span-3 text-center sm:text-left">Branch</div>
                                <div className="hidden sm:block col-span-2 text-center">Qty</div>
                                <div className="hidden sm:block col-span-2 text-right">Total</div>
                            </div>
                            
                            <div 
                                style={scrollbarStyle} 
                                className="flex-1 overflow-y-auto custom-scrollbar"
                            >
                                <div className="divide-y divide-border/50">
                                    {data.items.map((item, idx) => (
                                        <div key={idx} className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/30 transition-colors">
                                            <div className="col-span-12 sm:col-span-5">
                                                <p className="text-[11px] font-black text-foreground leading-tight uppercase tracking-tight">{item.name}</p>
                                                <p className="text-[9px] font-mono font-bold text-muted-foreground mt-0.5">SKU: {item.barcode}</p>
                                            </div>
                                            <div className="col-span-6 sm:col-span-3 flex items-center gap-1.5 overflow-hidden">
                                                <MapPin className="h-3 w-3 text-primary/60 shrink-0" />
                                                <span className="text-[10px] font-bold truncate uppercase tracking-tighter text-foreground/80">{item.branchName}</span>
                                            </div>
                                            <div className="col-span-3 sm:col-span-2 text-center bg-muted/50 rounded-lg py-1 px-2 border border-border/50 shadow-sm">
                                                <div className="text-[11px] font-black tabular-nums leading-none text-foreground">{item.orderQty}</div>
                                                <div className="text-[8px] text-muted-foreground uppercase font-black tracking-tighter mt-0.5">{item.uom}</div>
                                            </div>
                                            <div className="col-span-3 sm:col-span-2 text-right">
                                                <div className="text-[11px] font-black tabular-nums leading-none text-primary italic">{money.format(item.price * item.orderQty)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STICKY FOOTER SECTION */}
                <div className="shrink-0 bg-background border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
                    <div className="px-6 py-4 flex flex-col md:flex-row justify-end items-center gap-8 md:gap-16 bg-muted/5">
                        <div className="space-y-1.5 text-right min-w-[160px]">
                            <div className="flex justify-between items-center text-xs uppercase font-bold text-muted-foreground gap-10">
                                <span>Gross Amount:</span>
                                <span className="text-foreground">{money.format(data.subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs uppercase font-bold text-destructive gap-10">
                                <span>Total Discount:</span>
                                <span>-{money.format(data.discount)}</span>
                            </div>
                            <Separator className="my-1.5 bg-border/60" />
                            <div className="flex justify-between items-center text-xs uppercase font-bold text-foreground gap-10">
                                <span>Net Amount:</span>
                                <span className="text-primary tracking-tight">{money.format(data.subtotal - data.discount)}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-1.5 text-right min-w-[170px]">
                            <div className="flex justify-between items-center text-xs uppercase font-bold text-muted-foreground gap-10">
                                <span>VAT (12%):</span>
                                <span className="text-foreground">{money.format(data.vat)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs uppercase font-bold text-muted-foreground gap-10">
                                <span>EWT (1%):</span>
                                <span className="text-foreground">{money.format(data.ewt)}</span>
                            </div>
                            <Separator className="my-1.5 bg-border/60" />
                            <div className="flex justify-between items-center text-sm font-bold text-primary italic uppercase tracking-tighter gap-10">
                                <span className="shrink-0">Total Payable:</span>
                                <span className="text-2xl tabular-nums tracking-tighter">{money.format(data.total)}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-5 bg-background border-t border-border flex flex-row items-center justify-center gap-4 sm:gap-6 shrink-0">
                        <Button 
                            variant="outline" 
                            onClick={onClose} 
                            disabled={isSubmitting}
                            className="px-10 h-12 font-black uppercase tracking-widest text-[11px] rounded-2xl border-2 border-border hover:bg-muted text-foreground transition-all active:scale-95 bg-background shadow-md"
                        >
                            Back to Order
                        </Button>
                        <Button 
                            onClick={handleSaveAndDownload} 
                            disabled={isSubmitting || (locked && !onConfirmSave)}
                            className={cn(
                                "px-12 h-12 font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all active:scale-95 flex items-center gap-2",
                                locked 
                                    ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 disabled:opacity-100 shadow-none" 
                                    : isSubmitting 
                                        ? "bg-muted text-muted-foreground shadow-none"
                                        : "bg-primary text-primary-foreground hover:brightness-110 shadow-xl shadow-primary/20"
                            )}
                        >
                            {isSubmitting ? (
                                <>Saving...</>
                            ) : locked ? (
                                <>
                                    <Download className="h-4 w-4" />
                                    Download PDF
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Save & Download PDF
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
