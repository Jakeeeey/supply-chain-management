"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReceivingProductsManual, ReceivingPOItem } from "../../providers/ReceivingProductsManualProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ReceiptPreviewModal } from "../ReceiptPreviewModal";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatPHP = (val: number) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(val || 0);

export function ReviewReceiptStep({ onBack, receiverName }: { onBack: () => void; receiverName?: string }) {
    const {
        selectedPO,
        manualCounts,
        saveReceipt,
        savingReceipt,
        saveError,
        receiptSaved,
        lots,
        setMetaDataByPorId,
    } = useReceivingProductsManual();

    const [clientSaveError, setClientSaveError] = React.useState("");
    const [lotNumbers, setLotNumbers] = React.useState<Record<string, string>>({});
    const [batchNumbers, setBatchNumbers] = React.useState<Record<string, string>>({});
    const [expiryDates, setExpiryDates] = React.useState<Record<string, string>>({});
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [isPartialModalOpen, setIsPartialModalOpen] = React.useState(false);
    const [reviewPage, setReviewPage] = React.useState(1);
    const [showErrors, setShowErrors] = React.useState(false);

    const { metaDataByPorId: draftMetaData } = useReceivingProductsManual();

    // Initial Sync from PO data and Context Draft
    React.useEffect(() => {
        const newLots: Record<string, string> = {};
        const newBatches: Record<string, string> = {};
        const newExpiries: Record<string, string> = {};
        let syncReady = true;

        if (selectedPO?.allocations) {
            selectedPO.allocations.forEach(a => {
                a.items.forEach((it: ReceivingPOItem) => {
                    const porId = String(it.id);
                    if (it.lot_no) newLots[porId] = it.lot_no;
                    if (it.batch_no) newBatches[porId] = it.batch_no;
                    if (it.expiry_date) newExpiries[porId] = it.expiry_date;
                });
            });
        }

        // Overlay draft data (crucial for reloading page)
        if (draftMetaData) {
            Object.entries(draftMetaData).forEach(([porId, meta]) => {
                if (meta.lotNo || meta.lotId) newLots[porId] = meta.lotNo || meta.lotId || "";
                if (meta.batchNo) newBatches[porId] = meta.batchNo;
                if (meta.expiryDate) newExpiries[porId] = meta.expiryDate;
            });
        }

        if (syncReady) {
            setLotNumbers(prev => ({ ...newLots, ...prev }));
            setBatchNumbers(prev => ({ ...newBatches, ...prev }));
            setExpiryDates(prev => ({ ...newExpiries, ...prev }));
        }
        return () => { syncReady = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPO?.id]); // Only run when PO context changes to avoid mapping loop

    // Update context whenever local changes
    React.useEffect(() => {
        const metaData: Record<string, { lotNo: string; batchNo?: string; expiryDate: string }> = {};
        let hasData = false;
        
        Object.keys(lotNumbers).forEach(id => {
            metaData[id] = { 
                lotNo: lotNumbers[id] || "", 
                batchNo: batchNumbers[id] || "",
                expiryDate: expiryDates[id] || "" 
            };
            hasData = true;
        });

        if (hasData) {
            setMetaDataByPorId(metaData);
        }
    }, [lotNumbers, batchNumbers, expiryDates, setMetaDataByPorId]);

    React.useEffect(() => {
        if (!receiptSaved) return;
        toast.success(`Receipt ${receiptSaved.receiptNo} saved successfully.`);
        setClientSaveError("");
    }, [receiptSaved]);

    const safeCounts: Record<string, number> = React.useMemo(() => manualCounts || {}, [manualCounts]);

    const allItems = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        return allocs.flatMap((a) => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items
                .map((it: ReceivingPOItem) => ({
                    ...it,
                    id: String(it.id),
                    branchName: a?.branch?.name ?? "Unassigned",
                })) as Array<ReceivingPOItem & { branchName: string }>;
        });
    }, [selectedPO]);

    const executeSave = async () => {
        const metaData: Record<string, { lotNo: string; batchNo?: string; expiryDate: string }> = {};
        Object.keys(lotNumbers).forEach(id => {
            metaData[id] = { 
                lotNo: lotNumbers[id] || "", 
                batchNo: batchNumbers[id] || "",
                expiryDate: expiryDates[id] || "" 
            };
        });
        await saveReceipt(metaData);
        setIsPartialModalOpen(false);
    };

    const handleSaveReceipt = React.useCallback(async () => {
        const status = (selectedPO?.status || "").toUpperCase();
        if (status === "CLOSED" || status === "RECEIVED") {
            setClientSaveError("PO is already completed.");
            return;
        }

        const missingLotOrExpiry: string[] = [];
        allItems.forEach((it: ReceivingPOItem) => {
            const porId = String(it.id);
            const count = safeCounts[porId] ?? 0;
            if (count > 0) {
                const batch = batchNumbers[porId] || "";
                const lot = lotNumbers[porId] || "";
                const exp = expiryDates[porId] || "";
                if (!batch.trim() || !lot.trim() || !exp.trim()) missingLotOrExpiry.push(it.name);
            }
        });

        if (missingLotOrExpiry.length > 0) {
            setShowErrors(true);
            toast.error("Required Fields Missing", {
                description: "Batch, Lot and Expiry Date are required for all items with entered quantities."
            });
            return;
        }

        // Check if any count is entered
        const hasAnyCounts = allItems.some((it: ReceivingPOItem) => {
            const porId = String(it.id);
            return (safeCounts[porId] ?? 0) > 0;
        });
        if (!hasAnyCounts) {
            setClientSaveError("Please enter at least 1 quantity before saving.");
            return;
        }

        setClientSaveError("");

        // ✅ Check if Incomplete
        const isPartial = allItems.some((it: ReceivingPOItem) => {
            const porId = String(it.id);
            const count = safeCounts[porId] ?? 0;
            const expected = Number(it.expectedQty || 0);
            return count < expected;
        });

        if (isPartial) {
            setIsPartialModalOpen(true);
            return;
        }

        const metaData: Record<string, { lotNo: string; batchNo?: string; expiryDate: string }> = {};
        Object.keys(lotNumbers).forEach(id => {
            metaData[id] = { 
                lotNo: lotNumbers[id] || "", 
                batchNo: batchNumbers[id] || "",
                expiryDate: expiryDates[id] || "" 
            };
        });

        await saveReceipt(metaData);
    }, [saveReceipt, selectedPO?.status, allItems, safeCounts, lotNumbers, batchNumbers, expiryDates]);

    const totalEntered = Object.values(safeCounts).reduce((a: number, b: number) => a + Number(b), 0);
    const totalExpected = allItems.reduce((a: number, b: ReceivingPOItem) => a + Number(b.expectedQty || 0), 0);

    const financials = React.useMemo(() => {
        let gross = 0;
        let discount = 0;

        allItems.forEach((it: ReceivingPOItem) => {
            const porId = String(it.id);
            const count = safeCounts[porId] ?? 0;
            const price = Number(it.unitPrice || 0);
            const discAmt = Number(it.discountAmount || 0);

            gross += (count * price);
            discount += (count * discAmt);
        });

        const net = Math.max(0, gross - discount);
        const priceType = selectedPO?.priceType || "VAT Inclusive";
        const isExclusive = priceType.toUpperCase() === "VAT EXCLUSIVE";

        let vatAmount = 0;
        let whtAmount = 0;
        let grandTotal = 0;

        if (isExclusive) {
            vatAmount = net * 0.12;
            whtAmount = net * 0.01;
            grandTotal = net;
        } else {
            // VAT Inclusive
            const vatableAmount = net / 1.12;
            vatAmount = net - vatableAmount;
            whtAmount = vatableAmount * 0.01;
            grandTotal = net;
        }

        return { gross, discount, net, vatAmount, whtAmount, grandTotal, isExclusive };
    }, [allItems, safeCounts, selectedPO?.priceType]);

    return (
        <div className="space-y-4">
            {receiptSaved ? (
                <Card className="p-6 border-green-500 shadow-md">
                    <h3 className="text-xl font-bold mb-2">Receipt Saved!</h3>
                    <p className="text-sm mb-4">You have successfully received items for {selectedPO?.poNumber}.</p>
                    <div className="flex gap-4">
                        <Button onClick={() => window.location.reload()} variant="outline">Start New Session</Button>
                        <Button onClick={() => setPreviewOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">Print Receipt</Button>
                    </div>
                </Card>
            ) : (
                <Card className="p-4">
                    <div className="mb-4 flex justify-between items-center">
                        <div className="text-sm font-semibold">Final Review & Details</div>
                        <Button variant="ghost" size="sm" onClick={onBack}>← Back to Entry</Button>
                    </div>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="text-[10px] uppercase">Product Name</TableHead>
                                    <TableHead className="text-[10px] uppercase">Batch</TableHead>
                                    <TableHead className="text-[10px] uppercase">Lot</TableHead>
                                    <TableHead className="text-[10px] uppercase">Expiry</TableHead>
                                    <TableHead className="text-[10px] uppercase text-right">Unit Price</TableHead>
                                    <TableHead className="text-[10px] uppercase text-center">Disc. Type</TableHead>
                                    <TableHead className="text-[10px] uppercase text-right">Disc. Amt</TableHead>
                                    <TableHead className="text-[10px] uppercase text-right">Net Amt</TableHead>
                                    <TableHead className="text-[10px] uppercase text-center">Expected</TableHead>
                                    <TableHead className="text-[10px] uppercase text-center">Entered</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(() => {
                                    const PAGE_SIZE = 10;
                                    const paginatedItems = allItems.slice((reviewPage - 1) * PAGE_SIZE, reviewPage * PAGE_SIZE);
                                    return paginatedItems.map((it: ReceivingPOItem) => {
                                        const porId = String(it.id);
                                        const count = safeCounts[porId] ?? 0;
                                        const expected = Number(it.expectedQty || 0);
                                        const unitP = Number(it.unitPrice || 0);
                                        const discA = Number(it.discountAmount || 0);
                                        const effectivePrice = Math.max(0, unitP - discA);
                                        const lineTotal = count * effectivePrice;

                                        return (
                                            <TableRow key={porId}>
                                                <TableCell>
                                                    <div className="font-bold text-xs truncate max-w-[200px]">{it.name}</div>
                                                    <div className="text-[9px] text-muted-foreground font-mono">SKU: {it.barcode} | UOM: {it.uom}</div>
                                                </TableCell>
                                                <TableCell className="min-w-[100px]">
                                                    <Input 
                                                        className={cn(
                                                            "h-8 text-[11px] font-bold",
                                                            showErrors && count > 0 && !(batchNumbers[porId] || "").trim() && "border-red-500 ring-1 ring-red-500"
                                                        )}
                                                        placeholder="Batch #" 
                                                        value={batchNumbers[porId] || ""} 
                                                        onChange={(e) => setBatchNumbers(prev => ({ ...prev, [porId]: e.target.value }))} 
                                                    />
                                                </TableCell>
                                                <TableCell className="min-w-[120px]">
                                                    <select 
                                                        className={cn(
                                                            "h-8 w-full rounded-md border border-input bg-background px-2 text-[11px]",
                                                            showErrors && count > 0 && !(lotNumbers[porId] || "").trim() && "border-red-500 ring-1 ring-red-500"
                                                        )}
                                                        value={lotNumbers[porId] || ""} 
                                                        onChange={(e) => setLotNumbers(prev => ({ ...prev, [porId]: e.target.value }))}
                                                    >
                                                        <option value="">Select Lot</option>
                                                        {lots.map((l: { lot_id: string | number; lot_name: string }) => <option key={l.lot_id} value={String(l.lot_id)}>{l.lot_name}</option>)}
                                                    </select>
                                                </TableCell>
                                                <TableCell className="min-w-[130px]">
                                                    <Input 
                                                        type="date" 
                                                        className={cn(
                                                            "h-8 text-[11px]",
                                                            showErrors && count > 0 && !(expiryDates[porId] || "").trim() && "border-red-500 ring-1 ring-red-500"
                                                        )}
                                                        value={expiryDates[porId] || ""} 
                                                        onChange={(e) => setExpiryDates(prev => ({ ...prev, [porId]: e.target.value }))} 
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right text-xs">{formatPHP(unitP)}</TableCell>
                                                <TableCell className="text-center text-[10px] text-muted-foreground">{it.discountType}</TableCell>
                                                <TableCell className="text-right text-xs text-red-600 font-medium">{(discA || 0) > 0 ? `${formatPHP(discA)}` : "—"}</TableCell>
                                                <TableCell className="text-right font-bold text-xs">{formatPHP(lineTotal)}</TableCell>
                                                <TableCell className="text-center font-bold text-xs">{expected}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="default" className="h-5">{count}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    });
                                })()}
                            </TableBody>
                            <TableFooter className="bg-muted/10">
                                <TableRow>
                                    <TableCell colSpan={7} className="text-right text-[10px] font-bold uppercase">Subtotal</TableCell>
                                    <TableCell className="text-right font-black text-slate-800">{formatPHP(financials.gross)}</TableCell>
                                    <TableCell className="text-center font-bold">{totalExpected}</TableCell>
                                    <TableCell className="text-center font-black">{totalEntered}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {allItems.length > 10 && (
                        <div className="flex items-center justify-between px-4 py-3 border rounded-md bg-muted/10 mt-2">
                            <span className="text-xs text-muted-foreground font-medium">
                                Showing {(reviewPage - 1) * 10 + 1}–{Math.min(reviewPage * 10, allItems.length)} of {allItems.length} items
                            </span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setReviewPage(p => Math.max(1, p - 1))} disabled={reviewPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-bold px-2">
                                    Page {reviewPage} of {Math.ceil(allItems.length / 10)}
                                </span>
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setReviewPage(p => Math.min(Math.ceil(allItems.length / 10), p + 1))} disabled={reviewPage === Math.ceil(allItems.length / 10)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex flex-col md:flex-row justify-end gap-6 border-t pt-4">
                        <div className="flex-1 max-w-sm ml-auto space-y-2 text-sm">
                            <div className="flex justify-between items-center text-slate-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Amount:</span>
                                <span className="font-bold text-slate-700">{formatPHP(financials.gross)}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Discount:</span>
                                <span className="font-bold">{formatPHP(financials.discount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 pb-2 border-b">
                                <span className="text-[11px] font-bold uppercase tracking-wider">Net Amount:</span>
                                <span className="font-bold text-slate-700">{formatPHP(financials.net)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider">VAT Details:</span>
                                <span className="font-bold text-slate-700">{financials.isExclusive ? "+" : ""}{formatPHP(financials.vatAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-600 pb-2 border-b">
                                <span className="text-[11px] font-bold uppercase tracking-wider">EWT:</span>
                                <span className="font-bold">{formatPHP(financials.whtAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4">
                                <span className="font-black text-sm uppercase tracking-widest text-slate-900 underline decoration-indigo-500 underline-offset-4">Grand Total:</span>
                                <span className="font-black text-xl text-indigo-600 drop-shadow-sm">{formatPHP(financials.grandTotal)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 italic leading-tight text-right">
                                Note: VAT and EWT figures are for reference and have not been deducted from the total.
                            </p>
                        </div>
                    </div>

                    {(clientSaveError || saveError) && (
                        <div className="mt-4 p-2 bg-red-50 text-red-600 text-sm font-semibold text-center border border-red-200 rounded-md">
                            {clientSaveError || saveError}
                        </div>
                    )}

                    <div className="mt-4 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            className="h-10 px-6 text-xs font-black uppercase tracking-widest border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => setPreviewOpen(true)}
                        >
                            Print Preview / Export PDF
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 h-10 px-8 text-xs font-black uppercase tracking-widest"
                            onClick={handleSaveReceipt}
                            disabled={savingReceipt}
                        >
                            {savingReceipt ? "Saving..." : "Save Final Receipt"}
                        </Button>
                    </div>
                </Card>
            )}

            {(receiptSaved || selectedPO) && (
                <ReceiptPreviewModal
                    isOpen={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    data={receiptSaved ? { ...receiptSaved, receiverName } : {
                        poId: selectedPO?.id || "",
                        receiptNo: "PREVIEW",
                        receiptDate: "PREVIEW",
                        receiptType: "PREVIEW",
                        isFullyReceived: totalEntered >= totalExpected,
                        savedAt: 0,
                        receiverName,
                        items: allItems.map(it => ({
                            name: it.name,
                            barcode: it.barcode,
                            productId: it.productId || "",
                            uom: it.uom || "",
                            unitPrice: Number(it.unitPrice) || 0,
                            discountAmount: Number(it.discountAmount) || 0,
                            batchNo: batchNumbers[String(it.id)] || "",
                            lotId: lotNumbers[String(it.id)] || "",
                            expiryDate: expiryDates[String(it.id)] || "",
                            expectedQty: Number(it.expectedQty) || 0,
                            receivedQtyAtStart: 0,
                            receivedQtyNow: safeCounts[String(it.id)] ?? 0,
                            rfids: []
                        }))
                    }}
                    poNumber={selectedPO?.poNumber || "N/A"}
                    supplierName={selectedPO?.supplier?.name || "N/A"}
                    priceType={selectedPO?.priceType || "VAT Inclusive"}
                />
            )}

            {/* ✅ Partial Receipt Confirmation Modal */}
            <AlertDialog open={isPartialModalOpen} onOpenChange={setIsPartialModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Incomplete Receiving</AlertDialogTitle>
                        <AlertDialogDescription>
                            The receiving of this PO is incomplete. To proceed is to make this PO a partial receipt.
                            Do you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeSave} className="bg-indigo-600 hover:bg-indigo-700">
                            Proceed as Partial
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
