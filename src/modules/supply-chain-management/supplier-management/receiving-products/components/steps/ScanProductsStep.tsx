"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useReceivingProducts } from "../../providers/ReceivingProductsProvider";

export function ScanProductsStep() {
    const {
        selectedPO,
        rfid,
        setRfid,
        strict,
        setStrict,
        scanRFID,
        scanError,
        lastMatched,
        activity,
        saveReceipt,
        savingReceipt,
        scannedCountByPorId,
        saveError,
    } = useReceivingProducts();

    // ✅ HARD SAFE: always a plain object
    const safeCounts: Record<string, number> =
        scannedCountByPorId && typeof scannedCountByPorId === "object"
            ? scannedCountByPorId
            : {};

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

                    <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">Strict</div>
                        <Switch checked={strict} onCheckedChange={setStrict} />
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

                    {lastMatched ? (
                        <div className="rounded-lg border p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground">MATCHED PRODUCT</div>
                                    <div className="text-base font-semibold">{lastMatched.productName}</div>
                                    <div className="mt-1 text-xs text-muted-foreground">SKU: {lastMatched.sku}</div>
                                </div>
                                <Badge variant={lastMatched.alreadyReceived ? "secondary" : "outline"}>
                                    {lastMatched.alreadyReceived ? "Already Received" : "Verified"}
                                </Badge>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Card>

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
                                    <div className="text-xs text-muted-foreground">{it.branchName}</div>
                                </div>
                                <div className="text-sm">
                                    {scanned} / {expected}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {saveError ? <div className="mt-3 text-xs text-destructive">{saveError}</div> : null}

                <div className="mt-4">
                    <Button className="w-full" onClick={saveReceipt} disabled={savingReceipt} type="button">
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
                                        <div className="text-sm font-medium">{it.name}</div>
                                        <div className="text-xs text-muted-foreground mb-2">
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
        </div>
    );
}
