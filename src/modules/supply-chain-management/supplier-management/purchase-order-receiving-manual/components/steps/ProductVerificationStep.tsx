"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useReceivingProductsManual } from "../../providers/ReceivingProductsManualProvider";
import { AddExtraProductModal } from "../AddExtraProductModal";
import { cn } from "@/lib/utils";

export function ProductVerificationStep({ onContinue }: { onContinue: () => void }) {
    const {
        selectedPO,
        verifiedProductIds,
        toggleProductVerification,
        removeExtraProductLocally
    } = useReceivingProductsManual();

    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

    const allItems = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        return allocs.flatMap((a) => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items.map((it) => ({
                ...it,
                id: String(it.id),
                branchName: a?.branch?.name ?? "Unassigned",
            }));
        });
    }, [selectedPO]);

    const canContinue = verifiedProductIds.length > 0;

    return (
        <div className="space-y-4">
            <AddExtraProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            
            <Card className="p-4 border-primary shadow-sm bg-primary/5">
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className="text-center space-y-1">
                        <div className="text-xl font-black uppercase tracking-wide text-primary">
                            Step 2: Product Checklist
                        </div>
                        <div className="text-sm text-foreground max-w-[500px]">
                            Check the products you are receiving for this PO. You can also add extra items not listed in the original order.
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-4 overflow-hidden shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <div className="text-base font-semibold text-primary uppercase tracking-wider">Expected Products Checklist</div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase tracking-widest gap-1.5 border-primary/20 hover:border-primary hover:bg-primary/5"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <Plus className="h-3 w-3" /> Add Extra Product
                        </Button>
                        <Badge variant="secondary" className="font-bold">
                            Selected: {verifiedProductIds.length} / {allItems.length}
                        </Badge>
                    </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider">Product / SKU</TableHead>
                                <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center w-32">Ordered Qty</TableHead>
                                <TableHead className="text-[10px] h-9 font-black uppercase tracking-wider text-center w-40">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">
                                        No items in this Purchase Order. Click "Add Extra Product" to begin.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                allItems.map((item) => {
                                    const isVerified = verifiedProductIds.includes(item.productId);
                                    return (
                                        <TableRow key={item.id} className={cn(isVerified && "bg-green-50/30")}>
                                            <TableCell className="align-middle py-3">
                                                <div className="flex flex-col">
                                                    <div className="font-bold text-sm leading-none flex items-center gap-2">
                                                        {item.name}
                                                        {item.isExtra && <Badge variant="outline" className="text-[8px] bg-amber-50 text-amber-700 border-amber-200 uppercase font-black px-1.5 h-4">Extra</Badge>}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-muted-foreground mt-1">SKU: {item.barcode}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center align-middle font-bold text-sm">
                                                {item.expectedQty}
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

                <div className="mt-8 flex justify-end">
                    <Button
                        className="h-10 px-8 text-sm font-black uppercase tracking-widest gap-2"
                        onClick={onContinue}
                        disabled={!canContinue}
                    >
                        Continue to Quantities
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}
