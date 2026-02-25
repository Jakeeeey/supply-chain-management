"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useReceivingProducts } from "../../providers/ReceivingProductsProvider";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Printer, Eye } from "lucide-react";
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

        receiptSaved,
        clearReceiptSaved,
    } = useReceivingProducts();

    // ✅ local validation for Save Receipt click
    const [clientSaveError, setClientSaveError] = React.useState("");

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

    const totalTagged = React.useMemo(() => {
        return allItems.reduce((acc, it: any) => acc + (Number(it.taggedQty) || 0), 0);
    }, [allItems]);

    const totalScanned = React.useMemo(() => {
        return Object.values(safeCounts).reduce((a, b) => a + (Number(b) || 0), 0);
    }, [safeCounts]);

    // ✅ treat "valid RFID scanned" as having at least 1 verified scan
    // - Prefer totals derived from scannedCountByPorId (usually increments only on matched/ok)
    // - Fallback: activity has at least 1 OK entry
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
        // ✅ 1. Check if already fully received
        const status = (selectedPO?.status || "").toUpperCase();
        if (status === "CLOSED" || status === "RECEIVED") {
            setClientSaveError("you already save the receipt");
            return;
        }

        // ✅ 2. Check for partial behavior
        if (!hasValidScan) {
            if (status === "PARTIAL") {
                setClientSaveError("you can save receipt once for partial next is when the rfid is verified for fully received you can scan again ang save receipt");
            } else {
                setClientSaveError("Please scan a valid RFID for the product.");
            }
            return;
        }

        // ✅ 3. Proceed to save if scans are present
        setClientSaveError("");
        await Promise.resolve(saveReceipt());
    }, [hasValidScan, saveReceipt, selectedPO?.status]);

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
                    <Button
                        type="button"
                        variant="outline"
                        className="hidden sm:flex gap-2 border-primary/20 hover:bg-primary/5"
                        onClick={() => setPreviewOpen(true)}
                    >
                        <Eye className="h-4 w-4" />
                        Review & Print
                    </Button>
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

                    {lastMatched ? (
                        <div className="rounded-xl border bg-primary/5 p-4 border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-primary uppercase tracking-widest">Matched Piece</div>
                                    <div className="text-base font-black tracking-tight">{lastMatched.productName}</div>
                                    <div className="text-xs font-mono text-muted-foreground bg-background px-2 py-0.5 rounded border inline-block">
                                        ID: {lastMatched.sku}
                                    </div>
                                </div>
                                <Badge 
                                    variant={lastMatched.alreadyReceived ? "secondary" : "default"}
                                    className={lastMatched.alreadyReceived ? "" : "bg-green-600 hover:bg-green-700"}
                                >
                                    {lastMatched.alreadyReceived ? "Already Counted" : "Verified OK"}
                                </Badge>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Card>

            {/* ✅ show after save */}
            {receiptSaved ? (
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

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button
                                type="button"
                                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setPreviewOpen(true)}
                            >
                                <Eye className="h-4 w-4" />
                                Review & Print
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : null}

            <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Recent Activity Log</div>
                    <div className="text-xs text-muted-foreground">{activity.length} entries</div>
                </div>

                <div className="rounded-lg border border-dashed">
                    <ScrollArea className="h-40">
                        <div className="p-3">
                            {activity.length === 0 ? (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    No activity yet. Scan an RFID to begin receiving.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activity.map((a) => (
                                        <div key={a.id} className="flex items-center justify-between gap-3 text-xs">
                                            <div className="min-w-0">
                                                <div className="truncate font-medium">{a.productName}</div>
                                                <div className="truncate text-muted-foreground">{a.rfid}</div>
                                            </div>
                                            <Badge variant={a.status === "ok" ? "outline" : "secondary"}>
                                                {a.status === "ok" ? "OK" : "WARN"}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </Card>

            <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">Receiving Progress</div>
                    <div className="text-sm font-semibold">
                        {totalScanned} / {totalTagged}
                    </div>
                </div>

                <div className="space-y-3">
                    {allItems.map((it: any) => {
                        const porId = String(it.porId ?? it.id);
                        const scanned = safeCounts[porId] ?? 0;
                        const expected = Number(it.taggedQty) || 0;

                        return (
                            <div key={porId} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">{it.name}</div>
                                    <div className="text-[10px] tabular-nums text-muted-foreground/70">SKU: {it.barcode} • {it.branchName}</div>
                                </div>
                                <div className="text-sm font-semibold text-primary">
                                    {scanned} / {expected}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ✅ validation priority: local click-validation first, then provider saveError */}
                {clientSaveError ? (
                    <div className="mt-3 text-xs text-destructive">{clientSaveError}</div>
                ) : saveError ? (
                    <div className="mt-3 text-xs text-destructive">{saveError}</div>
                ) : null}

                <div className="mt-4">
                    <Button
                        className="w-full"
                        onClick={handleSaveReceipt}
                        disabled={savingReceipt}
                        type="button"
                    >
                        {savingReceipt ? "Saving..." : "Save Receipt"}
                    </Button>
                </div>
            </Card>

            <Card className="p-4">
                <div className="mb-2 text-sm font-semibold">Tagged RFIDs (Cheatsheet)</div>
                <div className="text-xs text-muted-foreground">
                    These RFIDs were tagged in Tagging of PO. Receiver scans the same RFID to verify.
                </div>

                <div className="mt-3 rounded-lg border">
                    <ScrollArea className="h-56">
                        <div className="p-3 space-y-3">
                            {allItems.map((it: any) => {
                                const porId = String(it.porId ?? it.id);
                                const rfids = Array.isArray(it.rfids) ? it.rfids : [];

                                return (
                                    <div key={porId} className="rounded-md border p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-sm font-medium">{it.name}</div>
                                            <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5">
                                                SKU: {it.barcode}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/40" />
                                            {it.branchName} • Tagged: {Number(it.taggedQty) || 0}
                                        </div>

                                        <div className="grid gap-1">
                                            {rfids.length ? (
                                                rfids.map((code: string) => (
                                                    <div key={code} className="text-xs font-mono break-all">
                                                        {code}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-muted-foreground">No RFIDs tagged.</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
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
                        receiptDate: new Date().toLocaleDateString(),
                        receiptType: "PREVIEW",
                        isFullyReceived: totalScanned === totalTagged,
                        savedAt: Date.now(),
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
