"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Plus, X, Pencil } from "lucide-react";
import { useReceivingProducts, ReceivingPOItem, ActivityRow } from "../../providers/ReceivingProductsProvider";
import { useKeyboardScanner } from "../../hooks/useKeyboardScanner";
import { toast } from "sonner";
import { AddExtraProductModal } from "../AddExtraProductModal";
import { cn } from "@/lib/utils";
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

export function TagRFIDStep() {
    const {
        selectedPO,
        setRfid,
        scanRFID,
        scanError,
        activity,
        verifiedPorIds,
        toggleProductVerification,
        scannedCountByPorId,
        activeProductId,
        setActiveProductId,
        activePorId,
        setActivePorId,
        removeActivity,
        editingReceiptId,
        clearEditingReceiptId,
        removeExtraProductLocally,
        loadReceipt,
        saveRFIDTagging,
    } = useReceivingProducts();

    const [activityPage, setActivityPage] = React.useState(1);
    const [isOverReceiveModalOpen, setIsOverReceiveModalOpen] = React.useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const ITEMS_PER_PAGE = 5;

    // Auto-scan RFID
    const handleAutoScan = React.useCallback((scannedValue: string) => {
        if (activeProductId) {
            const extractHexCharacters = (value: string): string => {
                return value.toUpperCase().replace(/[^0-9A-F]/g, "");
            };

            const finalizeHexTag = (rawValue: string): string => {
                const hex = extractHexCharacters(rawValue);
                if (hex.length < 24) return "";
                if (hex.length === 24) return hex;
                return hex.slice(-24);
            };

            const normalized = finalizeHexTag(scannedValue);
            if (!normalized || normalized.length !== 24) {
                toast.error("Incomplete Scan", {
                    description: `RFID value was cutoff or incomplete (${scannedValue}). Must be exactly 24 hex characters.`,
                });
                return;
            }
            scanRFID(normalized);
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

    // Construct all products in PO allocations (excluding expectedQty <= 0)
    const allItems = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        return allocs.flatMap((a) => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items
                .map((it) => ({
                    ...it,
                    porId: String(it.porId || it.id),
                    branchName: a?.branch?.name ?? "Unassigned",
                }))
                .filter((it) => Number(it.expectedQty || 0) > 0 || it.isExtra)
                .filter((it) => it.isExtra || (Number(it.taggedQty || 0) < Number(it.expectedQty)));
        });
    }, [selectedPO]);

    const safeCounts: Record<string, number> = React.useMemo(() =>
        scannedCountByPorId && typeof scannedCountByPorId === "object" ? scannedCountByPorId : {}, [scannedCountByPorId]);

    // Apply Reverted Edit Boundaries: Keep all items visible to allow tag reviews/modification
    const visibleItems = React.useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return allItems;
        return allItems.filter(
            (p) =>
                String(p.name || "").toLowerCase().includes(query) ||
                String(p.barcode || "").toLowerCase().includes(query)
        );
    }, [allItems, searchQuery]);

    // Derived active products (matching filtered list)
    const activeProducts = React.useMemo(() => {
        return visibleItems;
    }, [visibleItems]);

    // Check if any product is over-received
    const overReceivedProducts = React.useMemo(() => {
        return allItems.filter(p => {
            const expected = Number(p.expectedQty || 0);
            if (expected <= 0) return false; // Extra products don't count
            const scanned = safeCounts[p.porId] || 0;
            return scanned > expected;
        });
    }, [allItems, safeCounts]);

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
        return allItems.find((p) => p.porId === activePorId);
    }, [activePorId, allItems]);

    // ========== NO PRODUCT SELECTED: Product List View ==========
    if (!activeProductId) {
        return (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <AddExtraProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

                {editingReceiptId && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-3 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            Editing Reverted Receipt: {editingReceiptId}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearEditingReceiptId}
                            className="h-7 text-xs font-black uppercase text-amber-700 hover:text-amber-800 hover:bg-amber-500/10 gap-1.5"
                        >
                            <X className="h-3.5 w-3.5" /> Cancel Edit
                        </Button>
                    </div>
                )}

                {/* ✅ Previous Receipts History */}
                {selectedPO?.history && selectedPO.history.length > 0 && (
                    <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Previous Receipts History
                        </div>
                        <div className="mt-3 space-y-2">
                            {selectedPO.history.map((h: { receiptNo: string; receiptDate?: string; itemsCount?: number; [key: string]: unknown }) => (
                                <div
                                    key={h.receiptNo}
                                    className="flex items-center justify-between gap-3 text-xs border-b border-amber-500/10 pb-2 last:border-0 last:pb-0"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-mono font-medium text-amber-900 dark:text-amber-100">
                                            {h.receiptNo}
                                        </span>
                                        <span className="text-[10px] text-amber-700/70 dark:text-amber-400/60 font-mono mt-0.5">
                                            {h.receiptDate ? h.receiptDate.split("T")[0] : "—"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">
                                            {h.itemsCount} {h.itemsCount === 1 ? "item" : "items"}
                                        </span>
                                        {h.isReverted ? (
                                            <>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] uppercase h-4 px-1 leading-none border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                                >
                                                    Reverted
                                                </Badge>
                                                {editingReceiptId !== h.receiptNo && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 px-1.5 text-[10px] text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 gap-1"
                                                        onClick={() => loadReceipt(h.receiptNo)}
                                                        disabled={!!editingReceiptId}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                        Edit
                                                    </Button>
                                                )}
                                            </>
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] uppercase h-4 px-1 leading-none font-bold",
                                                    h.isPosted 
                                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" 
                                                        : "bg-muted text-muted-foreground border-border"
                                                )}
                                            >
                                                {h.isPosted ? "Posted" : "Unposted"}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                <Card className="p-4 border-primary/30 shadow-sm bg-primary/5">
                    <div className="flex flex-col items-center justify-center py-4 gap-2">
                        <div className="text-center space-y-1">
                            <div className="text-xl font-black uppercase tracking-wide text-primary">
                                Step 2: RFID Tagging
                            </div>
                            <div className="text-sm text-foreground max-w-[500px]">
                                Select a product below and begin scanning RFID tags. Only one product can be tagged at a time.
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-0 border overflow-hidden shadow-sm">
                    <div className="bg-muted/50 p-4 border-b space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <div className="font-semibold text-sm">Select a Product to Tag</div>
                                <div className="text-xs text-muted-foreground">Select an incomplete product below to begin scanning.</div>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 border-primary/20 hover:border-primary hover:bg-primary/5 shadow-none"
                                onClick={() => setIsAddModalOpen(true)}
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Extra Product
                            </Button>
                        </div>
                        <div>
                            <Input
                                placeholder="Search product name or SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 text-xs bg-background"
                            />
                        </div>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Product / SKU</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground text-center text-xs uppercase tracking-wider w-36">Scanned / Required</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground text-right text-xs uppercase tracking-wider w-32">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">
                                            {editingReceiptId 
                                                ? "All items already have RFID tags in this receipt."
                                                : "No items to tag. Click 'Add Extra Product' to get started."
                                            }
                                        </td>
                                    </tr>
                                ) : (
                                    activeProducts.map((p) => {
                                        const expected = Number(p.expectedQty || 0);
                                        const target = expected > 0 ? expected : 1;
                                        const scanned = safeCounts[p.porId] || 0;
                                        const isDone = scanned >= target;
                                        const isOver = expected > 0 && scanned > expected;

                                        return (
                                            <tr 
                                                key={p.porId} 
                                                className={cn(
                                                    "border-b last:border-0 hover:bg-muted/30 transition-colors",
                                                    isOver && "bg-destructive/10"
                                                )}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-foreground flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm">{p.name}</span>
                                                            {p.isExtra && <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 uppercase font-black px-1.5 h-4">Extra</Badge>}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5">SKU: {p.barcode}</span>
                                                        {isOver && (
                                                            <span className="text-[9px] font-black text-destructive flex items-center gap-0.5 mt-1 uppercase tracking-wider">
                                                                <AlertTriangle className="w-3 h-3 text-destructive" /> Over Receiving
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge 
                                                        variant={isDone ? "default" : "outline"} 
                                                        className={cn(
                                                            "font-black text-xs px-2.5 py-0.5",
                                                            isDone 
                                                                ? (isOver ? "bg-destructive hover:bg-destructive/90" : "bg-emerald-600 hover:bg-emerald-700") 
                                                                : "border-border"
                                                        )}
                                                    >
                                                        {scanned} / {target}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant={isDone ? "secondary" : "default"}
                                                            className={cn(
                                                                "h-8 text-[10px] font-black uppercase tracking-widest px-4",
                                                                !isDone ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted border border-border"
                                                            )}
                                                            onClick={() => {
                                                                setActiveProductId(p.productId);
                                                                setActivePorId(p.porId);
                                                                if (!verifiedPorIds.includes(p.porId)) {
                                                                    toggleProductVerification(p.porId);
                                                                }
                                                            }}
                                                        >
                                                            {isDone ? "Review Tags" : "Tag Item"}
                                                        </Button>
                                                        {p.isExtra && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                                onClick={() => {
                                                                    if (activePorId === p.porId) {
                                                                        setActiveProductId(null);
                                                                        setActivePorId(null);
                                                                    }
                                                                    removeExtraProductLocally(p.porId);
                                                                }}
                                                                title="Delete extra product"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
                
                <div className="flex justify-end pt-4">
                    <Button 
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase text-xs tracking-wider h-11 px-8 shadow-md"
                        onClick={saveRFIDTagging}
                    >
                        Save RFID Tagging
                    </Button>
                </div>

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

            <Card className={cn(
                "p-4 border-2 mb-4",
                activeIsOver 
                    ? "border-destructive/30 bg-destructive/10 text-destructive" 
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}>
                <div className="flex flex-col items-center justify-center py-6 gap-4">
                    <div className="relative">
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center",
                            activeIsOver ? "bg-destructive/10" : "bg-emerald-500/10"
                        )}>
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                activeIsOver ? "bg-destructive/20" : "bg-emerald-500/20"
                            )}>
                                <div className={cn(
                                    "w-5 h-5 rounded-full shadow-lg",
                                    activeIsOver 
                                        ? "bg-destructive shadow-destructive/50" 
                                        : 'bg-emerald-500 shadow-emerald-500/50'
                                )} />
                            </div>
                        </div>
                        {!activeDone && !activeIsOver && (
                            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" style={{ animationDuration: "2s" }} />
                        )}
                    </div>
                    <div className="text-center space-y-1">
                        <div className={cn(
                            "text-lg font-black uppercase tracking-wide",
                            activeIsOver ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                            Now Tagging: {activeItem?.name}
                        </div>
                        <div className="text-sm font-medium text-foreground bg-card px-3 py-1 rounded shadow-sm inline-block border">
                            Scanned: <span className={activeDone ? (activeIsOver ? "text-destructive font-bold" : "text-emerald-600 font-bold") : "font-bold"}>{activeScanned}</span> of {activeTarget}
                        </div>
                    </div>
                </div>

                {scanError && (
                    <div className="text-xs text-destructive animate-in fade-in duration-200 p-3 bg-destructive/15 rounded-lg border border-destructive/20 text-center mb-4 font-bold uppercase">
                        {scanError}
                    </div>
                )}
            </Card>

            <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Activity Log for {activeItem?.name}</div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-6 w-6 font-black" disabled={activityPage <= 1} onClick={() => setActivityPage(x => x - 1)}>
                            &lt;
                        </Button>
                        <Button variant="outline" size="icon" className="h-6 w-6 font-black" disabled={activityPage >= totalActivityPages} onClick={() => setActivityPage(x => x + 1)}>
                            &gt;
                        </Button>
                    </div>
                </div>
                <div className="border border-dashed bg-muted/30 rounded-lg p-3 text-xs min-h-[150px]">
                    {activityPaginated.length === 0 ? <div className="text-muted-foreground text-center mt-12">Waiting for RFID scan...</div> : 
                        activityPaginated.map((a: ActivityRow) => (
                            <div key={a.id} className="flex justify-between items-center bg-card border shadow-sm p-2 mb-2 rounded last:mb-0">
                                <div className="flex flex-col">
                                    <span className="truncate font-semibold max-w-[200px]">{a.productName}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{a.rfid}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={a.status === "ok" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : "bg-amber-500/15 text-amber-600 border-amber-500/20"}>
                                        {a.status.toUpperCase()}
                                    </Badge>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeActivity(a.id)}
                                        title="Remove scanned tag"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </Card>

            <div className="flex justify-end pt-4">
                <Button 
                    className="h-12 w-full md:w-auto px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase text-xs tracking-wider" 
                    onClick={() => { setActiveProductId(null); setActivePorId(null); }}
                >
                    Done Tagging This Product
                </Button>
            </div>
        </div>
    );
}
