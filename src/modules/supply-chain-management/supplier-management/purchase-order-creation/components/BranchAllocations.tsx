/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Building2, Minus, Plus, Search, Store, Trash2, X } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import type { BranchAllocation, DiscountType } from "../types";
import { cn, buildMoneyFormatter } from "../utils/calculations";
import { DataTable } from "@/components/ui/new-data-table";
import { Input } from "@/components/ui/input";

type FlatItem = {
    id: string;
    brand: string;
    category: string;
    name: string;
    price: number;
    uom: string;
    orderQty: number;
    discountTypeId: string;
    grossAmount: number;
    discAmount: number;
    netAmount: number;
    branchId: string;
};

export function BranchAllocations(props: {
    branches: BranchAllocation[];
    canAddProducts: boolean;
    onRemoveBranch: (id: string) => void;
    onOpenPicker: (branchId: string) => void;

    onUpdateQty: (branchId: string, productId: string, qty: number) => void;
    onRemoveItem: (branchId: string, productId: string) => void;

    // DISPLAY ONLY
    discountTypes: DiscountType[];
    disabled?: boolean;
}) {
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    const discountTypeById = React.useMemo(() => {
        const m = new Map<string, DiscountType>();
        for (const d of props.discountTypes) m.set(String(d.id), d);
        return m;
    }, [props.discountTypes]);
    
    // Per-branch search queries
    const [searchQueries, setSearchQueries] = React.useState<Record<string, string>>({});

    const updateSearch = (bid: string, q: string) => {
        setSearchQueries(prev => ({ ...prev, [bid]: q }));
    };

    if (props.branches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-xl text-muted-foreground bg-muted/30">
                <Store className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-sm font-medium text-foreground/90">
                    Add a branch to get started
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Products will be organized by delivery branch
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pt-4 w-full min-w-0 h-auto max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
            {props.branches.map((branch) => {
                const totalItems = branch.items.length;

                const flatItems: FlatItem[] = branch.items.map((item: any) => {
                    const dtId = String(item?.discountTypeId ?? "");
                    const dt = dtId ? discountTypeById.get(dtId) : undefined;
                    const pct = Number(dt?.percent ?? 0);
                    const grossAmount = item.price * item.orderQty;
                    const discAmount = grossAmount * (pct / 100);
                    const netAmount = grossAmount - discAmount;

                    return {
                        id: item.id,
                        brand: item.brand || "—",
                        category: item.category || "—",
                        name: item.name,
                        price: item.price,
                        uom: item.uom,
                        orderQty: item.orderQty,
                        discountTypeId: dtId,
                        grossAmount,
                        discAmount,
                        netAmount,
                        branchId: branch.branchId,
                    };
                });

                const columns: ColumnDef<FlatItem, any>[] = [
                    {
                        id: "index",
                        header: "#",
                        cell: ({ row }) => (
                            <span className="text-muted-foreground font-mono text-[9px]">
                                {row.index + 1}
                            </span>
                        ),
                        size: 40,
                        enableHiding: false,
                    },
                    {
                        accessorKey: "brand",
                        header: "Brand",
                        cell: ({ getValue }) => (
                            <span className="font-black text-foreground uppercase tracking-tight text-[10px]">
                                {getValue() as string}
                            </span>
                        ),
                    },
                    {
                        accessorKey: "category",
                        header: "Category",
                        cell: ({ getValue }) => (
                            <span className="text-muted-foreground font-bold uppercase text-[9px]">
                                {getValue() as string}
                            </span>
                        ),
                    },
                    {
                        accessorKey: "name",
                        header: "Product Name",
                        cell: ({ row }) => (
                            <div className="flex flex-col gap-0.5">
                                <span className="font-black text-foreground tracking-tight uppercase group-hover:text-primary transition-colors text-[10px]">
                                    {row.original.name}
                                </span>
                            </div>
                        ),
                    },
                    {
                        accessorKey: "price",
                        header: () => <div className="text-right">Price</div>,
                        cell: ({ getValue }) => (
                            <div className="text-right font-bold text-foreground/80 text-[10px]">
                                {money.format(getValue() as number).replace("PHP", "").trim()}
                            </div>
                        ),
                    },
                    {
                        accessorKey: "uom",
                        header: () => <div className="text-center">UOM</div>,
                        cell: ({ getValue }) => (
                            <div className="text-center">
                                <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[8px] font-black rounded uppercase">
                                    {getValue() as string}
                                </span>
                            </div>
                        ),
                    },
                    {
                        accessorKey: "orderQty",
                        header: () => <div className="text-center">Qty</div>,
                        cell: ({ row }) => (
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() =>
                                        props.onUpdateQty(
                                            branch.branchId,
                                            row.original.id,
                                            row.original.orderQty - 1
                                        )
                                    }
                                    className="w-6 h-6 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-30 shadow-sm transition-all hover:scale-110 active:scale-90"
                                    disabled={row.original.orderQty <= 1 || props.disabled}
                                >
                                    <Minus className="w-2.5 h-2.5" />
                                </button>
                                <input
                                    type="number"
                                    value={row.original.orderQty}
                                    disabled={props.disabled}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        props.onUpdateQty(
                                            branch.branchId,
                                            row.original.id,
                                            isNaN(val) ? 0 : val
                                        );
                                    }}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (isNaN(val) || val < 1) {
                                            props.onUpdateQty(branch.branchId, row.original.id, 1);
                                        }
                                    }}
                                    className={cn(
                                        "w-10 text-center font-black text-[11px] tracking-tighter bg-transparent border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                        props.disabled && "text-muted-foreground cursor-not-allowed"
                                    )}
                                />
                                <button
                                    onClick={() =>
                                        props.onUpdateQty(
                                            branch.branchId,
                                            row.original.id,
                                            row.original.orderQty + 1
                                        )
                                    }
                                    className="w-6 h-6 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted shadow-sm transition-all hover:scale-110 active:scale-90"
                                    disabled={props.disabled}
                                >
                                    <Plus className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        ),
                    },
                    {
                        accessorKey: "grossAmount",
                        header: () => <div className="text-right">Gross</div>,
                        cell: ({ getValue }) => (
                            <div className="text-right font-bold text-muted-foreground text-[10px]">
                                {money.format(getValue() as number).replace("PHP", "").trim()}
                            </div>
                        ),
                    },
                    {
                        id: "discType",
                        header: () => <div className="text-center">Disc Type</div>,
                        cell: ({ row }) => {
                            const dt = row.original.discountTypeId
                                ? discountTypeById.get(row.original.discountTypeId)
                                : undefined;
                            const code = dt?.name ?? "No Discount";
                            return (
                                <div className="text-center">
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                                        {code}
                                    </span>
                                </div>
                            );
                        },
                    },
                    {
                        accessorKey: "discAmount",
                        header: () => <div className="text-right">Disc Amt</div>,
                        cell: ({ getValue }) => (
                            <div className="text-right font-bold text-emerald-600/80 text-[10px]">
                                {money.format(getValue() as number).replace("PHP", "").trim()}
                            </div>
                        ),
                    },
                    {
                        accessorKey: "netAmount",
                        header: () => <div className="text-right">Net</div>,
                        cell: ({ getValue }) => (
                            <div className="text-right font-black text-primary text-[11px] tracking-tighter">
                                {money.format(getValue() as number).replace("PHP", "").trim()}
                            </div>
                        ),
                    },
                    {
                        id: "action",
                        header: () => <div className="text-right">Action</div>,
                        cell: ({ row }) => (
                            <div className="text-right">
                                <button
                                    onClick={() => props.onRemoveItem(branch.branchId, row.original.id)}
                                    disabled={props.disabled}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        props.disabled
                                            ? "text-muted-foreground/30 cursor-not-allowed"
                                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90"
                                    )}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ),
                        enableHiding: false,
                    },
                ];

                return (
                    <div
                        key={branch.branchId}
                        className="bg-muted/20 border border-border rounded-xl overflow-hidden w-full min-w-0 mb-4 shadow-sm"
                    >
                        <div className="sticky top-0 z-10 px-4 sm:px-5 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex justify-between items-center gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <Building2 className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-sm font-black text-foreground uppercase tracking-tight truncate">
                                    {branch.branchName}
                                </span>
                                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase border border-primary/20 shrink-0">
                                    {totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"}
                                </span>
                            </div>

                            <button
                                onClick={() => props.onRemoveBranch(branch.branchId)}
                                disabled={props.disabled}
                                className={cn(
                                    "p-1.5 rounded-md transition-all shrink-0 shadow-sm",
                                    props.disabled 
                                        ? "text-muted-foreground/30 cursor-not-allowed" 
                                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:scale-110 active:scale-90 hover:shadow-destructive/20"
                                )}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-5">
                            {totalItems === 0 ? (
                                <button
                                    onClick={() => props.onOpenPicker(branch.branchId)}
                                    disabled={!props.canAddProducts}
                                    className={cn(
                                        "w-full py-12 border-2 border-dashed rounded-xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-3 transition-all",
                                        props.canAddProducts
                                            ? "border-border bg-background hover:border-primary/60 hover:bg-primary/5 text-muted-foreground hover:text-primary shadow-sm"
                                            : "border-border text-muted-foreground/60 cursor-not-allowed opacity-60"
                                    )}
                                >
                                    <div className="p-3 bg-muted rounded-full">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                    Assign Products to this Hub
                                </button>
                            ) : (
                                <div className="space-y-4 w-full min-w-0">
                                    {/* ✅ Search Filter within Branch */}
                                    <div className="relative group/search max-w-sm">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors">
                                            <Search className="w-3.5 h-3.5" />
                                        </div>
                                        <Input
                                            placeholder="Search items in this branch..."
                                            value={searchQueries[branch.branchId] || ""}
                                            onChange={(e) => updateSearch(branch.branchId, e.target.value)}
                                            className="h-8 pl-9 text-[11px] font-medium bg-background border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-lg"
                                        />
                                        {searchQueries[branch.branchId] && (
                                            <button
                                                onClick={() => updateSearch(branch.branchId, "")}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="w-full overflow-x-auto [&_button:has(svg.lucide-settings-2)]:hidden">
                                        <DataTable
                                            columns={columns}
                                            data={flatItems.filter(item => {
                                                const q = (searchQueries[branch.branchId] || "").toLowerCase().trim();
                                                if (!q) return true;
                                                return (
                                                    item.name.toLowerCase().includes(q) ||
                                                    item.brand.toLowerCase().includes(q) ||
                                                    item.category.toLowerCase().includes(q)
                                                );
                                            })}
                                            emptyTitle="No matches"
                                            emptyDescription="Try a different search term."
                                        />
                                    </div>

                                    <div className="flex items-center gap-4">
                                         <button
                                            onClick={() => props.onOpenPicker(branch.branchId)}
                                            disabled={!props.canAddProducts || props.disabled}
                                            className={cn(
                                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:scale-95 active:translate-y-0",
                                                (!props.canAddProducts || props.disabled) && "opacity-50 cursor-not-allowed grayscale border-muted text-muted-foreground hover:bg-background hover:text-muted-foreground shadow-none"
                                            )}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add More Products
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
