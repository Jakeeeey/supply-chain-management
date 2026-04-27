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
import { PackageSearch, PlusCircle, Search } from "lucide-react";
import { useReceivingProductsManual } from "../providers/ReceivingProductsManualProvider";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AddExtraProductModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SupplierProduct = { productId: string; name: string; sku: string; barcode: string; unitPrice: number; uom: string; };

export function AddExtraProductModal({ isOpen, onClose }: AddExtraProductModalProps) {
    const { getSupplierProducts, addExtraProductLocally, selectedPO } = useReceivingProductsManual();
    
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [products, setProducts] = React.useState<SupplierProduct[]>([]);
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
        if (poBranches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(String(poBranches[0].id));
        }
    }, [poBranches, selectedBranchId]);

    // Fetch products when modal opens
    React.useEffect(() => {
        if (isOpen && selectedPO?.supplier?.id) {
            setIsLoading(true);
            getSupplierProducts(selectedPO.supplier.id)
                .then(data => {
                    setProducts(data);
                })
                .catch(() => toast.error("Failed to load products"))
                .finally(() => setIsLoading(false));
        } else if (!isOpen) {
            setSearchQuery("");
            setProducts([]);
        }
    }, [isOpen, selectedPO?.supplier?.id, getSupplierProducts]);

    const filteredProducts = React.useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.sku.toLowerCase().includes(q) || 
            p.barcode.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    const handleAddToList = (product: SupplierProduct) => {
        let targetBranch = poBranches.find(b => String(b.id) === selectedBranchId);
        if (!targetBranch && poBranches.length > 0) {
            toast.error("Please select a branch.");
            return;
        }

        // If no branches exist, use a default fallback
        if (!targetBranch) {
            targetBranch = { id: "0", name: "Unassigned" };
        }

        const added = addExtraProductLocally({
            productId: product.productId,
            name: product.name,
            barcode: product.sku || product.barcode,
            unitPrice: product.unitPrice,
            branchId: String(targetBranch.id),
            branchName: targetBranch.name
        });

        if (added) {
            toast.success(`Success! Added ${product.name} to the list.`);
        } else {
            toast.warning(`Notice: ${product.name} is already in the receiving session.`);
        }
    };

    const isAlreadyAdded = (productId: string) => {
        if (!selectedPO?.allocations) return false;
        return selectedPO.allocations.some(a => 
            a.items.some((i: any) => i.productId === productId)
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 py-4 border-b bg-muted/10 shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <PackageSearch className="h-5 w-5 text-primary" />
                        Add Extra Product from Supplier
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Select an extra product from {selectedPO?.supplier?.name ?? "this supplier"} to add to the receiving list.
                    </p>
                </DialogHeader>

                <div className="flex flex-col gap-4 p-6 overflow-hidden min-h-0 bg-muted/5">
                    <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                        <div className="flex-1 space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Search Products</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, SKU or barcode..."
                                    className="pl-9 h-10 shadow-sm"
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {poBranches.length > 0 && (
                            <div className="w-full sm:w-64 space-y-1.5 shrink-0">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Assign to Branch</Label>
                                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                                    <SelectTrigger className="h-10 shadow-sm">
                                        <SelectValue placeholder="Select a branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {poBranches.map((b) => (
                                            <SelectItem key={b.id} value={String(b.id)}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto rounded-md border bg-card shadow-sm px-1 py-1 custom-scrollbar min-h-[300px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8 text-muted-foreground h-full">
                                <div className="flex gap-2 items-center text-sm font-medium">
                                    <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                    Loading supplier products...
                                </div>
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
                                <PackageSearch className="w-12 h-12 mb-3 text-muted" />
                                <p className="font-semibold text-foreground">No products found</p>
                                <p className="text-sm">Try adjusting your search query.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                                {filteredProducts.map((p) => {
                                    const added = isAlreadyAdded(p.productId);
                                    return (
                                        <div key={p.productId} className={cn(
                                            "flex flex-col justify-between p-3 rounded-lg border transition-all bg-background min-h-[110px]",
                                            added ? "opacity-70 border-muted bg-muted/20" : "hover:border-primary/50 hover:shadow-md"
                                        )}>
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm leading-tight line-clamp-2" title={p.name}>{p.name}</div>
                                                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1 flex items-center gap-2">
                                                        SKU: {p.sku}
                                                        {added && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-1 h-3.5 text-[8px] font-black tracking-tighter">IN LIST</Badge>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-black text-sm">₱{p.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    <span className="text-[9px] text-muted-foreground font-bold">/{p.uom}</span>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    variant={added ? "ghost" : "secondary"}
                                                    className={cn(
                                                        "h-7 text-[10px] font-bold tracking-wider uppercase px-3 transition-colors",
                                                        !added && "hover:bg-primary hover:text-primary-foreground"
                                                    )}
                                                    onClick={() => handleAddToList(p)}
                                                    disabled={added}
                                                >
                                                    {added ? "Already Added" : <><PlusCircle className="w-3 h-3 mr-1" /> Add</>}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-muted/10 shrink-0">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto h-9">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
