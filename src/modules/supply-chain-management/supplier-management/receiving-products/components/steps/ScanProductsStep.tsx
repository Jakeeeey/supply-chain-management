"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useReceivingProducts } from "../../providers/ReceivingProductsProvider";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Printer, Eye, Trash2 } from "lucide-react";
import { generateOfficialSupplierReceiptV5 } from "../../utils/printUtils";
import { ReceiptPreviewModal } from "../ReceiptPreviewModal";

export function ScanProductsStep() {
    const router = useRouter();
    const [previewOpen, setPreviewOpen] = React.useState(false);

    const {
        selectedPO,
        rfid,
        setRfid,
        scanRFID,
        scanError,
        lastMatched,
        activity,
        saveReceipt,
        savingReceipt,
        scannedCountByPorId,
        saveError,
        removeActivity,

        receiptSaved,
        clearReceiptSaved,
    } = useReceivingProducts();

    // ✅ local validation for Save Receipt click
    const [clientSaveError, setClientSaveError] = React.useState("");

    // ✅ Pagination state
    const [activityPage, setActivityPage] = React.useState(1);
    const [cheatsheetPage, setCheatsheetPage] = React.useState(1);
    const [historyIdx, setHistoryIdx] = React.useState(0);
    const ITEMS_PER_PAGE = 5;

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

    // ✅ toast once when provider marks saved
    React.useEffect(() => {
        if (!receiptSaved) return;
        toast.success(`Receipt ${receiptSaved.receiptNo} saved successfully.`);
    }, [receiptSaved?.savedAt]); // depend on savedAt so it won't spam

    const safeCounts: Record<string, number> =
        scannedCountByPorId && typeof scannedCountByPorId === "object" ? scannedCountByPorId : {};

    const allItems = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        return allocs.flatMap((a) => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items.map((it) => ({
                ...it,
                porId: String((it as any)?.porId ?? it.id),
                branchName: a?.branch?.name ?? "Unassigned",
                rfids: Array.isArray((it as any)?.rfids) ? (it as any).rfids : [],
            }));
        });
    }, [selectedPO]);

    // Reset pagination when data changes
    React.useEffect(() => { setActivityPage(1); }, [activity?.length]);
    React.useEffect(() => { setCheatsheetPage(1); }, [allItems?.length]);

    const totalTagged = React.useMemo(() => {
        return allItems.reduce((acc: number, it: any) => acc + (Number(it.taggedQty) || 0), 0);
    }, [allItems]);

    const totalScanned = React.useMemo(() => {
        return Object.values(safeCounts).reduce((a, b) => a + (Number(b) || 0), 0);
    }, [safeCounts]);

    // ✅ treat "valid RFID scanned" as having at least 1 verified scan
    const hasValidScan = React.useMemo(() => {
        if (totalScanned > 0) return true;
        return Array.isArray(activity) && activity.some((a: any) => a?.status === "ok");
    }, [totalScanned, activity]);

    // ✅ auto-clear client validation once valid scans exist or after save
    React.useEffect(() => {
        if (hasValidScan && clientSaveError) setClientSaveError("");
    }, [hasValidScan, clientSaveError]);

    React.useEffect(() => {
        if (!receiptSaved) return;
        if (clientSaveError) setClientSaveError("");
    }, [receiptSaved?.savedAt, clientSaveError]);

    const handleSaveReceipt = React.useCallback(async () => {
        const status = (selectedPO?.status || "").toUpperCase();
        if (status === "CLOSED" || status === "RECEIVED") {
            setClientSaveError("you already save the receipt");
            return;
        }

        if (!hasValidScan) {
            if (status === "PARTIAL") {
                setClientSaveError("you can save receipt once for partial next is when the rfid is verified for fully received you can scan again ang save receipt");
            } else {
                setClientSaveError("Please scan a valid RFID for the product.");
            }
            return;
        }

        // ✅ Validation: Lot & Expiry for scanned items
        const missingLotOrExpiry: string[] = [];
        allItems.forEach(it => {
            const porId = String(it.porId ?? it.id);
            const scanned = safeCounts[porId] ?? 0;
            if (scanned > 0) {
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
    }, [hasValidScan, saveReceipt, selectedPO?.status, allItems, safeCounts, lotNumbers, expiryDates]);

    // ✅ Match History
    const okMatches = React.useMemo(() => {
        return (activity || []).filter(a => a.status === "ok");
    }, [activity]);

    // Reset history index when a new scan succeeds
    React.useEffect(() => {
        if (okMatches.length > 0) setHistoryIdx(0);
    }, [okMatches.length]);

    const currentMatch = okMatches[historyIdx];

    // ✅ Pagination Helpers
    const activityPaginated = React.useMemo(() => {
        const start = (activityPage - 1) * ITEMS_PER_PAGE;
        return (activity || []).slice(start, start + ITEMS_PER_PAGE);
    }, [activity, activityPage]);

    const cheatsheetPaginated = React.useMemo(() => {
        const list = allItems.filter(it => Number(it.expectedQty || it.taggedQty || 0) > 0);
        const start = (cheatsheetPage - 1) * ITEMS_PER_PAGE;
        return list.slice(start, start + ITEMS_PER_PAGE);
    }, [allItems, cheatsheetPage]);

    const totalActivityPages = Math.ceil((activity?.length || 0) / ITEMS_PER_PAGE);
    const totalCheatsheetPages = Math.ceil(allItems.filter(it => Number(it.expectedQty || it.taggedQty || 0) > 0).length / ITEMS_PER_PAGE);

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-sm font-semibold">Scan RFID</div>
                        <div className="text-xs text-muted-foreground">
                            Scan RFID again to verify it belongs to this PO. Barcode is not required here.
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    <Input
                        value={rfid}
                        onChange={(e) => setRfid(e.target.value)}
                        placeholder="Scan RFID..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter") scanRFID();
                        }}
                    />

                    {scanError ? <div className="text-xs text-destructive">{scanError}</div> : null}

                    <Button className="w-full" onClick={scanRFID} type="button">
                        Verify RFID
                    </Button>

                    {/* ✅ Matched Piece History with Pagination */}
                    {okMatches.length > 0 && currentMatch && (
                        <div className="rounded-xl border bg-primary/5 p-4 border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] font-black text-primary uppercase tracking-widest">Matched Piece</div>
                                        {okMatches.length > 1 && (
                                            <div className="flex items-center gap-1.5 ml-auto sm:ml-0 bg-background/50 px-1.5 py-0.5 rounded-full border border-primary/10">
                                                <button 
                                                    onClick={() => setHistoryIdx(p => Math.min(okMatches.length - 1, p + 1))}
                                                    disabled={historyIdx >= okMatches.length - 1}
                                                    className="text-[10px] font-bold text-muted-foreground hover:text-primary disabled:opacity-30"
                                                >
                                                    {"<"}
                                                </button>
                                                <span className="text-[9px] font-bold text-primary tabular-nums">
                                                    {historyIdx + 1}/{okMatches.length}
                                                </span>
                                                <button 
                                                    onClick={() => setHistoryIdx(p => Math.max(0, p - 1))}
                                                    disabled={historyIdx <= 0}
                                                    className="text-[10px] font-bold text-muted-foreground hover:text-primary disabled:opacity-30"
                                                >
                                                    {">"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-base font-black tracking-tight truncate">{currentMatch.productName}</div>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <div className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border inline-block select-none">
                                            ID Verified • Secure Session
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0 w-full sm:w-auto">
                                    <Badge 
                                        variant="default"
                                        className="bg-[#16a34a] text-white hover:bg-[#15803d] shadow-md border-green-700/20 px-4 py-1.5 text-xs font-black uppercase tracking-tight ring-2 ring-green-600/10 pointer-events-none"
                                        style={{ backgroundColor: '#16a34a', color: '#ffffff', opacity: 1 }}
                                    >
                                        Verified OK
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* ✅ show after save */}
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
                            <ScrollArea className="max-h-[200px] rounded-md border p-4 bg-muted/30">
                                <div className="space-y-4">
                                    {receiptSaved.items.map((it, idx) => (
                                        <div key={idx} className="flex flex-col gap-1 pb-3 border-b last:border-0">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium text-sm">{it.name}</div>
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    SKU: {it.barcode}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex justify-between">
                                                <span>RFIDs: {it.rfids.join(", ")}</span>
                                                <span className="font-semibold text-primary">Qty: {it.receivedQtyNow}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Recent Activity Log</div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">Page {activityPage} of {Math.max(1, totalActivityPages)}</div>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                disabled={activityPage <= 1}
                                onClick={() => setActivityPage(p => p - 1)}
                            >
                                <span className="text-[10px]">{"<"}</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                disabled={activityPage >= totalActivityPages}
                                onClick={() => setActivityPage(p => p + 1)}
                            >
                                <span className="text-[10px]">{">"}</span>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-dashed">
                    <div className="p-3">
                        {activity.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                No activity yet. Scan an RFID to begin receiving.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {activityPaginated.map((a) => (
                                    <div key={a.id} className="flex items-center justify-between gap-3 text-xs">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium">{a.productName}</div>
                                            <div className="truncate text-[10px] text-muted-foreground italic">Verification Successful</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant={a.status === "ok" ? "outline" : "secondary"}
                                                className={a.status === "ok" ? "border-green-500/40 text-green-600 bg-green-500/5" : ""}
                                            >
                                                {a.status === "ok" ? "OK" : "WARN"}
                                            </Badge>
                                            {a.status === "ok" && (
                                                <button
                                                    type="button"
                                                    title="Remove this scan"
                                                    onClick={() => removeActivity(a.id)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card className="p-4 overflow-hidden">
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-semibold">Receiving Progress</div>
                    <Badge variant="outline" className="font-mono">
                        Total Items: {allItems.length}
                    </Badge>
                </div>

                <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm">
                            <TableRow>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider bg-muted/50">Date</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-left bg-muted/50">Product Name</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-left bg-muted/50">Lot Number</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-left bg-muted/50">Expiry</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-center bg-muted/50">PO Qty</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-center bg-muted/50">Received</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-right bg-muted/50">Unit Price</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-center bg-muted/50">Discount Type</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-right bg-muted/50">Discount</TableHead>
                                <TableHead className="text-[10px] h-8 font-black uppercase tracking-wider text-right bg-muted/50">Net Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allItems.map((it: any) => {
                                const porId = String(it.porId ?? it.id);
                                const scanned = safeCounts[porId] ?? 0;
                                const expected = Number(it.expectedQty || it.taggedQty || 0);
                                const date = selectedPO?.createdAt ? new Date(selectedPO.createdAt).toLocaleDateString() : "—";
                                const up = Number(it.unitPrice || 0);
                                const discountPerUnit = Number(it.discountAmount || 0);
                                const lineDiscount = expected * discountPerUnit;
                                const na = expected * (up - discountPerUnit);

                                return (
                                    <TableRow key={porId}>
                                        <TableCell className="text-[10px] font-mono whitespace-nowrap">{date}</TableCell>
                                        <TableCell className="max-w-[150px]">
                                            <div className="truncate text-[11px] font-bold">{it.name}</div>
                                            <div className="text-[9px] text-muted-foreground font-mono">SKU: {it.barcode}</div>
                                        </TableCell>
                                        <TableCell className="min-w-[120px]">
                                            <Input
                                                className="h-8 text-[11px] font-bold uppercase"
                                                placeholder="Lot #"
                                                value={lotNumbers[porId] || ""}
                                                onChange={(e) => setLotNumbers(prev => ({ ...prev, [porId]: e.target.value }))}
                                            />
                                        </TableCell>
                                        <TableCell className="min-w-[140px]">
                                            <Input
                                                type="date"
                                                className="h-8 text-[11px] font-bold"
                                                value={expiryDates[porId] || ""}
                                                onChange={(e) => setExpiryDates(prev => ({ ...prev, [porId]: e.target.value }))}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-xs">{expected}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={scanned >= expected ? "default" : "secondary"} className="h-5 text-[10px] font-mono px-1">
                                                {scanned} / {expected}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-[10px] font-mono">
                                            {up.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="text-[9px] h-4 font-normal">
                                                {it.discountType || "No Discount"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-[10px] font-mono">
                                            {lineDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-[11px] font-mono text-primary">
                                            {na.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter className="bg-muted/30 sticky bottom-0 z-20 shadow-sm border-t">
                            <TableRow>
                                <TableCell colSpan={9} className="text-right text-[10px] font-black uppercase tracking-widest bg-muted/30">Grand Total</TableCell>
                                <TableCell className="text-right font-black text-xs text-primary font-mono bg-muted/30">
                                    {allItems.reduce((sum: number, it: any) => {
                                        const expected = Number(it.expectedQty || it.taggedQty || 0);
                                        const up = Number(it.unitPrice || 0);
                                        const dp = Number(it.discountAmount || 0);
                                        return sum + (expected * (up - dp));
                                    }, 0).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </ScrollArea>

                {/* ✅ validation priority: local click-validation first, then provider saveError */}
                {clientSaveError ? (
                    <div className="mt-3 text-xs text-destructive">{clientSaveError}</div>
                ) : saveError ? (
                    <div className="mt-3 text-xs text-destructive">{saveError}</div>
                ) : null}

                <div className="mt-4">
                    <Button
                        className="w-full h-11 text-xs font-black uppercase tracking-widest"
                        onClick={handleSaveReceipt}
                        disabled={savingReceipt}
                        type="button"
                    >
                        {savingReceipt ? "Saving..." : "Save Receipt"}
                    </Button>
                </div>
            </Card>

            <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Tagged Products (Verification List)</div>
                    <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">Page {cheatsheetPage} of {Math.max(1, totalCheatsheetPages)}</div>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                disabled={cheatsheetPage <= 1}
                                onClick={() => setCheatsheetPage(p => p - 1)}
                            >
                                <span className="text-[10px]">{"<"}</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                disabled={cheatsheetPage >= totalCheatsheetPages}
                                onClick={() => setCheatsheetPage(p => p + 1)}
                            >
                                <span className="text-[10px]">{">"}</span>
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    {cheatsheetPaginated.map((it: any) => {
                        const count = Number(it.expectedQty || it.taggedQty || 0);
                        return (
                            <div key={String(it.porId ?? it.id)} className="flex items-center justify-between py-1 border-b border-dashed last:border-0">
                                <div className="text-[11px] font-medium truncate max-w-[200px]">
                                    {it.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                    {count} {count === 1 ? "Unit" : "Units"} (RFIDs Hidden)
                                </div>
                            </div>
                        );
                    })}
                    {cheatsheetPaginated.length === 0 && (
                        <div className="text-[10px] text-muted-foreground italic py-4 text-center">No tagged products found for this PO.</div>
                    )}
                </div>
            </Card>

            {/* Modal should be mountable if we have a current selectedPO or a receiptSaved */}
            {(receiptSaved || selectedPO) && (
                <ReceiptPreviewModal
                    isOpen={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    data={receiptSaved || {
                        poId: selectedPO?.id || "",
                        receiptNo: "PREVIEW",
                        receiptDate: "PREVIEW",
                        receiptType: "PREVIEW",
                        isFullyReceived: totalScanned === totalTagged,
                        savedAt: 0,
                        items: allItems.map(it => ({
                            name: it.name,
                            barcode: it.barcode,
                            productId: (it as any).productId || "",
                            expectedQty: Number(it.taggedQty) || 0,
                            receivedQtyAtStart: 0,
                            receivedQtyNow: safeCounts[String(it.porId ?? it.id)] ?? 0,
                            rfids: (activity || [])
                                .filter((a: any) => a.productId === (it as any).productId && a.status === "ok")
                                .map((a: any) => a.rfid)
                        }))
                    }}
                    poNumber={selectedPO?.poNumber || "N/A"}
                    supplierName={selectedPO?.supplier?.name || "N/A"}
                />
            )}
        </div>
    );
}
