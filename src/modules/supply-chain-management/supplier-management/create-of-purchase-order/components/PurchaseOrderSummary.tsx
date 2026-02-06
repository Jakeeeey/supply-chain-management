// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/components/PurchaseOrderSummary.tsx
"use client";

import * as React from "react";
import type { BranchAllocation, CartItem, Supplier } from "../types";
import { buildMoneyFormatter, cn } from "../utils/calculations";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

import { Info, CheckCircle2, AlertTriangle } from "lucide-react";

type Notice = {
    variant: "success" | "error" | "info";
    title: string;
    description?: string;
};

type SaveResponse = any;

export function PurchaseOrderSummary(props: {
    visible: boolean;
    poNumber: string;
    poDate: string;
    supplier: Supplier | null;
    branches: BranchAllocation[];
    allItemsFlat: Array<{ branchName: string; item: CartItem }>;
    subtotal: number; // Gross Amount
    discount: number; // Discount Amount
    tax: number; // VAT Amount
    ewtGoods?: number; // optional
    total: number; // Total (Net)
    onSave: () => void | Promise<void> | Promise<SaveResponse>;
    canSave: boolean;
}) {
    // ✅ ALL HOOKS MUST BE ABOVE ANY CONDITIONAL RETURN
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    // =========================
    // PRODUCTS PAGINATION (existing)
    // =========================
    const [page, setPage] = React.useState(1);
    const itemsPerPage = 5;

    const totalPages = React.useMemo(
        () => Math.max(1, Math.ceil(props.allItemsFlat.length / itemsPerPage)),
        [props.allItemsFlat.length]
    );

    React.useEffect(() => {
        setPage((p) => Math.min(Math.max(1, p), totalPages));
    }, [totalPages, props.allItemsFlat.length]);

    const paginatedItems = React.useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return props.allItemsFlat.slice(start, start + itemsPerPage);
    }, [props.allItemsFlat, page]);

    // =========================
    // ✅ ALLOCATED BRANCHES PAGINATION (NEW)
    // =========================
    const [branchPage, setBranchPage] = React.useState(1);
    const branchesPerPage = 5;

    const branchTotalPages = React.useMemo(
        () => Math.max(1, Math.ceil((props.branches?.length ?? 0) / branchesPerPage)),
        [props.branches?.length]
    );

    React.useEffect(() => {
        setBranchPage((p) => Math.min(Math.max(1, p), branchTotalPages));
    }, [branchTotalPages, props.branches?.length]);

    const paginatedBranches = React.useMemo(() => {
        const start = (branchPage - 1) * branchesPerPage;
        return (props.branches ?? []).slice(start, start + branchesPerPage);
    }, [props.branches, branchPage]);

    // when PO number changes, treat as new transaction; reset UI states incl. branch pagination
    React.useEffect(() => {
        setBranchPage(1);
    }, [props.poNumber]);

    // =========================
    // CONFIRM + SAVE STATES
    // =========================
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [locked, setLocked] = React.useState(false);
    const [notice, setNotice] = React.useState<Notice | null>(null);

    // ✅ kapag new PO number => new transaction (unlock)
    React.useEffect(() => {
        setLocked(false);
        setIsSubmitting(false);
        setConfirmOpen(false);
        setNotice(null);
    }, [props.poNumber]);

    const disabled = !props.canSave || isSubmitting || locked;

    const runSave = React.useCallback(async () => {
        if (disabled) return;

        setNotice(null);
        setIsSubmitting(true);

        try {
            const res = await Promise.resolve(props.onSave?.());
            const alreadyExists = Boolean((res as any)?.meta?.alreadyExists);

            setNotice({
                variant: alreadyExists ? "info" : "success",
                title: alreadyExists
                    ? "Purchase order already exists"
                    : "Purchase order created successfully",
                description: alreadyExists
                    ? "This PO number is already in the database. No duplicate was created."
                    : "Your purchase order has been saved successfully.",
            });

            // ✅ lock to prevent double submit
            setLocked(true);
        } catch (e: any) {
            setNotice({
                variant: "error",
                title: "Failed to create purchase order",
                description: String(e?.message ?? e ?? "Unknown error"),
            });
            setLocked(false);
        } finally {
            setIsSubmitting(false);
            setConfirmOpen(false);
        }
    }, [disabled, props.onSave]);

    const NoticeIcon = React.useMemo(() => {
        if (!notice) return null;
        if (notice.variant === "success") return <CheckCircle2 className="h-4 w-4" />;
        if (notice.variant === "error") return <AlertTriangle className="h-4 w-4" />;
        return <Info className="h-4 w-4" />;
    }, [notice]);

    // ✅ safe now (no hooks after this)
    if (!props.visible) return null;

    const grossAmount = Number(props.subtotal || 0);
    const discountAmount = Number(props.discount || 0);
    const netAmount = Math.max(0, grossAmount - discountAmount);
    const vatAmount = Number(props.tax || 0);
    const ewtGoods = Number(props.ewtGoods ?? netAmount * 0.01);
    const totalAmount = Number(props.total || 0);

    return (
        <div className="bg-background border border-border rounded-xl p-4 sm:p-6 shadow-sm w-full min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-5 uppercase tracking-wider">
                Purchase Order Summary
            </h3>

            {/* ✅ shadcn Alert */}
            {notice ? (
                <div className="mb-6">
                    <Alert variant={notice.variant === "error" ? "destructive" : "default"}>
                        {NoticeIcon}
                        <AlertTitle>{notice.title}</AlertTitle>
                        {notice.description ? (
                            <AlertDescription>{notice.description}</AlertDescription>
                        ) : null}
                    </Alert>

                    <div className="mt-2 flex justify-end">
                        <Button variant="outline" onClick={() => setNotice(null)} className="h-8">
                            Dismiss
                        </Button>
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* LEFT COLUMN */}
                <div className="flex flex-col h-[550px] border border-border rounded-xl bg-muted/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/30 shrink-0">
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight">
                            Order Details
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                PO Information
                            </p>
                            <div className="text-sm border border-border rounded-lg p-4 bg-background shadow-sm space-y-2">
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">PO Number:</span>
                                    <span className="font-mono font-bold text-foreground">{props.poNumber}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium text-foreground">{props.poDate}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Supplier
                            </p>
                            <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
                                <p className="text-sm font-bold text-foreground">{props.supplier?.name || "—"}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    A/P Balance:{" "}
                                    <span className="text-foreground font-medium">
                                        {props.supplier ? money.format(props.supplier.apBalance) : "—"}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* ✅ Allocated Branches with Pagination (NEW) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Allocated Branches
                                </p>

                                <span className="text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border uppercase">
                                    Page {branchPage} of {branchTotalPages}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {paginatedBranches.map((b) => (
                                    <div
                                        key={b.branchId}
                                        className="rounded-lg border border-border bg-background p-3 flex justify-between items-center"
                                    >
                                        <span className="text-xs font-semibold text-foreground">{b.branchName}</span>
                                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold">
                                            {b.items.length} ITEMS
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination controls (shadcn Button, no layout changes) */}
                            {props.branches.length > branchesPerPage ? (
                                <div className="pt-1 flex items-center justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3 text-[10px] font-black uppercase"
                                        disabled={branchPage === 1}
                                        onClick={() => setBranchPage((p) => Math.max(1, p - 1))}
                                    >
                                        Prev
                                    </Button>

                                    <div className="flex gap-1.5">
                                        {Array.from({ length: Math.min(branchTotalPages, 5) }, (_, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    branchPage === i + 1 ? "bg-primary" : "bg-border"
                                                )}
                                            />
                                        ))}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3 text-[10px] font-black uppercase"
                                        disabled={branchPage >= branchTotalPages}
                                        onClick={() => setBranchPage((p) => Math.min(branchTotalPages, p + 1))}
                                    >
                                        Next
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col h-[550px] space-y-4">
                    {/* Products */}
                    <div className="flex-1 flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-border bg-muted/50 shrink-0 flex justify-between items-center">
                            <p className="text-sm font-bold text-foreground">
                                Products ({props.allItemsFlat.length})
                            </p>
                            <span className="text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border uppercase">
                                Page {page} of {totalPages}
                            </span>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar bg-background/50">
                            <table className="w-full text-sm border-separate border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                                <tr className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                    <th className="px-4 py-3 text-left border-b border-border">Item</th>
                                    <th className="px-4 py-3 text-center border-b border-border">Qty</th>
                                    <th className="px-4 py-3 text-right border-b border-border">Total</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                {paginatedItems.map(({ branchName, item }, idx) => (
                                    <tr
                                        key={`${branchName}-${item.id}-${idx}`}
                                        className="hover:bg-muted/40 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-foreground text-xs line-clamp-1">
                                                {item.name}
                                            </div>
                                            <div className="text-[10px] text-primary font-bold uppercase tracking-tighter">
                                                {branchName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="text-foreground font-bold">{item.orderQty}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">
                                                {item.selectedUom}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-foreground">
                                            {money.format(item.price * item.orderQty)}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Products Pagination */}
                        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="text-[10px] font-black uppercase px-3 py-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 transition"
                            >
                                Prev
                            </button>
                            <div className="flex gap-1.5">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            page === i + 1 ? "bg-primary" : "bg-border"
                                        )}
                                    />
                                ))}
                            </div>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="text-[10px] font-black uppercase px-3 py-1.5 rounded border bg-background hover:bg-muted disabled:opacity-30 transition"
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="p-5 border border-border rounded-xl bg-muted/30 space-y-3 shrink-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Financial Summary
                        </div>

                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium uppercase">Gross Amount</span>
                            <span className="font-bold text-foreground">{money.format(grossAmount)}</span>
                        </div>

                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium uppercase">Discount</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                -{money.format(discountAmount)}
                            </span>
                        </div>

                        <div className="flex justify-between text-xs border-b border-border/50 pb-3">
                            <span className="text-muted-foreground font-medium uppercase">Net Amount</span>
                            <span className="font-bold text-foreground">{money.format(netAmount)}</span>
                        </div>

                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium uppercase">VAT</span>
                            <span className="font-bold text-foreground">{money.format(vatAmount)}</span>
                        </div>

                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium uppercase">EWT Goods (1%)</span>
                            <span className="font-bold text-foreground">{money.format(ewtGoods)}</span>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-border/50 mt-2">
                            <span className="font-black text-foreground uppercase tracking-tighter text-sm">
                                Total
                            </span>
                            <span className="font-black text-2xl text-primary tracking-tighter">
                                {money.format(totalAmount)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION */}
            <div className="mt-8 flex justify-end border-t border-border pt-6">
                <AlertDialog
                    open={confirmOpen}
                    onOpenChange={(o) => {
                        if (isSubmitting) return;
                        setConfirmOpen(o);
                    }}
                >
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => setConfirmOpen(true)}
                        className={cn(
                            "h-11 rounded-xl px-6 font-bold uppercase tracking-wider",
                            "transition-all hover:-translate-y-[1px] hover:shadow-sm active:translate-y-0 active:scale-[0.98]",
                            locked ? "cursor-not-allowed opacity-70" : ""
                        )}
                    >
                        {isSubmitting ? "Saving..." : locked ? "Saved" : "Save Purchase Order"}
                    </Button>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure this is the final Purchase Order?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will create and post the Purchase Order record. Please confirm before proceeding.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                                <Button type="button" variant="outline" disabled={isSubmitting}>
                                    Cancel
                                </Button>
                            </AlertDialogCancel>

                            <AlertDialogAction asChild>
                                <Button type="button" onClick={runSave} disabled={disabled}>
                                    Confirm &amp; Save
                                </Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
