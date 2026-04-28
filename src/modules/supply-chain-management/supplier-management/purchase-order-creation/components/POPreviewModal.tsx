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

import { Printer, Download, Package } from "lucide-react";
import { printPOCreationPdf } from "../utils/printPoPdf";
import { cn, buildMoneyFormatter } from "../utils/calculations";

interface POPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmSave?: () => void | Promise<unknown>;
    isSubmitting?: boolean;
    locked?: boolean;
    isInvoice?: boolean;
    data: {
        poNumber: string;
        poDate: string;
        supplierName: string;
        items: Array<{
            name: string;
            brand: string;
            category: string;
            barcode: string;
            orderQty: number;
            uom: string;
            price: number;
            grossAmount: number;
            discountType: string;
            discountAmount: number;
            netAmount: number;
            branchName: string;
        }>;
        subtotal: number;
        discount: number;
        vat: number;
        ewt: number;
        total: number;
        preparerName?: string;
    };
}

export function POPreviewModal({ 
    isOpen, 
    onClose, 
    onConfirmSave,
    isSubmitting,
    locked,
    isInvoice,
    data 
}: POPreviewModalProps) {
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    const handleSaveAndDownload = async () => {
        if (onConfirmSave) {
            try {
                // Trigger save and wait for it
                await onConfirmSave();
                // If it didn't throw, download the PDF
                await printPOCreationPdf({ ...data, isInvoice: !!isInvoice });
            } catch (err) {
                // parent usually handles the toast for error
                console.error("Failed to save PO or generate PDF:", err);
            }
        } else {
            try {
                await printPOCreationPdf({ ...data, isInvoice: !!isInvoice });
            } catch (err) {
                console.error("Failed to generate PDF:", err);
            }
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
                    width: "90rem", // Increased from 75rem
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
                                    {/* ✅ Updated: Always show Purchase Order */}
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
                                    <span className="text-[10px] uppercase text-muted-foreground">Purchase Order Number:</span>
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
                                    <p className="text-xs font-black uppercase tracking-tight text-foreground">
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
                            <div 
                                style={scrollbarStyle} 
                                className="flex-1 overflow-auto custom-scrollbar"
                            >
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 z-10 bg-blue-600 border-b border-border">
                                        <tr className="text-[9px] font-black uppercase tracking-wider text-white">
                                            <th className="px-4 py-3 text-left font-black">Brand</th>
                                            <th className="px-4 py-3 text-left font-black">Category</th>
                                            <th className="px-4 py-3 text-left font-black">Product Name</th>
                                            <th className="px-4 py-3 text-center font-black">UOM</th>
                                            <th className="px-4 py-3 text-center font-black">Qty</th>
                                            <th className="px-4 py-3 text-right font-black">Unit Price</th>
                                            <th className="px-4 py-3 text-right font-black">Total Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {data.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-4 py-3 text-[9px] font-bold text-foreground/70 uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                                                    {item.brand || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-[9px] font-bold text-foreground/70 uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                                                    {item.category || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-[9px] font-black text-foreground uppercase tracking-tight max-w-[200px]">
                                                    <div className="" title={item.name}>{item.name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[7px] font-black rounded uppercase">
                                                        {item.uom}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[9px] text-center font-black whitespace-nowrap">
                                                    {item.orderQty}
                                                </td>
                                                <td className="px-4 py-3 text-[9px] text-right font-bold text-foreground/80 whitespace-nowrap">
                                                    {money.format(item.price).replace("PHP", "").trim()}
                                                </td>
                                                <td className="px-4 py-3 text-[9px] text-right font-black text-primary whitespace-nowrap">
                                                    {money.format(item.netAmount).replace("PHP", "").trim()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STICKY FOOTER SECTION */}
                <div className="shrink-0 bg-background border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
                    {/* Gross, Discount, Net, VAT, EWT, and Total Payable hidden as requested */}

                    <DialogFooter className="px-6 py-5 bg-background border-t border-border flex flex-row items-center justify-center gap-4 sm:gap-6 shrink-0">
                        <Button 
                            variant="outline" 
                            onClick={onClose} 
                            disabled={isSubmitting}
                            className="px-10 h-12 font-black uppercase tracking-widest text-[11px] rounded-2xl border-2 border-border hover:bg-muted text-foreground transition-all active:scale-95 bg-background shadow-md"
                        >
                            Back to Order
                        </Button>

                        {!locked && (
                            <Button 
                                variant="outline"
                                onClick={async () => {
                                    try {
                                        await printPOCreationPdf({ ...data, isInvoice: !!isInvoice });
                                    } catch (err) {
                                        console.error("Draft PDF failed:", err);
                                    }
                                }}
                                disabled={isSubmitting}
                                className="px-8 h-12 font-black uppercase tracking-widest text-[11px] rounded-2xl border-2 border-primary/20 hover:bg-primary/5 text-primary transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download Draft
                            </Button>
                        )}

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
                                    Post & Download PDF
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
