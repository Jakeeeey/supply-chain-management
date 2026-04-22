"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReceivingProducts, ReceivingPOItem, ActivityRow } from "../../providers/ReceivingProductsProvider";
import { useKeyboardScanner } from "../../hooks/useKeyboardScanner";

export function TagRFIDStep({ onContinue }: { onContinue: () => void }) {
    const {
        selectedPO,
        setRfid,
        scanRFID,
        scanError,
        activity,
        verifiedBarcodes,
        scannedCountByPorId,
        activeProductId,
        setActiveProductId,
    } = useReceivingProducts();

    const [activityPage, setActivityPage] = React.useState(1);
    const ITEMS_PER_PAGE = 5;

    // Auto-scan RFID
    const handleAutoScan = React.useCallback((scannedValue: string) => {
        // Only trigger if a product is selected
        if (activeProductId) {
            scanRFID(scannedValue);
        }
    }, [scanRFID, activeProductId]);

    useKeyboardScanner({
        enabled: !!selectedPO && !!activeProductId,
        onScan: handleAutoScan,
        minLength: 6,
        endKey: "Enter",
        maxDelayMs: 50,
        cooldownMs: 300,
    });

    React.useEffect(() => {
        if (!scanError) return;
        const timer = setTimeout(() => setRfid(""), 200);
        return () => clearTimeout(timer);
    }, [scanError, setRfid]);

    // Derived active products (only the ones verified via Barcode previously)
    const activeProducts = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        return allocs.flatMap(a => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items
                .map((it) => ({
                    ...it,
                    porId: String(it.porId || it.id),
                }))
                .filter((it) => verifiedBarcodes.includes(it.productId)) as Array<ReceivingPOItem & { porId: string }>;
        });
    }, [selectedPO, verifiedBarcodes]);

    const safeCounts: Record<string, number> = React.useMemo(() =>
        scannedCountByPorId && typeof scannedCountByPorId === "object" ? scannedCountByPorId : {}, [scannedCountByPorId]);

    // Ensure all verified products have at least their expected quantity or 1 RFID scanned (if extra).
    const isTaggingComplete = React.useMemo(() => {
        if (activeProducts.length === 0) return false; // Safety
        
        for (const p of activeProducts) {
            const expected = Number(p.expectedQty || p.taggedQty || 0);
            const scannedCount = safeCounts[p.porId] || 0;
            // If expected is 0 (like extra products), we expect at least 1 tag. 
            // If expected > 0, we expect all tags.
            const target = expected > 0 ? expected : 1;
            
            if (scannedCount < target) {
                return false;
            }
        }
        return true;
    }, [activeProducts, safeCounts]);



    // Pagination
    const activityPaginated = React.useMemo(() => {
        const start = (activityPage - 1) * ITEMS_PER_PAGE;
        return (activity || []).slice(start, start + ITEMS_PER_PAGE);
    }, [activity, activityPage]);

    const totalActivityPages = Math.ceil((activity?.length || 0) / ITEMS_PER_PAGE);

    const activeItem = React.useMemo(() => {
        if (!activeProductId) return null;
        return activeProducts.find((p) => p.productId === activeProductId);
    }, [activeProductId, activeProducts]);

    if (!activeProductId) {
        return (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <Card className="p-0 border overflow-hidden">
                    <div className="bg-muted p-4 border-b">
                        <div className="font-semibold">Select a Product to Tag</div>
                        <div className="text-xs text-muted-foreground">Only one product can be tagged at a time. Select an incomplete product below to begin scanning.</div>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Product</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-center">Scanned / Required</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeProducts.map((p) => {
                                    const expected = Number(p.expectedQty || 0);
                                    const target = expected > 0 ? expected : 1;
                                    const scanned = safeCounts[p.porId] || 0;
                                    const isDone = scanned >= target;

                                    return (
                                        <tr key={p.porId} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{p.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{p.barcode}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={isDone ? "default" : "outline"} className={isDone ? "bg-green-600 font-bold" : "font-bold"}>
                                                    {scanned} / {target}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button 
                                                    size="sm" 
                                                    variant={isDone ? "secondary" : "default"}
                                                    className={!isDone ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                                    onClick={() => setActiveProductId(p.productId)}
                                                >
                                                    {isDone ? "Review Tags" : "Tag Item"}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="flex justify-end pt-4">
                    <Button 
                        className="h-12 w-full md:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 font-bold uppercase" 
                        onClick={onContinue}
                        disabled={!isTaggingComplete}
                    >
                        {isTaggingComplete ? "Proceed to Final Review" : "Finish Scanning Required RFIDs"}
                    </Button>
                </div>
            </div>
        );
    }

    const activeExpected = Number((activeItem as ReceivingPOItem)?.expectedQty || 0);
    const activeTarget = activeExpected > 0 ? activeExpected : 1;
    const activeScanned = safeCounts[String((activeItem as ReceivingPOItem)?.porId || "")] || 0;
    const activeDone = activeScanned >= activeTarget;

    return (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={() => setActiveProductId(null)} className="text-muted-foreground hover:text-foreground">
                    ← Back to Product List
                </Button>
            </div>

            <Card className="p-4 border-2 border-green-500/30 bg-green-50/30 dark:bg-green-950/10 mb-4">
                <div className="flex flex-col items-center justify-center py-6 gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                <div className={`w-5 h-5 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] ${activeDone ? 'bg-green-500' : 'bg-green-500 animate-pulse'}`} />
                            </div>
                        </div>
                        {!activeDone && <div className="absolute inset-0 rounded-full border-2 border-green-500/30 animate-ping" style={{ animationDuration: "2s" }} />}
                    </div>
                    <div className="text-center space-y-1">
                        <div className="text-lg font-black uppercase tracking-wide text-green-600 dark:text-green-400">
                            Now Tagging: {activeItem?.name}
                        </div>
                        <div className="text-sm font-medium text-slate-700 bg-white px-3 py-1 rounded shadow-sm inline-block border">
                            Scanned: <span className={activeDone ? "text-green-600 font-bold" : "font-bold"}>{activeScanned}</span> of {activeTarget}
                        </div>
                    </div>
                </div>

                {scanError && (
                    <div className="text-xs text-destructive animate-in fade-in duration-200 p-3 bg-red-50 rounded-lg border border-red-200 text-center mb-4 font-semibold uppercase">
                        {scanError}
                    </div>
                )}
            </Card>

            <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Activity Log for {activeItem?.name}</div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6" disabled={activityPage <= 1} onClick={() => setActivityPage(x => x - 1)}>
                            <span className="text-[10px]">{"<"}</span>
                        </Button>
                        <Button variant="outline" size="icon" className="h-6 w-6" disabled={activityPage >= totalActivityPages} onClick={() => setActivityPage(x => x + 1)}>
                            <span className="text-[10px]">{">"}</span>
                        </Button>
                    </div>
                </div>
                <div className="border border-dashed bg-slate-50 rounded-lg p-3 text-xs min-h-[150px]">
                    {activityPaginated.length === 0 ? <div className="text-muted-foreground text-center mt-12">Waiting for RFID scan...</div> : 
                        activityPaginated.map((a: ActivityRow) => (
                            <div key={a.id} className="flex justify-between items-center bg-white border shadow-sm p-2 mb-2 rounded last:mb-0">
                                <div className="flex flex-col">
                                    <span className="truncate font-semibold max-w-[200px]">{a.productName}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{a.rfid}</span>
                                </div>
                                <Badge variant="outline" className={a.status === "ok" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                                    {a.status.toUpperCase()}
                                </Badge>
                            </div>
                        ))
                    }
                </div>
            </Card>

            <div className="flex justify-end pt-4">
                <Button 
                    className="h-12 w-full md:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 font-bold" 
                    onClick={() => setActiveProductId(null)}
                >
                    Done Tagging This Product
                </Button>
            </div>
        </div>
    );
}

