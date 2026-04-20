"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, PackageSearch, X, PlusCircle } from "lucide-react";
import { useReceivingProducts } from "../providers/ReceivingProductsProvider";
import { toast } from "sonner";

interface AddExtraProductModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddExtraProductModal({ isOpen, onClose }: AddExtraProductModalProps) {
    const { lookupProduct, addExtraProductLocally, selectedPO, markProductAsVerified } = useReceivingProducts();
    const [barcode, setBarcode] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [productDetail, setProductDetail] = React.useState<{ productId: string; name: string; barcode: string; unitPrice: number } | null>(null);
    const [selectedBranchId, setSelectedBranchId] = React.useState("");

    // Get unique branches from the current PO allocations
    const poBranches = React.useMemo(() => {
        if (!selectedPO?.allocations) return [];
        const uniqueBranches = new Map();
        selectedPO.allocations.forEach(a => {
            if (a.branch) {
                uniqueBranches.set(a.branch.id, a.branch);
            }
        });
        return Array.from(uniqueBranches.values());
    }, [selectedPO]);

    // Auto-select the first branch if there's only one
    React.useEffect(() => {
        if (poBranches.length === 1 && !selectedBranchId) {
            setSelectedBranchId(String(poBranches[0].id));
        }
    }, [poBranches, selectedBranchId, isOpen]);

    // Focus input when modal opens
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
        if (isOpen) {
            // small delay to let generic focus traps settle
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } else {
            setBarcode("");
            setProductDetail(null);
            setSelectedBranchId("");
        }
    }, [isOpen]);

    const handleLookup = async (e?: React.FormEvent) => {
        e?.preventDefault();
        
        const b = barcode.trim();
        if (!b) return;

        setIsLoading(true);
        setProductDetail(null);

        try {
            const result = await lookupProduct(b);
            if (result) {
                setProductDetail(result);
            } else {
                toast.error("Product not found with that barcode");
            }
        } catch (error) {
            toast.error("Lookup failed. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToList = () => {
        if (!productDetail) return;
        
        let targetBranch = poBranches.find(b => String(b.id) === selectedBranchId);
        if (!targetBranch && poBranches.length > 0) {
            toast.error("Please select a branch.");
            return;
        }

        // If no branches exist, use a default fallback
        if (!targetBranch) {
            targetBranch = { id: "0", name: "Unassigned" };
        }

        addExtraProductLocally({
            productId: productDetail.productId,
            name: productDetail.name,
            barcode: productDetail.barcode,
            unitPrice: productDetail.unitPrice,
            branchId: String(targetBranch.id),
            branchName: targetBranch.name
        });

        markProductAsVerified(productDetail.productId);

        toast.success(`Added ${productDetail.name} to the receiving list as an extra item.`);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackageSearch className="h-5 w-5 text-primary" />
                        Add Extra Product
                    </DialogTitle>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Scan or enter a product barcode to add it to this receiving session. This item was not originally part of the Purchase Order.
                    </p>

                    <form onSubmit={handleLookup} className="space-y-2">
                        <Label>Barcode / SKU</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    ref={inputRef}
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    placeholder="Scan barcode here"
                                    className="pl-9 font-mono"
                                    autoComplete="off"
                                    disabled={isLoading}
                                />
                                <Camera className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                            <Button type="submit" disabled={!barcode.trim() || isLoading}>
                                {isLoading ? "..." : "Lookup"}
                            </Button>
                        </div>
                    </form>

                    {productDetail && (
                        <div className="animate-in fade-in slide-in-from-top-2 p-3 mt-4 rounded-md border bg-muted/30 space-y-3">
                            <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase text-muted-foreground tracking-widest">Matched Product</div>
                                <div className="font-bold text-sm">{productDetail.name}</div>
                                <div className="text-xs font-mono text-muted-foreground">SKU: {productDetail.barcode}</div>
                            </div>
                            
                            {poBranches.length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t">
                                    <Label className="text-xs">Assign to Branch</Label>
                                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Select a branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {poBranches.map((b) => (
                                                <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                                                    {b.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between items-center sm:items-center">
                    <Button variant="ghost" className="text-xs text-muted-foreground" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button 
                        disabled={!productDetail} 
                        onClick={handleAddToList}
                        className="text-xs font-bold uppercase tracking-wider"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add to List
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
