"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { useReceivingProducts, ReceivingPOItem, ActivityRow } from "../../providers/ReceivingProductsProvider";
import { useKeyboardScanner } from "../../hooks/useKeyboardScanner";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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

export function TagRFIDStep({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
    const {
        selectedPO,
        setRfid,
        scanRFID,
        scanError,
        activity,
        verifiedPorIds,
        scannedCountByPorId,
        activeProductId,
        setActiveProductId,
        activePorId,
        setActivePorId,
        removeActivity,
    } = useReceivingProducts();

    const [activityPage, setActivityPage] = React.useState(1);
    const [isOverReceiveModalOpen, setIsOverReceiveModalOpen] = React.useState(false);
    const ITEMS_PER_PAGE = 5;

    // Auto-scan RFID
    const handleAutoScan = React.useCallback((scannedValue: string) => {
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

    // Derived active products (only the ones checked via Checklist)
    const activeProducts = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        return allocs.flatMap(a => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items
                .map((it) => ({
                    ...it,
                    porId: String(it.porId || it.id),
                }))
                .filter((it) => verifiedPorIds.includes(it.porId)) as Array<ReceivingPOItem & { porId: string }>;
        });
    }, [selectedPO, verifiedPorIds]);

    const safeCounts: Record<string, number> = React.useMemo(() =>
        scannedCountByPorId && typeof scannedCountByPorId === "object" ? scannedCountByPorId : {}, [scannedCountByPorId]);

    // Check if any product is over-received
    const overReceivedProducts = React.useMemo(() => {
        return activeProducts.filter(p => {
            const expected = Number(p.expectedQty || 0);
            if (expected <= 0) return false; // Extra products don't count
            const scanned = safeCounts[p.porId] || 0;
            return scanned > expected;
        });
    }, [activeProducts, safeCounts]);

    const hasOverReceiving = overReceivedProducts.length > 0;

    // Notify on over-receiving
    const prevOverCountRef = React.useRef(0);
    React.useEffect(() => {
        if (overReceivedProducts.length > prevOverCountRef.current) {
            toast.warning("Over-Receiving Detected", {
                description: `${overReceivedProducts[0]?.name} has more tags than ordered.`,
            });
        }
        prevOverCountRef.current = overReceivedProducts.length;
    }, [overReceivedProducts]);

    // Ensure all verified products have at least their expected quantity or 1 RFID scanned (if extra).
    const isTaggingComplete = React.useMemo(() => {
        if (activeProducts.length === 0) return false;
        for (const p of activeProducts) {
            const expected = Number(p.expectedQty || p.taggedQty || 0);
            const scannedCount = safeCounts[p.porId] || 0;
            const target = expected > 0 ? expected : 1;
            if (scannedCount < target) return false;
        }
        return true;
    }, [activeProducts, safeCounts]);

    const handleProceed = () => {
        if (hasOverReceiving) {
            setIsOverReceiveModalOpen(true);
            return;
        }
        onContinue();
    };

    const confirmOverReceive = () => {
        setIsOverReceiveModalOpen(false);
        onContinue();
    };

    // Pagination — filtered to current product
    const filteredActivity = React.useMemo(() => {
        if (!activePorId) return activity || [];
        return (activity || []).filter((a: ActivityRow) => a.porId === activePorId);
    }, [activity, activePorId]);

    const activityPaginated = React.useMemo(() => {
        const start = (activityPage - 1) * ITEMS_PER_PAGE;
        return filteredActivity.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredActivity, activityPage]);

    const totalActivityPages = Math.ceil(filteredActivity.length / ITEMS_PER_PAGE);

    const activeItem = React.useMemo(() => {
        if (!activePorId) return null;
        return activeProducts.find((p) => p.porId === activePorId);
    }, [activePorId, activeProducts]);

    // ========== NO PRODUCT SELECTED: Product List View ==========
    if (!activeProductId) {
        return (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Over-Receiving Banner */}
                {hasOverReceiving && (
                    <Card className="p-3 border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                <span className="text-amber-600 font-black text-lg">!</span>
                            </div>
                            <div>
                                <div className="text-sm font-black uppercase text-amber-700">Over-Receiving Mode Active</div>
                                <div className="text-xs text-amber-600">
                                    {overReceivedProducts.map(p => p.name).join(", ")} — scanned more than ordered quantity.
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                <Card className="p-4 border-primary shadow-sm bg-primary/5">
                    <div className="flex flex-col items-center justify-center py-4 gap-2">
                        <div className="text-center space-y-1">
                            <div className="text-xl font-black uppercase tracking-wide text-primary">
                                Step 3: RFID Tagging
                            </div>
                            <div className="text-sm text-foreground max-w-[500px]">
                                Select a product below and begin scanning RFID tags. Only one product can be tagged at a time.
                            </div>
                        </div>
                    </div>
                </Card>

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
                                    const isOver = expected > 0 && scanned > expected;

                                    return (
                                        <tr key={p.porId} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900 flex items-center gap-2">
                                                    {p.name}
                                                    {isOver && <Badge variant="outline" className="text-[8px] bg-amber-50 text-amber-700 border-amber-200 uppercase font-black px-1.5 h-4">Over</Badge>}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">{p.barcode}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant={isDone ? "default" : "outline"} className={isDone ? (isOver ? "bg-amber-600 font-bold" : "bg-green-600 font-bold") : "font-bold"}>
                                                    {scanned} / {target}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button 
                                                    size="sm" 
                                                    variant={isDone ? "secondary" : "default"}
                                                    className={!isDone ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                                    onClick={() => {
                                                        setActiveProductId(p.productId);
                                                        setActivePorId(p.porId);
                                                    }}
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

                <div className="flex justify-between pt-4">
                    <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
                        ← Back to Checklist
                    </Button>
                    <Button 
                        className="h-12 w-full md:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 font-bold uppercase" 
                        onClick={handleProceed}
                        disabled={!isTaggingComplete}
                    >
                        {isTaggingComplete ? "Proceed to Final Review" : "Finish Scanning Required RFIDs"}
                    </Button>
                </div>

                {/* ✅ Over-Receiving Verification Modal (matches Manual Receiving) */}
                <AlertDialog open={isOverReceiveModalOpen} onOpenChange={setIsOverReceiveModalOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="h-5 w-5" />
                                Over-Receiving Detected
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                One or more items exceed the expected ordered quantity.
                                <br /><br />
                                Are you sure you want to continue to the review step? The system will still allow you to save this, but it will be recorded as over-receiving.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Review Quantities</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmOverReceive} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                                Yes, Continue
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    // ========== ACTIVE PRODUCT: Tagging View ==========
    const activeExpected = Number((activeItem as ReceivingPOItem)?.expectedQty || 0);
    const activeTarget = activeExpected > 0 ? activeExpected : 1;
    const activeScanned = safeCounts[String((activeItem as ReceivingPOItem)?.porId || "")] || 0;
    const activeDone = activeScanned >= activeTarget;
    const activeIsOver = activeExpected > 0 && activeScanned > activeExpected;

    return (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={() => { setActiveProductId(null); setActivePorId(null); }} className="text-muted-foreground hover:text-foreground">
                    ← Back to Product List
                </Button>
            </div>

            {/* Over-Receiving Banner for Active Item */}
            {activeIsOver && (
                <Card className="p-3 border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                            <span className="text-amber-600 font-black text-sm">!</span>
                        </div>
                        <div>
                            <div className="text-xs font-black uppercase text-amber-700">Over-Receiving Mode</div>
                            <div className="text-xs text-amber-600">
                                Scanned {activeScanned} tags for {activeExpected} ordered. Extra tags will be recorded.
                            </div>
                        </div>
                    </div>
                </Card>
            )}

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
                            Scanned: <span className={activeDone ? (activeIsOver ? "text-amber-600 font-bold" : "text-green-600 font-bold") : "font-bold"}>{activeScanned}</span> of {activeTarget}
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
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={a.status === "ok" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                                        {a.status.toUpperCase()}
                                    </Badge>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeActivity(a.id)}
                                        title="Remove scanned tag"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </Card>

            <div className="flex justify-end pt-4">
                <Button 
                    className="h-12 w-full md:w-auto px-8 bg-indigo-600 hover:bg-indigo-700 font-bold" 
                    onClick={() => { setActiveProductId(null); setActivePorId(null); }}
                >
                    Done Tagging This Product
                </Button>
            </div>
        </div>
    );
}
