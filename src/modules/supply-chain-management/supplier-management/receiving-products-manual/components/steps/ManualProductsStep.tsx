/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useReceivingProductsManual } from "../../providers/ReceivingProductsManualProvider";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ReceiptPreviewModal } from "../ReceiptPreviewModal";

export function ManualProductsStep() {
    const router = useRouter();
    const [previewOpen, setPreviewOpen] = React.useState(false);

    const {
        selectedPO,
        manualCounts,
        setManualCounts,
        saveReceipt,
        savingReceipt,
        saveError,
        receiptSaved,
    } = useReceivingProductsManual();

    // ✅ local validation for Save Receipt click
    const [clientSaveError, setClientSaveError] = React.useState("");

    // ✅ Pagination state
    const [receivingPage, setReceivingPage] = React.useState(1);
    const ITEMS_PER_PAGE = 10;

    // ✅ Lot & Expiry mandatory inputs
    const [lotNumbers, setLotNumbers] = React.useState<Record<string, string>>({});
    const [expiryDates, setExpiryDates] = React.useState<Record<string, string>>({});

    // Sync from selectedPO if data exists (per item)
    React.useEffect(() => {
        if (!selectedPO?.allocations) return;
        const newLots: Record<string, string> = {};
        const newExpiries: Record<string, string> = {};
        
        selectedPO.allocations.forEach(a => {
            a.items.forEach(it => {
                const porId = String((it as any).porId ?? it.id);
                if ((it as any).lot_no) newLots[porId] = (it as any).lot_no;
                if ((it as any).expiry_date) newExpiries[porId] = (it as any).expiry_date;
            });
        });
        
        setLotNumbers(prev => ({ ...newLots, ...prev }));
        setExpiryDates(prev => ({ ...newExpiries, ...prev }));
    }, [selectedPO?.id]);

    React.useEffect(() => {
        if (!receiptSaved) return;
        toast.success(`Receipt ${receiptSaved.receiptNo} saved successfully.`);
    }, [receiptSaved?.savedAt]);

    const allItems = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        return allocs.flatMap((a) => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items
                .map((it) => ({
                    ...it,
                    porId: String((it as any)?.porId ?? it.id),
                    branchName: a?.branch?.name ?? "Unassigned",
                }))
                // Filter out fully-received items for partial receiving
                .filter((it: any) => {
                    const received = Number(it.receivedQty ?? 0);
                    const expected = Number(it.expectedQty ?? 0);
                    return expected <= 0 || received < expected;
                });
        });
    }, [selectedPO]);

    const totalEntered = React.useMemo(() => {
        return Object.values(manualCounts).reduce((a, b) => a + (Number(b) || 0), 0);
    }, [manualCounts]);

    const hasValidEntry = totalEntered > 0;

    React.useEffect(() => {
        if (hasValidEntry && clientSaveError) setClientSaveError("");
    }, [hasValidEntry, clientSaveError]);

    const handleSaveReceipt = React.useCallback(async () => {
        const status = (selectedPO?.status || "").toUpperCase();
        if (status === "CLOSED" || status === "RECEIVED") {
            setClientSaveError("You already saved the receipt for this PO.");
            return;
        }

        if (!hasValidEntry) {
            setClientSaveError("Please enter valid received quantities for at least one item.");
            return;
        }

        const missingLotOrExpiry: string[] = [];
        allItems.forEach(it => {
            const porId = String(it.porId ?? it.id);
            const qty = manualCounts[porId] ?? 0;
            if (qty > 0) {
                const lot = lotNumbers[porId] || "";
                const exp = expiryDates[porId] || "";
                if (!lot.trim() || !exp.trim()) missingLotOrExpiry.push(it.name);
            }
        });

        if (missingLotOrExpiry.length > 0) {
            toast.warning(`Lot Number and Expiry Date are required for: ${missingLotOrExpiry.slice(0, 3).join(", ")}${missingLotOrExpiry.length > 3 ? "..." : ""}`);
            setClientSaveError("Lot Number and Expiry Date are required for all scanned items.");
            return;
        }

        setClientSaveError("");
        const metaData: Record<string, { lotNo: string; expiryDate: string }> = {};
        Object.keys(lotNumbers).forEach(id => {
            metaData[id] = { lotNo: lotNumbers[id], expiryDate: expiryDates[id] };
        });

        await Promise.resolve(saveReceipt(metaData));
    }, [hasValidEntry, saveReceipt, selectedPO?.status, allItems, manualCounts, lotNumbers, expiryDates]);

    const handleCountChange = (porId: string, val: string, expectedQty: number) => {
        const parsed = parseInt(val, 10);
        let validVal = isNaN(parsed) ? 0 : parsed;
        if (validVal > expectedQty) validVal = expectedQty;
        if (validVal < 0) validVal = 0;

        setManualCounts(prev => ({ ...prev, [porId]: validVal }));
    };

    return (
        <div className="space-y-4">
            <Card className="p-4 border-primary shadow-sm bg-primary/5">
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="text-center space-y-1">
                        <div className="text-xl font-black uppercase tracking-wide text-primary">
                            Manual Entry Active
                        </div>
                        <div className="text-sm text-foreground max-w-[350px]">
                            Enter the physical quantity received into the Qty fields below.
                        </div>
                    </div>
                </div>
            </Card>

            {receiptSaved && (
                <Card className="p-4 border-2 border-primary/20 shadow-lg">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold">Receipt Saved Successfully!</h3>
                                    <Badge 
                                        variant={receiptSaved.isFullyReceived ? "default" : "secondary"}
                                        className={receiptSaved.isFullyReceived ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600 text-white"}
                                    >
                                        {receiptSaved.isFullyReceived ? "FULLY RECEIVED" : "PARTIALLY RECEIVED"}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Receipt No: <span className="font-mono font-bold text-foreground">{receiptSaved.receiptNo}</span> • {receiptSaved.receiptDate}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contents of this receipt:</div>
                            <div className="max-h-[250px] overflow-y-auto rounded-md border p-4 bg-muted/30">
                                <div className="space-y-4">
                                    {receiptSaved.items.filter(it => it.receivedQtyNow > 0).map((it, idx) => (
                                        <div key={idx} className="flex flex-col gap-1 pb-3 border-b border-primary/10 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium text-sm text-foreground">{it.name}</div>
                                                <Badge variant="outline" className="text-[10px] font-mono bg-background">
                                                    SKU: {it.barcode}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex justify-between items-end">
                                                <span className="leading-snug">Manual Entry</span>
                                                <span className="font-semibold text-primary whitespace-nowrap ml-4">Qty: {it.receivedQtyNow}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="p-4 overflow-hidden shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-base font-semibold text-primary uppercase tracking-wider">Item Receiving Grid</div>
                    <Badge variant="outline" className="font-mono bg-background shadow-xs">
                        Pending Items: {allItems.length}
                    </Badge>
                </div>

                {(() => {
                    const rcvTotalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
                    const rcvStart = (receivingPage - 1) * ITEMS_PER_PAGE;
                    const rcvPageItems = allItems.slice(rcvStart, rcvStart + ITEMS_PER_PAGE);

                    return (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm border-b">
                                        <TableRow>
                                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider bg-muted/50 text-left">Product / SKU</TableHead>
                                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-left bg-muted/50">Lot Number</TableHead>
                                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-left bg-muted/50">Expiry</TableHead>
                                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center bg-muted/50 w-24">Ordered</TableHead>
                                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center bg-muted/50 w-28 text-primary">Receive Qty</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rcvPageItems.map((it: any) => {
                                            const porId = String(it.porId ?? it.id);
                                            const expected = Number(it.expectedQty || 0);
                                            const receivedSoFar = Number(it.receivedQty || 0);
                                            const remaining = expected - receivedSoFar;
                                            const currentEntry = manualCounts[porId] || "";

                                            return (
                                                <TableRow key={porId}>
                                                    <TableCell className="max-w-[220px] overflow-hidden align-middle">
                                                        <div className="truncate text-sm font-bold text-foreground" title={it.name}>{it.name}</div>
                                                        <div className="truncate text-[10px] text-muted-foreground font-mono" title={`SKU: ${it.barcode}`}>SKU: {it.barcode}</div>
                                                    </TableCell>
                                                    <TableCell className="min-w-[120px] align-middle">
                                                        <Input
                                                            className="h-8 text-xs font-bold uppercase shadow-none bg-background rounded border-muted-foreground/30 focus-visible:ring-1"
                                                            placeholder="Lot #"
                                                            value={lotNumbers[porId] || ""}
                                                            onChange={(e) => setLotNumbers(prev => ({ ...prev, [porId]: e.target.value }))}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="min-w-[140px] align-middle">
                                                        <Input
                                                            type="date"
                                                            className="h-8 text-xs font-bold shadow-none bg-background rounded border-muted-foreground/30 focus-visible:ring-1"
                                                            value={expiryDates[porId] || ""}
                                                            onChange={(e) => setExpiryDates(prev => ({ ...prev, [porId]: e.target.value }))}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center align-middle">
                                                        <div className="font-bold text-sm">{expected}</div>
                                                        <div className="text-[10px] text-muted-foreground">Rem: {remaining}</div>
                                                    </TableCell>
                                                    <TableCell className="align-middle">
                                                        <div className="relative">
                                                            <Input 
                                                                type="number"
                                                                min="0"
                                                                max={expected}
                                                                placeholder="0"
                                                                value={currentEntry}
                                                                onChange={(e) => handleCountChange(porId, e.target.value, expected)}
                                                                className="h-9 w-full text-center font-black text-sm border-2 focus-visible:border-primary focus-visible:ring-0 shadow-none transition-colors"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {rcvPageItems.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    No items pending reception.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {allItems.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-xs font-medium text-muted-foreground">
                                        Page {receivingPage} of {rcvTotalPages}
                                    </div>
                                    <Pagination className="w-auto mx-0">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); if (receivingPage > 1) setReceivingPage(p => p - 1); }}
                                                    className={receivingPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>
                                            {Array.from({ length: rcvTotalPages }, (_, i) => i + 1).map(p => (
                                                <PaginationItem key={p}>
                                                    <PaginationLink
                                                        href="#"
                                                        isActive={p === receivingPage}
                                                        onClick={(e) => { e.preventDefault(); setReceivingPage(p); }}
                                                        className="cursor-pointer"
                                                    >
                                                        {p}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); if (receivingPage < rcvTotalPages) setReceivingPage(p => p + 1); }}
                                                    className={receivingPage >= rcvTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    );
                })()}

                {clientSaveError ? (
                    <div className="mt-4 text-xs font-bold text-destructive bg-destructive/10 p-2 rounded">{clientSaveError}</div>
                ) : saveError ? (
                    <div className="mt-4 text-xs font-bold text-destructive bg-destructive/10 p-2 rounded">{saveError}</div>
                ) : null}

                <div className="mt-6">
                    <Button
                        className="w-full h-12 text-sm font-black uppercase tracking-widest shadow hover:shadow-md transition-shadow"
                        onClick={handleSaveReceipt}
                        disabled={savingReceipt}
                        type="button"
                    >
                        {savingReceipt ? "Saving Receipt..." : "Save Manual Receipt"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
