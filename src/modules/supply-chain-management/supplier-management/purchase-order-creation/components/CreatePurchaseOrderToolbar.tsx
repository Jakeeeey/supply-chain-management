// src/modules/supply-chain-management/supplier-management/purchase-order-creation/components/CreatePurchaseOrderToolbar.tsx
"use client";

import * as React from "react";
import { Building2, ChevronDown } from "lucide-react";
import type { Supplier, Branch } from "../types";
import { cn, buildMoneyFormatter } from "../utils/calculations";

export function CreatePurchaseOrderToolbar(props: {
    // supplier
    selectedSupplier: Supplier | null;
    supplierQuery: string;
    onSupplierQueryChange: (v: string) => void;
    suppliers: Supplier[];
    onSelectSupplier: (s: Supplier) => void;
    onClearSupplier: () => void;

    // branches
    branchQuery: string;
    onBranchQueryChange: (v: string) => void;
    branches: Branch[];
    onAddBranch: (b: Branch) => void;
}) {
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    const [openSupplier, setOpenSupplier] = React.useState(false);
    const [openBranch, setOpenBranch] = React.useState(false);

    React.useEffect(() => {
        const onDown = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest("[data-dd-root]")) {
                setOpenSupplier(false);
                setOpenBranch(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    return (
        <div className="space-y-6">
            {/* Supplier */}
            <div className="space-y-2" data-dd-root>
                <label className="text-sm font-semibold text-foreground">
                    Supplier <span className="text-destructive">*</span>
                </label>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search and select supplier..."
                        value={props.selectedSupplier?.name || props.supplierQuery}
                        onChange={(e) => {
                            props.onSupplierQueryChange(e.target.value);
                            setOpenSupplier(true);
                            if (props.selectedSupplier) props.onClearSupplier();
                        }}
                        onFocus={() => setOpenSupplier(true)}
                        className="w-full h-11 px-4 pr-20 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring transition"
                    />

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {props.selectedSupplier && (
                            <button
                                type="button"
                                onClick={() => {
                                    props.onClearSupplier();
                                    props.onSupplierQueryChange("");
                                    setOpenSupplier(false);
                                }}
                                className="h-8 px-2 rounded-md border border-border bg-background hover:bg-muted transition text-xs text-muted-foreground"
                            >
                                Clear
                            </button>
                        )}
                        <ChevronDown className="w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>

                    {openSupplier && !props.selectedSupplier && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-20">
                            {props.suppliers.length > 0 ? (
                                props.suppliers.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            props.onSelectSupplier(s);
                                            props.onSupplierQueryChange("");
                                            setOpenSupplier(false);
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-muted transition border-b border-border/60 last:border-0"
                                    >
                                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Terms: {s.terms} • A/P: {money.format(s.apBalance)}
                                        </p>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-sm text-muted-foreground">No suppliers found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Branches */}
            <div className="space-y-2" data-dd-root>
                <label className="text-sm font-semibold text-foreground">
                    Delivery Branches <span className="text-destructive">*</span>
                    <span className="text-xs text-muted-foreground font-normal ml-2">(Add a branch, then add products to it)</span>
                </label>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search and add branch..."
                        value={props.branchQuery}
                        onChange={(e) => {
                            props.onBranchQueryChange(e.target.value);
                            setOpenBranch(true);
                        }}
                        onFocus={() => setOpenBranch(true)}
                        className="w-full h-11 px-4 pr-10 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring transition"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

                    {openBranch && (
                        <div className={cn(
                            "absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-20"
                        )}>
                            {props.branches.length > 0 ? (
                                props.branches.map((b) => (
                                    <button
                                        key={b.id}
                                        onClick={() => {
                                            props.onAddBranch(b);
                                            props.onBranchQueryChange("");
                                            setOpenBranch(false);
                                        }}
                                        className="w-full px-4 py-3 text-left hover:bg-muted transition border-b border-border/60 last:border-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-medium text-foreground">{b.name}</span>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-sm text-muted-foreground">No branches found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
