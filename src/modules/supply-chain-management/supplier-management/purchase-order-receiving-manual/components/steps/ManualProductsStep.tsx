"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useReceivingProductsManual } from "../../providers/ReceivingProductsManualProvider";
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
import { AlertTriangle } from "lucide-react";

export function ManualProductsStep({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
    const {
        selectedPO,
        manualCounts,
        setManualCounts,
        verifiedProductIds,
    } = useReceivingProductsManual();

    // ✅ Pagination state
    const [receivingPage, setReceivingPage] = React.useState(1);
    const ITEMS_PER_PAGE = 10;

    // ✅ Verification Modal state
    const [isOverReceivingModalOpen, setIsOverReceivingModalOpen] = React.useState(false);

    // ✅ Show only verified items
    const filteredItems = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const flattened = allocs.flatMap((a) => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items.map((it) => ({
                ...it,
                id: String(it.id),
                branchName: a?.branch?.name ?? "Unassigned",
            }));
        });
        
        return flattened.filter(it => verifiedProductIds.includes(it.productId));
    }, [selectedPO, verifiedProductIds]);

    const totalEntered = React.useMemo(() => {
        return Object.values(manualCounts).reduce((a, b) => a + (Number(b) || 0), 0);
    }, [manualCounts]);

    const handleCountChange = (id: string, val: string) => {
        const parsed = parseInt(val, 10);
        let validVal = isNaN(parsed) ? 0 : parsed;
        if (validVal < 0) validVal = 0;

        setManualCounts(prev => ({ ...prev, [id]: validVal }));
    };

    const isOverReceiving = React.useMemo(() => {
        return filteredItems.some(it => {
            const id = String(it.id);
            const expected = Number(it.expectedQty || 0);
            const receivedAtStart = Number(it.receivedQty || 0); // Quantity already received in previous saved receipts
            const currentEntry = Number(manualCounts[id] || 0);
            return (currentEntry + receivedAtStart) > expected && currentEntry > 0;
        });
    }, [filteredItems, manualCounts]);

    const handleContinueClick = () => {
        if (isOverReceiving) {
            setIsOverReceivingModalOpen(true);
        } else {
            onContinue();
        }
    };

    return (
        <div className="space-y-4">
            <Card className="p-4 border-primary shadow-sm bg-primary/5">
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="text-center space-y-1">
                        <div className="text-xl font-black uppercase tracking-wide text-primary">
                            Step 3: Manual Quantity Entry
                        </div>
                        <div className="text-sm text-foreground max-w-[450px]">
                            Enter the physical quantity received for each verified product below.
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-4 overflow-hidden shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-base font-semibold text-primary uppercase tracking-wider">Verified Items List</div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono bg-background shadow-xs">
                            Items: {filteredItems.length} / Entered: {totalEntered}
                        </Badge>
                    </div>
                </div>

                {(() => {
                    const rcvTotalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
                    const rcvStart = (receivingPage - 1) * ITEMS_PER_PAGE;
                    const rcvPageItems = filteredItems.slice(rcvStart, rcvStart + ITEMS_PER_PAGE);

                    return (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm border-b">
                                        <TableRow>
                                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider bg-muted/50 text-left">Product / SKU</TableHead>
                                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center bg-muted/50 w-24">Ordered</TableHead>
                                            <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center bg-muted/50 w-24 text-primary">Receive Qty</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rcvPageItems.map((it) => {
                                            const itemObj = it as Record<string, unknown>;
                                            const id = String(itemObj.id);
                                            const expected = Number(itemObj.expectedQty || 0);
                                            const receivedAtStart = Number(itemObj.receivedQty || 0);
                                            const currentEntry = manualCounts[id] || "";
                                            const currentEntryNum = Number(currentEntry || 0);
                                            
                                            // Validate Over Receiving
                                            const isOver = (currentEntryNum + receivedAtStart) > expected && currentEntryNum > 0;

                                            return (
                                                <TableRow key={id} className={isOver ? "bg-red-50/50" : ""}>
                                                    <TableCell className="max-w-[300px] overflow-hidden align-middle">
                                                        <div className="truncate text-sm font-bold text-foreground" title={it.name}>
                                                            {it.name}
                                                            {it.isExtra && <Badge className="ml-2 text-[8px] bg-amber-50 text-amber-600 border-amber-200 uppercase font-black px-1.5 h-4">Extra</Badge>}
                                                        </div>
                                                        <div className="truncate text-[10px] text-muted-foreground font-mono" title={`SKU: ${it.barcode}`}>SKU: {it.barcode}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center align-middle">
                                                        <div className="font-bold text-sm">
                                                            {expected}
                                                            {receivedAtStart > 0 && (
                                                                <div className="text-[10px] font-normal text-muted-foreground whitespace-nowrap">
                                                                    (Prev rec: {receivedAtStart})
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-middle">
                                                        <div className="relative flex flex-col items-center">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                placeholder="0"
                                                                value={currentEntry}
                                                                onChange={(e) => handleCountChange(id, e.target.value)}
                                                                className={`h-9 w-full text-center font-black text-sm border-2 focus-visible:ring-0 shadow-none transition-colors ${
                                                                    isOver 
                                                                    ? "border-red-500 text-red-700 bg-red-50 focus-visible:border-red-600 focus-visible:ring-red-100" 
                                                                    : "focus-visible:border-primary"
                                                                }`}
                                                            />
                                                            {isOver && (
                                                                <div className="absolute -bottom-4 text-[9px] font-bold text-red-600 flex items-center whitespace-nowrap">
                                                                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5 inline" /> Over Receiving
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {rcvPageItems.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">
                                                    No verified items found. Go back and check items from the PO first.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {filteredItems.length > ITEMS_PER_PAGE && (
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

                <div className="mt-6 flex justify-between pt-2">
                    <Button variant="ghost" onClick={onBack}>← Back to Checklist</Button>
                    <Button
                        className="h-10 px-6 text-sm font-black uppercase tracking-widest"
                        onClick={handleContinueClick}
                        disabled={totalEntered <= 0}
                        type="button"
                    >
                        Continue to Review
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
                        <AlertDialogAction onClick={() => { setIsOverReceivingModalOpen(false); onContinue(); }} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                            Yes, Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
