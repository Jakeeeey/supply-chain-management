"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Search, Package, Tag, Box, CheckSquare, Square } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

import type { EligibleVariantRow } from "../types";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eligibleVariants: EligibleVariantRow[];
    existingProductIds: Set<number>;
    onAdd: (variant: EligibleVariantRow) => Promise<void>;
    onAddMultiple?: (variants: EligibleVariantRow[]) => Promise<void>;
    isLoading?: boolean;
};

export function PhysicalInventoryAddProductDialog(props: Props) {
    const {
        open,
        onOpenChange,
        eligibleVariants,
        existingProductIds,
        onAdd,
        onAddMultiple,
        isLoading = false,
    } = props;

    const [searchQuery, setSearchQuery] = React.useState("");
    const [addingId, setAddingId] = React.useState<number | null>(null);
    const [selectedFamilyKeys, setSelectedFamilyKeys] = React.useState<Set<number>>(new Set());
    const [isSubmittingBatch, setIsSubmittingBatch] = React.useState(false);

    const [displayLimit, setDisplayLimit] = React.useState(50);

    // Reset selection when dialog opens/closes
    React.useEffect(() => {
        if (!open) {
            setSelectedFamilyKeys(new Set());
            setSearchQuery("");
            setDisplayLimit(50);
        }
    }, [open]);

    const addableVariants = React.useMemo(() => {
        return eligibleVariants.filter(
            (v) => !existingProductIds.has(v.product_id)
        );
    }, [eligibleVariants, existingProductIds]);

    const families = React.useMemo(() => {
        const map = new Map<number, {
            representative: EligibleVariantRow;
            variants: EligibleVariantRow[];
            haystack: string;
        }>();

        for (const variant of addableVariants) {
            const familyKey = (variant.parent_id && variant.parent_id > 0) ? variant.parent_id : variant.product_id;
            if (!map.has(familyKey)) {
                map.set(familyKey, {
                    representative: variant,
                    variants: [],
                    haystack: ""
                });
            }
            const entry = map.get(familyKey)!;
            entry.variants.push(variant);
            
            // Build collective haystack for the family
            const variantHaystack = [
                variant.product_code ?? "",
                variant.product_name,
                variant.barcode ?? "",
                variant.unit_name ?? "",
                variant.unit_shortcut ?? "",
                variant.brand_name ?? "",
            ].join(" ").toLowerCase();
            
            if (!entry.haystack.includes(variantHaystack)) {
                entry.haystack += " " + variantHaystack;
            }
        }

        // Select the best representative for each family
        for (const entry of map.values()) {
            const root = entry.variants.find(v => v.parent_id === null);
            if (root) {
                entry.representative = root;
            } else {
                entry.representative = [...entry.variants].sort((a, b) => a.unit_count - b.unit_count)[0];
            }
        }

        return Array.from(map.values());
    }, [addableVariants]);

    const matchedFamilies = React.useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return families;

        return families.filter((f) => f.haystack.includes(q));
    }, [families, searchQuery]);

    const filteredFamilies = React.useMemo(() => {
        return matchedFamilies.slice(0, displayLimit);
    }, [matchedFamilies, displayLimit]);

    const hasMore = matchedFamilies.length > filteredFamilies.length;

    const handleLoadMore = React.useCallback(() => {
        setDisplayLimit((prev) => prev + 50);
    }, []);

    const handleShowAll = React.useCallback(() => {
        setDisplayLimit(matchedFamilies.length);
    }, [matchedFamilies.length]);

    const getFamilyKey = React.useCallback((variant: EligibleVariantRow) => {
        return variant.parent_id && variant.parent_id > 0 ? variant.parent_id : variant.product_id;
    }, []);

    const toggleSelectFamily = React.useCallback((familyKey: number) => {
        setSelectedFamilyKeys((prev) => {
            const next = new Set(prev);
            if (next.has(familyKey)) {
                next.delete(familyKey);
            } else {
                next.add(familyKey);
            }
            return next;
        });
    }, []);

    const handleSelectAllVisible = React.useCallback(() => {
        setSelectedFamilyKeys((prev) => {
            const next = new Set(prev);
            for (const f of filteredFamilies) {
                const fKey = getFamilyKey(f.representative);
                next.add(fKey);
            }
            return next;
        });
    }, [filteredFamilies, getFamilyKey]);

    const handleDeselectAll = React.useCallback(() => {
        setSelectedFamilyKeys(new Set());
    }, []);

    const handleAddSingle = async (variant: EligibleVariantRow, event?: React.MouseEvent) => {
        event?.stopPropagation();
        try {
            setAddingId(variant.product_id);
            await onAdd(variant);
            onOpenChange(false);
            setSearchQuery("");
        } catch {
            toast.error("Failed to add product family.");
        } finally {
            setAddingId(null);
        }
    };

    const handleAddSelectedBatch = async () => {
        if (!selectedFamilyKeys.size) return;

        // Map selected family keys to representative variants
        const selectedRepresentatives = families
            .filter((f) => selectedFamilyKeys.has(getFamilyKey(f.representative)))
            .map((f) => f.representative);

        if (!selectedRepresentatives.length) return;

        try {
            setIsSubmittingBatch(true);
            if (onAddMultiple) {
                await onAddMultiple(selectedRepresentatives);
            } else {
                for (const variant of selectedRepresentatives) {
                    await onAdd(variant);
                }
            }
            onOpenChange(false);
            setSelectedFamilyKeys(new Set());
            setSearchQuery("");
        } catch {
            toast.error("Failed to add selected products.");
        } finally {
            setIsSubmittingBatch(false);
        }
    };

    // Calculate how many visible items are currently selected
    const visibleSelectedCount = React.useMemo(() => {
        let count = 0;
        for (const f of filteredFamilies) {
            if (selectedFamilyKeys.has(getFamilyKey(f.representative))) {
                count += 1;
            }
        }
        return count;
    }, [filteredFamilies, getFamilyKey, selectedFamilyKeys]);

    const isAllVisibleSelected =
        filteredFamilies.length > 0 && visibleSelectedCount === filteredFamilies.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
                <DialogHeader className="p-8 pb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Package className="h-32 w-32 rotate-12" />
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="p-4 rounded-2xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                            <Plus className="h-7 w-7" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                Add Product Manually
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
                                Quickly find and add missing items to your current physical inventory session.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-8 pb-8 pt-2">
                    <Command className="border-none bg-transparent" shouldFilter={false}>
                        <div className="mb-4 rounded-xl bg-muted/20 border border-muted-foreground/10 focus-within:border-primary/30 focus-within:bg-background focus-within:shadow-sm transition-all duration-300 overflow-hidden [&_[data-slot=command-input-wrapper]]:border-none [&_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=command-input-wrapper]]:px-4 [&_[data-slot=command-input-wrapper]_svg]:size-5 [&_[data-slot=command-input-wrapper]_svg]:text-primary/60">
                            <CommandInput
                                placeholder="Search by name, code, brand, or barcode..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                                className="h-12 text-sm border-none ring-0 focus:ring-0 shadow-none bg-transparent"
                            />
                        </div>

                        {/* Top Selection & Action Bar */}
                        <div className="mb-3 flex items-center justify-between rounded-xl border border-muted-foreground/10 bg-muted/30 px-3.5 py-2.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Eligible Product Families
                                </span>
                                <Badge variant="outline" className="h-5 px-2 text-[11px] font-semibold border-primary/20 text-primary bg-background">
                                    {matchedFamilies.length > filteredFamilies.length
                                        ? `${filteredFamilies.length} of ${matchedFamilies.length}`
                                        : matchedFamilies.length}
                                </Badge>
                                {selectedFamilyKeys.size > 0 && (
                                    <Badge variant="secondary" className="h-5 px-2 text-[11px] font-bold bg-primary text-primary-foreground">
                                        {selectedFamilyKeys.size} selected
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold cursor-pointer border-primary/20 hover:bg-primary/10 transition-colors"
                                    onClick={isAllVisibleSelected ? handleDeselectAll : handleSelectAllVisible}
                                    disabled={filteredFamilies.length === 0}
                                >
                                    {isAllVisibleSelected ? (
                                        <>
                                            <Square className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                            Deselect All
                                        </>
                                    ) : (
                                        <>
                                            <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                            Select All ({filteredFamilies.length})
                                        </>
                                    )}
                                </Button>

                                {hasMore && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                        onClick={handleShowAll}
                                        title="Show all remaining eligible product families"
                                    >
                                        Show All ({matchedFamilies.length})
                                    </Button>
                                )}

                                {selectedFamilyKeys.size > 0 && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 px-3.5 text-xs font-bold shadow-md shadow-primary/20 cursor-pointer rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                                        disabled={isLoading || isSubmittingBatch}
                                        onClick={() => void handleAddSelectedBatch()}
                                    >
                                        {isSubmittingBatch ? (
                                            <>
                                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                Adding...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                Add Selected ({selectedFamilyKeys.size})
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                        
                        <CommandList className="max-h-[460px] scroll-smooth pr-1 custom-scrollbar">
                            <CommandEmpty className="py-12 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                                <div className="p-6 rounded-full bg-muted/30 mb-4 ring-8 ring-muted/10">
                                    <Search className="h-10 w-10 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-lg font-semibold">No products found</h3>
                                <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
                                    Try adjusting your search terms or checking the product scope.
                                </p>
                            </CommandEmpty>

                            {filteredFamilies.length > 0 && (
                                <CommandGroup>
                                    <div className="space-y-2 mt-1 pr-1">
                                        {filteredFamilies.map((entry) => {
                                            const { representative: variant, variants } = entry;
                                            const fKey = getFamilyKey(variant);
                                            const isSelected = selectedFamilyKeys.has(fKey);
                                            const uomCount = variants.length;
                                            const isSingle = uomCount === 1;

                                            return (
                                                <CommandItem
                                                    key={variant.product_id}
                                                    value={`${variant.product_name} ${variant.product_code ?? ""} ${fKey}`}
                                                    onSelect={() => toggleSelectFamily(fKey)}
                                                    className={cn(
                                                        "group flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer border transition-all duration-200 shadow-sm hover:shadow-md",
                                                        isSelected
                                                            ? "bg-primary/[0.08] border-primary/40 shadow-xs"
                                                            : "border-transparent hover:border-primary/20 hover:bg-primary/[0.02]"
                                                    )}
                                                >
                                                    {/* Checkbox for batch selection */}
                                                    <div className="flex items-center justify-center shrink-0 pr-1 pointer-events-none">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                        />
                                                    </div>

                                                    <div className={cn(
                                                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                                                        isSelected ? "bg-primary/15 text-primary" : "bg-muted/50 group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary"
                                                    )}>
                                                        <Package className="h-5 w-5" />
                                                    </div>

                                                    <div className="flex-1 flex items-center justify-between min-w-0 gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={cn(
                                                                    "font-semibold text-sm truncate transition-colors",
                                                                    isSelected ? "text-primary font-bold" : "group-hover:text-primary"
                                                                )}>
                                                                    {variant.product_name}
                                                                </span>
                                                                {variant.brand_name && (
                                                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-wider bg-primary/5 text-primary border-none">
                                                                        {variant.brand_name}
                                                                    </Badge>
                                                                )}
                                                                {!isSingle && (
                                                                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800">
                                                                        {uomCount} UOMs
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80 bg-muted/40 px-2 py-0.5 rounded-md border border-muted-foreground/5">
                                                                    <Tag className="h-3 w-3" />
                                                                    <span className="font-mono tracking-tight">{variant.product_code || "NO-CODE"}</span>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70">
                                                                    <Box className="h-3.5 w-3.5 opacity-70" />
                                                                    <span className="truncate max-w-[150px]">
                                                                        {isSingle 
                                                                            ? (variant.unit_name || variant.unit_shortcut)
                                                                            : variants.map(v => v.unit_shortcut || v.unit_name).slice(0, 3).join(", ") + (uomCount > 3 ? "..." : "")
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 shrink-0">
                                                            <div className="text-right">
                                                                <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest leading-none mb-1 opacity-40">
                                                                    {isSingle ? "Unit Price" : "Base Price"}
                                                                </div>
                                                                <div className="text-sm font-bold tabular-nums tracking-tight">
                                                                    {variant.unit_price !== null ? formatCurrency(variant.unit_price) : "---"}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Quick single-add button */}
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                title="Quick add this product family"
                                                                className={cn(
                                                                    "h-9 w-9 rounded-xl border transition-all duration-300",
                                                                    addingId === variant.product_id 
                                                                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-95" 
                                                                        : "border-muted-foreground/10 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-xs"
                                                                )}
                                                                disabled={isLoading || isSubmittingBatch || addingId !== null}
                                                                onClick={(e) => void handleAddSingle(variant, e)}
                                                            >
                                                                {addingId === variant.product_id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Plus className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            );
                                        })}

                                        {hasMore && (
                                            <div className="pt-2 pb-1 flex items-center justify-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full text-xs font-semibold cursor-pointer border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-colors py-4"
                                                    onClick={handleLoadMore}
                                                >
                                                    Load more (+50 of {matchedFamilies.length - filteredFamilies.length} remaining)
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CommandGroup>
                            )}
                        </CommandList>
                        
                        <div className="mt-4 p-3.5 rounded-2xl bg-muted/30 border border-muted-foreground/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <kbd className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-background font-sans text-[10px] font-medium shadow-sm">↓</kbd>
                                    <kbd className="inline-flex h-6 w-6 items-center justify-center rounded-md border bg-background font-sans text-[10px] font-medium shadow-sm">↑</kbd>
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">Navigate</span>
                                <div className="h-3 w-px bg-muted-foreground/20 mx-1"></div>
                                <kbd className="inline-flex h-6 px-1.5 items-center justify-center rounded-md border bg-background font-sans text-[10px] font-medium shadow-sm uppercase tracking-tighter">Enter / Click</kbd>
                                <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">to toggle selection</span>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">In Scope:</span>
                                    <Badge variant="outline" className="bg-background/80 font-bold text-[10px] px-2 py-0.5 rounded-full border-primary/20 text-primary shadow-sm">
                                        {addableVariants.length}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </Command>
                </div>
            </DialogContent>
        </Dialog>
    );
}
