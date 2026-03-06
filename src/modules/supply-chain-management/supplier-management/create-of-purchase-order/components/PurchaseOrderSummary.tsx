// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/components/PurchaseOrderSummary.tsx
"use client";

import * as React from "react";
import type { BranchAllocation, CartItem, Supplier, DiscountType } from "../types";
import { buildMoneyFormatter, cn, deriveDiscountPercentFromCode } from "../utils/calculations";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Info, CheckCircle2, AlertTriangle, Package, Building2, TrendingUp, Tags } from "lucide-react";
import { POPreviewModal } from "./POPreviewModal";

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
    discountTypes: DiscountType[];
}) {
    // ✅ ALL HOOKS MUST BE ABOVE ANY CONDITIONAL RETURN
    const money = React.useMemo(() => buildMoneyFormatter(), []);

    const discountTypeById = React.useMemo(() => {
        const m = new Map<string, DiscountType>();
        (props.discountTypes || []).forEach((dt) => {
            if (dt?.id) m.set(String(dt.id), dt);
        });
        return m;
    }, [props.discountTypes]);

    // =========================
    // PRODUCTS PAGINATION (existing)
    // =========================
    const [page, setPage] = React.useState(1);
    const itemsPerPage = 6;

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
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [isInvoice, setIsInvoice] = React.useState(false);

    // ✅ kapag new PO number => new transaction (unlock)
    React.useEffect(() => {
        setLocked(false);
        setIsSubmitting(false);
        setConfirmOpen(false);
        setNotice(null);
        setIsInvoice(false);
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

            // ✅ Global toast
            if (alreadyExists) {
                toast.info("Purchase order already exists", {
                    description: "This PO number is already in the database. No duplicate was created.",
                });
            } else {
                toast.success("Purchase order created!", {
                    description: "Your purchase order has been saved successfully.",
                });
            }

            // ✅ lock to prevent double submit
            setLocked(true);
        } catch (e: any) {
            const errMsg = String(e?.message ?? e ?? "Unknown error");
            setNotice({
                variant: "error",
                title: "Failed to create purchase order",
                description: errMsg,
            });

            // ✅ Global toast error
            toast.error("Failed to create purchase order", { description: errMsg });

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

    const grossTotal = Number(props.subtotal || 0);
    const discountTotal = Number(props.discount || 0);
    const netTotal = Math.max(0, grossTotal - discountTotal);
    
    // Recalculate based on user's manual edit in calculations.ts
    const vatExclusive = netTotal / 1.12;
    const vatTotal = Math.max(0, netTotal - vatExclusive);
    const ewtGoods = Math.max(0, vatExclusive * 0.01);
    
    // If not an invoice, totalPayable is just netTotal. 
    // If it IS an invoice, totalPayable is netTotal - ewtGoods.
    const totalPayable = isInvoice ? Math.max(0, netTotal - ewtGoods) : netTotal;

    return (
        <div className="bg-background border border-border rounded-xl p-3 sm:p-6 shadow-xl w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        Purchase Order Summary
                    </h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                        {locked 
                            ? "This purchase order has been successfully saved and locked in the system." 
                            : "Finalize and review your order details before saving to the system."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {locked ? (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-500/20 shadow-sm animate-in zoom-in-95 duration-300">
                            Ordered
                        </span>
                    ) : (
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-500/20 shadow-sm">
                            Draft Mode
                        </span>
                    )}
                </div>
            </div>

            {/* ✅ shadcn Alert */}
            {notice ? (
                <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <Alert variant={notice.variant === "error" ? "destructive" : "default"} className="border-2">
                        {NoticeIcon}
                        <AlertTitle className="font-bold text-sm">{notice.title}</AlertTitle>
                        {notice.description ? (
                            <AlertDescription className="text-xs opacity-90">{notice.description}</AlertDescription>
                        ) : null}
                    </Alert>
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Order Details (4 cols) */}
                <div className="lg:col-span-4 flex flex-col h-auto lg:h-[650px] border border-border rounded-xl bg-muted/5 overflow-hidden shadow-inner order-2 lg:order-1">
                    <div className="px-4 py-3 border-b border-border bg-muted/30 shrink-0 flex items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs font-black text-foreground uppercase tracking-tight">
                            Order Overview
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Package className="w-3 h-3" />
                                PO Identification
                            </p>
                            <div className="text-sm border border-border rounded-lg p-5 bg-card text-card-foreground shadow-sm space-y-3 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110" />
                                <div className="flex justify-between items-center gap-4 relative">
                                    <span className="text-muted-foreground font-medium text-xs">PO Number:</span>
                                    <span className="font-mono font-black text-primary text-sm sm:text-base underline decoration-dotted underline-offset-4">{props.poNumber}</span>
                                </div>
                                <div className="flex justify-between items-center gap-4 relative">
                                    <span className="text-muted-foreground font-medium text-xs">Transaction Date:</span>
                                    <span className="font-bold text-foreground text-xs sm:text-sm">{props.poDate}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                <Building2 className="w-3 h-3" />
                                Supplier Information
                            </p>
                            <div className="rounded-lg border border-border bg-card text-card-foreground p-5 shadow-sm space-y-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Entity Name</span>
                                    <p className="text-sm font-black text-foreground tracking-tight">{props.supplier?.name || "—"}</p>
                                </div>
                            </div>
                        </div>

                        {/* ✅ Allocated Branches */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                                    <Building2 className="w-3 h-3" />
                                    Allocated Branches
                                </p>

                                <span className="text-[9px] font-black text-muted-foreground bg-background px-2 py-0.5 rounded-full border shadow-sm uppercase">
                                    {branchPage} / {branchTotalPages}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {paginatedBranches.map((b) => (
                                    <div
                                        key={b.branchId}
                                        className="rounded-lg border border-border bg-card hover:bg-muted/50 p-3 flex justify-between items-center hover:border-primary/30 transition-colors group"
                                    >
                                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{b.branchName}</span>
                                        <span className="text-[9px] bg-secondary text-secondary-foreground px-2 py-1 rounded font-black tracking-widest uppercase shadow-sm">
                                            {b.items.length} ITEMS
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {props.branches.length > branchesPerPage ? (
                                <div className="pt-2 flex items-center justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest"
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
                                                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                    branchPage === i + 1 ? "bg-primary w-3" : "bg-border"
                                                )}
                                            />
                                        ))}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest"
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

                {/* RIGHT COLUMN: Products & Financials (8 cols) */}
                <div className="lg:col-span-8 flex flex-col h-auto lg:h-[650px] space-y-6 order-1 lg:order-2">
                    {/* Products Table with Enriched Columns */}
                    <div className="flex-1 flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-lg min-h-[400px]">
                        <div className="px-5 py-4 border-b border-border bg-muted/40 shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <div className="flex items-center gap-3">
                                <Package className="w-4 h-4 text-primary" />
                                <p className="text-sm font-black text-foreground uppercase tracking-tight">
                                    Consolidated Items ({props.allItemsFlat.length})
                                </p>
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground bg-background px-2.5 py-1 rounded-full border shadow-sm uppercase tracking-widest w-fit">
                                Page {page} of {totalPages}
                            </span>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar bg-background">
                            <table className="w-full text-xs border-separate border-spacing-0 min-w-[800px]">
                                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[9px] font-black text-muted-foreground uppercase border-b border-border w-12">#</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black text-muted-foreground uppercase border-b border-border">Details</th>
                                    <th className="px-4 py-3 text-right text-[9px] font-black text-muted-foreground uppercase border-b border-border">Unit Price</th>
                                    <th className="px-4 py-3 text-center text-[9px] font-black text-muted-foreground uppercase border-b border-border">Qty</th>
                                    <th className="px-4 py-3 text-right text-[9px] font-black text-muted-foreground uppercase border-b border-border">Gross</th>
                                    <th className="px-4 py-3 text-center text-[9px] font-black text-muted-foreground uppercase border-b border-border">Discount</th>
                                    <th className="px-4 py-3 text-right text-[9px] font-black text-muted-foreground uppercase border-b border-border">Net Amount</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                {paginatedItems.map(({ branchName, item }, idx) => {
                                    const dtId = String(item?.discountTypeId ?? "");
                                    const dt = dtId ? discountTypeById.get(dtId) : undefined;
                                    const code = dt?.name ?? "";
                                    const pct = Number(dt?.percent ?? 0) > 0 ? Number(dt?.percent) : deriveDiscountPercentFromCode(code);
                                    const discountLabel = code && pct > 0 ? `${code} (${pct.toFixed(2)}%)` : code || "—";
                                    const gross = item.price * item.orderQty;
                                    const net = gross * (1 - pct / 100);

                                    return (
                                        <tr
                                            key={`${branchName}-${item.id}-${idx}`}
                                            className="hover:bg-muted/30 transition-colors group"
                                        >
                                            <td className="px-4 py-4 text-muted-foreground font-mono text-[10px]">
                                                {(page - 1) * itemsPerPage + idx + 1}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1 max-w-[280px]">
                                                    <span className="font-black text-foreground text-[11px] leading-tight group-hover:text-primary transition-colors uppercase tracking-tight">
                                                        {item.name}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5 items-center">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded border border-border/50">
                                                            {item.brand || "NO BRAND"}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded border border-border/50">
                                                            {item.category || "UNCATEGORIZED"}
                                                        </span>
                                                        <span className="text-[9px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                                            @{branchName}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-foreground whitespace-nowrap">
                                                {money.format(item.price)}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-foreground font-black text-sm tracking-tighter">{item.orderQty}</span>
                                                    <span className="text-[8px] bg-secondary text-secondary-foreground px-1.5 rounded font-black uppercase tracking-widest mt-0.5">
                                                        {item.selectedUom || "BOX"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right font-medium text-muted-foreground whitespace-nowrap">
                                                {money.format(gross)}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex px-1.5 py-1 rounded text-[9px] font-bold border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                                                    {discountLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-primary text-sm tracking-tighter whitespace-nowrap">
                                                {money.format(net)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination with Improved Controls */}
                        <div className="px-5 py-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-background border-border shadow-sm hover:bg-muted hover:shadow-md hover:translate-x-[-2px] active:scale-95 transition-all text-foreground"
                            >
                                Previous
                            </Button>

                            <div className="hidden sm:flex items-center gap-2">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border shadow-sm hover:scale-110 active:scale-95",
                                            page === i + 1 
                                                ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-110" 
                                                : "bg-background text-foreground border-border hover:bg-muted hover:border-primary/30"
                                        )}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                {totalPages > 5 && <span className="text-muted-foreground px-1 font-black">...</span>}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-background border-border shadow-sm hover:bg-muted hover:shadow-md hover:translate-x-[2px] active:scale-95 transition-all text-foreground"
                            >
                                Next
                            </Button>
                        </div>
                    </div>

                    {/* Financial Summary & Actions Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Financial Detail Breakout */}
                        <div className="p-6 border border-border rounded-xl bg-card text-card-foreground shadow-md space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 pb-3 border-b border-border/60">
                                <div className="flex items-center gap-2">
                                    <Tags className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-black uppercase tracking-tight text-foreground">Financial Summary</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted transition-colors cursor-pointer group" onClick={() => !locked && setIsInvoice(!isInvoice)}>
                                    <Checkbox 
                                        id="is-invoice" 
                                        checked={isInvoice} 
                                        onCheckedChange={(checked) => setIsInvoice(!!checked)}
                                        disabled={locked}
                                        className="transition-transform group-active:scale-90"
                                    />
                                    <Label 
                                        htmlFor="is-invoice" 
                                        className="text-[10px] font-black uppercase tracking-widest cursor-pointer select-none text-muted-foreground group-hover:text-foreground transition-colors"
                                    >
                                        Mark as Invoice
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-foreground/70 font-black uppercase tracking-widest">Gross Amount</span>
                                    <span className="font-black text-foreground text-sm">{money.format(grossTotal)}</span>
                                </div>

                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-foreground/70 font-black uppercase tracking-widest">Discount</span>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                        {money.format(discountTotal)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-border/60">
                                    <span className="text-foreground/70 font-black uppercase tracking-widest">Net Amount</span>
                                    <span className="font-black text-foreground text-sm">{money.format(netTotal)}</span>
                                </div>

                                {isInvoice && (
                                    <>
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-foreground/70 font-black uppercase tracking-widest">VAT </span>
                                            <span className="font-black text-foreground text-sm">{money.format(vatTotal)}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-foreground/70 font-black uppercase tracking-widest">EWT (1%)</span>
                                            <span className="font-black text-foreground text-sm">{money.format(ewtGoods)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Final Payable & Actions */}
                        <div className="p-6 border-2 border-primary/20 rounded-xl bg-primary/5 shadow-lg flex flex-col justify-between relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 -mr-16 -mt-16 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-700" />

                            <div className="relative">
                                <div className="flex justify-between items-end mb-4">
                                    <div className="min-w-0">
                                        <p className="font-black text-slate-800 dark:text-muted-foreground uppercase tracking-widest text-[9px] sm:text-[10px] mb-1">Total Payable Amount</p>
                                        <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tighter leading-none break-all">
                                            {money.format(totalPayable)}
                                        </h2>
                                    </div>
                                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary opacity-20 shrink-0" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 relative mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPreviewOpen(true)}
                                    className="w-full h-10 sm:h-12 rounded-xl font-black uppercase tracking-widest transition-all text-[10px] sm:text-xs shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-95 active:translate-y-0 active:shadow-inner"
                                >
                                    Review & Print PO
                                </Button>

                                <AlertDialog
                                    open={confirmOpen}
                                    onOpenChange={(o) => {
                                        if (isSubmitting) return;
                                        setConfirmOpen(o);
                                    }}
                                >
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            type="button"
                                            disabled={disabled}
                                            className={cn(
                                                "w-full h-10 sm:h-12 rounded-xl font-black uppercase tracking-widest transition-all text-[10px] sm:text-xs shadow-lg relative overflow-hidden group/save",
                                                locked 
                                                    ? "bg-emerald-600 text-emerald-50 cursor-default opacity-100 border-none shadow-emerald-500/20" 
                                                    : !disabled && "bg-primary text-primary-foreground hover:bg-primary/90 border-b-4 border-primary/20 hover:-translate-y-1 hover:shadow-primary/30 active:translate-y-0 active:border-b-0",
                                                disabled && "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 opacity-100 cursor-not-allowed shadow-none border-2 border-slate-300 dark:border-slate-700",
                                                isSubmitting && "opacity-70 animate-pulse"
                                            )}
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {isSubmitting ? "Processing Transaction..." : locked ? "Transaction Posted" : "Save Purchase Order"}
                                            </span>
                                            {!disabled && !locked && (
                                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/save:opacity-100 transition-opacity" />
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>

                                    <AlertDialogContent className="rounded-2xl border-2 max-w-[90vw] sm:max-w-lg">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-lg sm:text-xl font-black tracking-tight uppercase">Confirm Final Submission</AlertDialogTitle>
                                            <AlertDialogDescription className="text-xs sm:text-sm font-medium">
                                                This will record the Purchase Order into the master ledger. This action is audited and irreversible.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        <AlertDialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                                            <AlertDialogCancel asChild>
                                                <Button type="button" variant="outline" disabled={isSubmitting} className="font-bold border-2 w-full sm:w-auto">
                                                    Go Back
                                                </Button>
                                            </AlertDialogCancel>

                                            <AlertDialogAction asChild>
                                                <Button 
                                                    type="button" 
                                                    onClick={runSave} 
                                                    disabled={disabled} 
                                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest shadow-lg shadow-primary/20 border-b-4 border-primary/20 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:border-b-0 transition-all w-full sm:w-auto"
                                                >
                                                    Yes, Post Record
                                                </Button>
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <POPreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                onConfirmSave={runSave}
                isSubmitting={isSubmitting}
                locked={locked}
                isInvoice={isInvoice}
                data={{
                    poNumber: props.poNumber,
                    poDate: props.poDate,
                    supplierName: props.supplier?.name || "N/A",
                    items: props.allItemsFlat.map(x => {
                        const dt = discountTypeById.get(x.item.discountTypeId || "");
                        const gross = x.item.price * x.item.orderQty;
                        const disc = gross * ((dt?.percent ?? 0) / 100);
                        return {
                            name: x.item.name,
                            brand: x.item.brand || "—",
                            category: x.item.category || "—",
                            barcode: x.item.sku,
                            orderQty: x.item.orderQty,
                            uom: x.item.selectedUom,
                            price: x.item.price,
                            grossAmount: gross,
                            discountType: dt?.name || "No Discount",
                            discountAmount: disc,
                            netAmount: gross - disc,
                            branchName: x.branchName
                        };
                    }),
                    subtotal: grossTotal,
                    discount: discountTotal,
                    vat: vatTotal,
                    ewt: ewtGoods,
                    total: totalPayable
                }}
            />
        </div>
    );
}
