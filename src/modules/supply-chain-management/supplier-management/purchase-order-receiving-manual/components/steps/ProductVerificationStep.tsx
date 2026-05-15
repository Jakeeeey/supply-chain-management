"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Plus, Trash2, Search, AlertTriangle } from "lucide-react";
import { useReceivingProductsManual } from "../../providers/ReceivingProductsManualProvider";
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

export function ProductVerificationStep({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
    const {
        selectedPO,
        verifiedProductIds,
        toggleProductVerification,
        removeExtraProductLocally,
        manualCounts,
        setManualCounts,
        editingReceiptId
    } = useReceivingProductsManual();

    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const flattenedAllItems = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const all = allocs.flatMap((a) => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items.map((it) => ({
                ...it,
                id: String(it.id),
                branchName: a?.branch?.name ?? "Unassigned",
            }));
        }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        // ✅ Filter based on New vs Edit mode
        return all.filter(item => {
            const ordered = Number(item.originalOrderedQty ?? item.expectedQty ?? 0);
            const posted = Number(item.postedQty ?? 0);
            const unposted = Number(item.unpostedQty ?? 0);
            const trueRemaining = Math.max(0, ordered - posted - unposted);

            if (editingReceiptId) {
                // Edit mode: show items IN this receipt + items with remaining balance
                const inThisReceipt = (item.unpostedReceipts || []).some(
                    r => r.receiptNo === editingReceiptId
                );
                const isNewOrInThisReceipt = item.isExtra && (!(item.unpostedReceipts && item.unpostedReceipts.length > 0) || inThisReceipt);
                return inThisReceipt || trueRemaining > 0 || isNewOrInThisReceipt;
            } else {
                // New receipt mode: only show items with a true remaining balance or newly added extras
                const isNewlyAddedExtra = item.isExtra && !(item.unpostedReceipts && item.unpostedReceipts.length > 0);
                return trueRemaining > 0 || isNewlyAddedExtra;
            }
        });
    }, [selectedPO, editingReceiptId]);

    const allItems = React.useMemo(() => {
        if (!searchQuery.trim()) return flattenedAllItems;

        const query = searchQuery.toLowerCase().trim();
        return flattenedAllItems.filter(item => 
            (item.name || "").toLowerCase().includes(query) || 
            (item.barcode || "").toLowerCase().includes(query)
        );
    }, [flattenedAllItems, searchQuery]);

    const [isOverReceivingModalOpen, setIsOverReceivingModalOpen] = React.useState(false);

    const allVerifiedHaveQuantity = React.useMemo(() => {
        // ✅ Only validate products that are actually visible in the current list
        const visibleVerifiedProductIds = verifiedProductIds.filter(pid => 
            flattenedAllItems.some(it => it.productId === pid)
        );

        if (visibleVerifiedProductIds.length === 0) return false;

        return visibleVerifiedProductIds.every(pid => {
            const items = flattenedAllItems.filter(it => it.productId === pid);
            const totalForProduct = items.reduce((s, it) => s + (manualCounts[String(it.id)] || 0), 0);
            return totalForProduct > 0;
        });
    }, [verifiedProductIds, manualCounts, flattenedAllItems]);

    const visibleVerifiedCount = React.useMemo(() => {
        return verifiedProductIds.filter(pid => 
            flattenedAllItems.some(it => it.productId === pid)
        ).length;
    }, [verifiedProductIds, flattenedAllItems]);

    const canContinue = visibleVerifiedCount > 0 && allVerifiedHaveQuantity;

    const handleCountChange = (id: string, val: string) => {
        const parsed = parseInt(val, 10);
        let validVal = isNaN(parsed) ? 0 : parsed;
        if (validVal < 0) validVal = 0;
        setManualCounts(prev => ({ ...prev, [id]: validVal }));
    };

    const isOverReceiving = React.useMemo(() => {
        return flattenedAllItems.some(it => {
            const id = String(it.id);
            const ordered = Number(it.originalOrderedQty ?? it.expectedQty ?? 0);
            const posted = Number(it.postedQty ?? 0);
            const currentEntry = Number(manualCounts[id] || 0);
            // Over-receiving: current entry alone exceeds what's left after posted
            return verifiedProductIds.includes(it.productId) && (currentEntry + posted) > ordered && currentEntry > 0;
        });
    }, [flattenedAllItems, manualCounts, verifiedProductIds]);

    const handleContinueClick = () => {
        if (isOverReceiving) {
            setIsOverReceivingModalOpen(true);
        } else {
            onContinue();
        }
    };

    return (
        <div className="space-y-4">
            <AddExtraProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            
            <Card className="p-4 border-primary shadow-sm bg-primary/5">
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="text-center space-y-1">
                        <div className="text-xl font-black uppercase tracking-wide text-primary">
                            Step 2: Product Verification & Quantities
                        </div>
                        <div className="text-sm text-foreground max-w-[500px]">
                            Verify the products and enter the physical quantity received for this PO below.
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-4 overflow-hidden shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-base font-semibold text-primary uppercase tracking-wider">Expected Products Checklist</div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search product or SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-9 text-[11px] font-medium border-primary/20 focus-visible:ring-primary/20 focus-visible:border-primary"
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 border-primary/20 hover:border-primary hover:bg-primary/5"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <Plus className="h-3 w-3" /> Add Extra Product
                        </Button>
                        <Badge variant="secondary" className="font-bold">
                            Selected: {visibleVerifiedCount} / {allItems.length}
                        </Badge>
                    </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider">Product / SKU</TableHead>
                                <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center w-28">Remaining Qty</TableHead>
                                <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center w-28 text-primary">Receive Qty</TableHead>
                                <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center w-36">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">
                                        No items in this Purchase Order. Click &quot;Add Extra Product&quot; to begin.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                allItems.map((item) => {
                                    const id = String(item.id);
                                    const isVerified = verifiedProductIds.includes(item.productId);
                                    const ordered = Number(item.originalOrderedQty ?? item.expectedQty ?? 0);
                                    const posted = Number(item.postedQty ?? 0);
                                    const unposted = Number(item.unpostedQty ?? 0);
                                    const currentEntry = manualCounts[id] || 0;
                                    const remaining = Math.max(0, ordered - posted - unposted);
                                    const isOver = isVerified && (currentEntry + posted) > ordered && currentEntry > 0;

                                    return (
                                        <TableRow key={item.id} className={cn(isVerified && "bg-green-50/30", isOver && "bg-red-50/50")}>
                                            <TableCell className="align-middle py-3">
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-sm leading-none flex items-center gap-2">
                                                        {item.name}
                                                        {item.isExtra && <Badge variant="outline" className="text-[8px] bg-amber-50 text-amber-600 border-amber-200 uppercase font-black px-1.5 h-4">Extra</Badge>}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-muted-foreground mt-1">SKU: {item.barcode}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle font-bold text-sm">
                                                {remaining}
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                {isVerified ? (
                                                    <div className="relative flex flex-col items-center">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            placeholder="0"
                                                            value={currentEntry === 0 ? "" : currentEntry}
                                                            onChange={(e) => handleCountChange(id, e.target.value)}
                                                            className={cn(
                                                                "h-8 w-full text-center font-black text-sm border-2 focus-visible:ring-0 shadow-none transition-colors",
                                                                isOver 
                                                                ? "border-red-500 text-red-700 bg-red-50 focus-visible:border-red-600 focus-visible:ring-red-100" 
                                                                : isVerified && currentEntry === 0
                                                                ? "border-amber-400 bg-amber-50 focus-visible:border-amber-500"
                                                                : "border-primary/30 focus-visible:border-primary"
                                                            )}
                                                        />
                                                        {isOver && (
                                                            <div className="absolute -bottom-3.5 text-[8px] font-bold text-red-600 flex items-center whitespace-nowrap">
                                                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5 inline" /> Over Receiving
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-muted-foreground italic text-[10px]">Verify first</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center align-middle py-2">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={isVerified ? "default" : "outline"}
                                                        className={cn(
                                                            "h-8 text-[10px] font-black uppercase tracking-widest px-4 transition-all",
                                                            isVerified ? "bg-green-600 hover:bg-green-700 border-green-600" : "hover:border-primary hover:bg-primary/5"
                                                        )}
                                                        onClick={() => toggleProductVerification(item.productId)}
                                                    >
                                                        {isVerified ? (
                                                            <>
                                                                <CheckCircle2 className="h-3 w-3 mr-1.5" /> Checked
                                                            </>
                                                        ) : (
                                                            "Check Item"
                                                        )}
                                                    </Button>
                                                    
                                                    {item.isExtra && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => removeExtraProductLocally(item.productId)}
                                                            title="Delete extra product"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        className="h-10 px-6 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                        onClick={onBack}
                    >
                        ← Back
                    </Button>
                    <Button
                        className="h-10 px-8 text-sm font-black uppercase tracking-widest gap-2"
                        onClick={handleContinueClick}
                        disabled={!canContinue}
                    >
                        Continue to Review
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </Card>

            {/* ✅ Verify Over Receiving Modal */}
            <AlertDialog open={isOverReceivingModalOpen} onOpenChange={setIsOverReceivingModalOpen}>
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
                        <AlertDialogAction onClick={() => { setIsOverReceivingModalOpen(false); onContinue(); }} className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white border-0">
                            Yes, Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
