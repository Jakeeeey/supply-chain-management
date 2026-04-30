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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, X } from "lucide-react";
import { ReceiptSavedInfo } from "../providers/ReceivingProductsProvider";
import { generateReceivingPdf } from "../utils/generateReceivingPdf";
import { CompanyData } from "@/components/pdf-layout-design/types";

interface ReceiptPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ReceiptSavedInfo;
    poNumber: string;
    supplierName: string;
    priceType: string;
    isInvoice?: boolean;
}

export function ReceiptPreviewModal({
    isOpen,
    onClose,
    data,
    poNumber,
    supplierName,
    priceType,
    isInvoice,
}: ReceiptPreviewModalProps) {
    const [companyData, setCompanyData] = React.useState<CompanyData | null>(null);

    React.useEffect(() => {
        fetch("/api/pdf/company")
            .then(res => res.json())
            .then(d => {
                const company = d?.data?.[0] || (Array.isArray(d.data) ? null : d.data);
                setCompanyData(company);
            })
            .catch(err => console.error("Failed to fetch company data:", err));
    }, []);

    if (!data) return null;

    const handleDownload = async () => {
        if (!companyData) return;
        await generateReceivingPdf({
            poNumber,
            supplierName,
            receiptNo: data.receiptNo,
            receiptDate: data.receiptDate,
            receiptType: data.receiptType,
            branchLabel: "All Branches",
            isFullyReceived: data.isFullyReceived,
            priceType: priceType,
            items: data.items.map((it) => ({
                name: it.name,
                barcode: it.barcode,
                expectedQty: it.expectedQty,
                receivedQtyNow: it.receivedQtyNow,
                unitPrice: it.unitPrice || 0,
                discountAmount: it.discountAmount || 0,
                batchNo: it.batchNo,
                lotId: it.lotId,
                expiryDate: it.expiryDate,
                uom: it.uom,
            })),
        }, companyData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-primary/20 scale-[0.98] sm:scale-100">
                <DialogHeader className="p-6 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight">
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                            Receipt Overview
                        </DialogTitle>
                        <Badge 
                            variant={data.isFullyReceived ? "default" : "secondary"}
                            className={data.isFullyReceived ? "bg-green-600 px-4 py-1.5 text-xs font-bold" : "bg-orange-500 text-white px-4 py-1.5 text-xs font-bold"}
                        >
                            {data.isFullyReceived ? "FULLY RECEIVED" : "PARTIALLY RECEIVED"}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="px-8 pt-6">
                    {/* Summary Info - Compact 1-Row Grid - Fixed at top */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-xl bg-muted/20 border shadow-sm text-xs">
                        <div className="space-y-1">
                            <div className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">PO Reference</div>
                            <div className="font-black text-sm truncate" title={poNumber}>{poNumber}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">{isInvoice ? "Invoice No." : "Receipt No."}</div>
                            <div className="font-black text-sm text-blue-600 underline underline-offset-4">{data.receiptNo}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Date</div>
                            <div className="font-black text-sm">{data.receiptDate}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Status</div>
                            <div className="flex items-center gap-1.5 text-primary">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="font-bold">Verified</span>
                            </div>
                        </div>
                        <div className="space-y-1 col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
                            <div className="text-muted-foreground font-bold uppercase tracking-widest text-[9px]">Supplier Entity</div>
                            <div className="font-black text-sm truncate" title={supplierName}>{supplierName}</div>
                        </div>
                    </div>
                </div>

                <ScrollArea className="flex-1 px-8 py-6">
                    <div className="space-y-6 max-w-6xl mx-auto">

                        {/* Items List - Ultra Compact 1-Row Style */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-black text-xl tracking-tight">Receipt Contents</h3>
                                    <span className="text-muted-foreground text-sm font-medium">({data.items.length} items)</span>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto pb-4 scrollbar-thin">
                                <div className="space-y-2 min-w-[800px]">
                                    {data.items.map((it, idx) => {
                                        const isPending = it.receivedQtyNow === 0;
                                        return (
                                            <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl border border-primary/10 bg-background shadow-sm transition-all ${isPending ? "opacity-50 grayscale" : "hover:border-primary/30 hover:shadow-md"}`}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <div className="font-black text-sm truncate">{it.name}</div>
                                                        <code className="text-[10px] bg-muted px-2 py-0.5 rounded border font-mono text-muted-foreground whitespace-nowrap">
                                                            {it.barcode}
                                                        </code>
                                                    </div>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            {it.lotId && (
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Lot</span>
                                                                    <span className="text-[10px] font-black">{it.lotId}</span>
                                                                </div>
                                                            )}
                                                            {it.batchNo && (
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Batch</span>
                                                                    <span className="text-[10px] font-black">{it.batchNo}</span>
                                                                </div>
                                                            )}
                                                            {it.expiryDate && (
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Expiry</span>
                                                                    <span className="text-[10px] font-black">{it.expiryDate}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {(it.rfids || []).map((code, ri) => (
                                                                <span key={ri} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/50 border border-primary/5 text-muted-foreground">
                                                                    {code}
                                                                </span>
                                                            ))}
                                                            {(it.rfids || []).length === 0 && (
                                                                <span className="text-[10px] italic text-muted-foreground">Waiting for verification...</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                <div className="shrink-0 flex items-center gap-6 pl-4 border-l">
                                                    <div className="text-center min-w-[60px]">
                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Total</div>
                                                        <div className="text-lg font-black text-primary tabular-nums">
                                                            {it.receivedQtyNow}
                                                        </div>
                                                    </div>
                                                    <div className="text-center border-l pl-6 min-w-[60px]">
                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Expected</div>
                                                        <div className="text-lg font-black text-muted-foreground/60 tabular-nums">
                                                            {it.expectedQty}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-8 border-t bg-muted/20 flex flex-row items-center justify-center sm:justify-center gap-4">
                    <Button variant="outline" onClick={onClose} className="px-8 h-11 font-black uppercase tracking-widest text-[10px] shadow-sm border-muted-foreground/20 hover:bg-muted transition-colors">
                        <X className="h-4 w-4 mr-2" />
                        Cancel & Close
                    </Button>
                    <Button 
                        onClick={handleDownload} 
                        className="px-8 h-11 font-black !bg-[#2563eb] hover:!bg-[#1d4ed8] !text-white shadow-lg shadow-blue-200 uppercase tracking-widest text-[10px] border-none"
                    >
                        <Download className="h-4 w-4 mr-2 !text-white" />
                        <span className="!text-white">Download Summary</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
