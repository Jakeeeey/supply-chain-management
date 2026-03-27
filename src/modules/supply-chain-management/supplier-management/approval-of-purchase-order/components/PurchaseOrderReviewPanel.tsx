"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

import type { PurchaseOrderDetail, PaymentTerm } from "../types";

import { toast } from "sonner";

function money() {
    try {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
        });
    } catch {
        return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2 });
    }
}

function toNum(v: unknown): number {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(po: any) {
    return po?.data ?? po;
}

function safeStr(v: unknown, fallback = "—") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}

function isNumericString(v: unknown) {
    const s = String(v ?? "").trim();
    if (!s) return false;
    return /^[0-9]+$/.test(s);
}

function pickText(v: unknown): string {
    // ✅ never stringify objects into "[object Object]"
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number") return String(v);
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    // objects/arrays/functions -> ignore
    return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatBranchOne(raw: any): string {
    if (!raw) return "";

    // allocation style: { branchId, branchName }
    const allocName = pickText(raw?.branchName ?? raw?.branch_name_text ?? raw?.branchNameText ?? "");
    const allocCode = pickText(raw?.branchCode ?? raw?.branch_code_text ?? raw?.branchCodeText ?? "");

    // expanded branch object
    const code = pickText(raw?.branch_code ?? raw?.code ?? allocCode);
    const name = pickText(raw?.branch_name ?? raw?.name ?? raw?.branch_description ?? allocName);

    if (code && name) return `${code} — ${name}`;
    if (name) return name;
    if (code) return code;

    // primitive fallback (avoid numeric id)
    if (typeof raw === "string" || typeof raw === "number") {
        const s = String(raw).trim();
        if (!s || isNumericString(s)) return "";
        return s;
    }

    return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatBranches(raw: any): string {
    // 1) Array form
    if (Array.isArray(raw)) {
        const labels = raw
            .map((b) => formatBranchOne(b))
            .map((x) => x.trim())
            .filter(Boolean);

        if (!labels.length) return "—";
        if (labels.length <= 2) return labels.join(", ");
        return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
    }

    // 2) Single object or primitive
    const one = formatBranchOne(raw);
    return one ? one : "—";
}

type NormalizedLine = {
    key: string;
    name: string;
    brand: string;
    category: string;
    uom: string;
    qty: number;
    price: number;
    gross: number;
    discountType: string;
    discountAmount: number;
    net: number;
    total: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeLines(rawItems: any[]): NormalizedLine[] {
    if (!Array.isArray(rawItems)) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rawItems.map((it: any, idx: number) => {
        const key = String(it?.po_item_id ?? it?.id ?? idx);
        const name = safeStr(it?.item_name ?? it?.name ?? it?.product_name ?? `Item ${idx + 1}`);
        const brand = safeStr(it?.brand ?? "—");
        const category = safeStr(it?.category ?? "—");
        const uom = safeStr(it?.uom ?? it?.unit ?? "—");
        const qty = Math.max(0, toNum(it?.qty ?? it?.quantity ?? 0));
        const price = Math.max(0, toNum(it?.unit_price ?? it?.price ?? 0));
        const gross = toNum(it?.gross) || Math.max(0, qty * price);
        const discountType = safeStr(it?.discount_type ?? "—");
        const discountAmount = Math.abs(toNum(it?.discount_amount ?? 0));
        const net = toNum(it?.net) || Math.max(0, gross - discountAmount);
        const total = toNum(it?.line_total) || net;
        return { key, name, brand, category, uom, qty, price, gross, discountType, discountAmount, net, total };
    });
}

export default function PurchaseOrderReviewPanel(props: {
    po: PurchaseOrderDetail | null;
    loading: boolean;
    disabled?: boolean;
    onApprove: (opts: {
        markAsInvoice: boolean;
        paymentTerm: PaymentTerm;
        termsDays?: number;
    }) => void | Promise<void>;
}) {
    const fmt = React.useMemo(() => money(), []);

    const [markAsInvoice, setMarkAsInvoice] = React.useState(false);
    const [paymentTerm, setPaymentTerm] = React.useState<PaymentTerm>("cash_on_delivery");
    const [termsDays, setTermsDays] = React.useState<number>(30);

    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    // ✅ Pagination state
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poAny: any = React.useMemo(() => unwrap(props.po), [props.po]);

    React.useEffect(() => {
        setMarkAsInvoice(!!(poAny?.is_invoice ?? poAny?.isInvoice ?? false));
        setPaymentTerm("cash_on_delivery");
        setTermsDays(30);

        // reset confirm state when switching PO
        setConfirmOpen(false);
        setSubmitting(false);

        // Reset pagination
        setCurrentPage(1);
    }, [poAny?.purchase_order_id, poAny?.id, poAny?.is_invoice, poAny?.isInvoice]);

    /**
     * ✅ FIX: Branch label resolver
     * Handles:
     * - helper strings: branch_name_text / branch_code_text
     * - expanded object: branch_id {branch_code, branch_name}
     * - allocations array: allocations [{branchName,...}]
     * - branch_id array
     * Prevents "[object Object]"
     */
    const branchLabel = React.useMemo(() => {
        // 0) prefer helper fields from API
        const helperName = pickText(poAny?.branch_name_text ?? poAny?.branchNameText ?? poAny?.branchName ?? "");
        const helperCode = pickText(poAny?.branch_code_text ?? poAny?.branchCodeText ?? poAny?.branchCode ?? "");

        if (helperName) {
            return helperCode ? `${helperCode} — ${helperName}` : helperName;
        }

        // 1) if allocations exist (create PO uses allocations)
        if (Array.isArray(poAny?.allocations) && poAny.allocations.length) {
            return formatBranches(poAny.allocations);
        }

        // 2) if API returns branch_id expanded or array
        if (poAny?.branch_id !== undefined) {
            return formatBranches(poAny.branch_id);
        }

        // 3) other possible keys
        if (poAny?.branches !== undefined) return formatBranches(poAny.branches);
        if (poAny?.branch !== undefined) return formatBranches(poAny.branch);

        // 4) last resort but avoid numeric id
        const raw = poAny?.branch_id_value ?? poAny?.branchId ?? "";
        if (raw && !isNumericString(raw)) return String(raw).trim();

        return "—";
    }, [poAny]);

    // ✅ Supplier name ONLY (no numeric fallback)
    const supplierName = React.useMemo(() => {
        return safeStr(
            poAny?.supplier_name?.supplier_name ??
            poAny?.supplierName ??
            poAny?.supplier ??
            "—"
        );
    }, [poAny]);


    const lines = React.useMemo(() => normalizeLines(poAny?.items ?? []), [poAny]);

    const totalPages = Math.ceil(lines.length / pageSize);
    const currentLines = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return lines.slice(start, start + pageSize);
    }, [lines, currentPage, pageSize]);

    const grossDirect = toNum(poAny?.gross_amount ?? poAny?.grossAmount);
    const discountAmount = toNum(poAny?.discounted_amount ?? poAny?.discountAmount);
    const vatAmount = toNum(poAny?.vat_amount ?? poAny?.vatAmount);
    const ewtDirect = toNum(poAny?.withholding_tax_amount ?? poAny?.ewtGoods);
    const totalDirect = toNum(poAny?.total_amount ?? poAny?.total);

    const netAmount = React.useMemo(() => {
        if (grossDirect > 0) return Math.max(0, grossDirect - discountAmount);
        if (totalDirect > 0) return totalDirect;
        return 0;
    }, [grossDirect, discountAmount, totalDirect]);

    const grossAmount = React.useMemo(() => {
        if (grossDirect > 0) return grossDirect;
        if (netAmount > 0 || discountAmount > 0) return Math.max(0, netAmount + discountAmount);
        return 0;
    }, [grossDirect, netAmount, discountAmount]);

    const vatExclusive = React.useMemo(() => {
        return netAmount / 1.12;
    }, [netAmount]);

    const vatAmountComputed = React.useMemo(() => {
        return Math.max(0, netAmount - vatExclusive);
    }, [netAmount, vatExclusive]);

    const ewtGoods = React.useMemo(() => {
        if (ewtDirect > 0) return ewtDirect;
        return vatExclusive > 0 ? vatExclusive * 0.01 : 0;
    }, [ewtDirect, vatExclusive]);

    const totalAmount = React.useMemo(() => {
        if (totalDirect > 0) return totalDirect;
        return netAmount;
    }, [totalDirect, netAmount]);

    const paymentStatusLabel = React.useMemo(() => {
        if (paymentTerm === "cash_on_delivery") return "Payment Due on Delivery";
        if (paymentTerm === "cash_with_order") return "Payment Due with Order";
        if (paymentTerm === "terms") return `Payment Due in ${Math.max(1, termsDays)} Day(s)`;
        return "—";
    }, [paymentTerm, termsDays]);

    const approveDisabled =
        props.disabled || props.loading || submitting || !poAny?.purchase_order_id;

    async function runApprove() {
        if (approveDisabled) return;

        try {
            setSubmitting(true);

            await Promise.resolve(
                props.onApprove({
                    markAsInvoice,
                    paymentTerm,
                    termsDays: paymentTerm === "terms" ? Math.max(1, termsDays) : undefined,
                })
            );

            toast.success("Purchase Order approved successfully!", {
                description: "The PO has been approved and updated.",
            });

            setConfirmOpen(false);
        } catch (e: unknown) {
            toast.error("Failed to approve Purchase Order", {
                description: String(e instanceof Error ? e.message : e || "Unknown error"),
            });
            setConfirmOpen(false);
            throw e;
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            {/*<SonnerToaster richColors position="top-right" closeButton />*/}

            <div
                className={cn(
                    "min-w-0 border border-border rounded-xl bg-background shadow-sm overflow-hidden",
                    props.disabled ? "opacity-70 pointer-events-none" : ""
                )}
            >
                <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-sm font-black text-foreground uppercase tracking-tight">
                            Purchase Order Review
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                            {String(poAny?.purchase_order_no ?? poAny?.poNumber ?? "Select a PO to review")}
                        </div>
                    </div>

                    {poAny?.purchase_order_id ? (
                        <Badge variant="secondary" className="text-[10px] font-black">
                            ID: {String(poAny.purchase_order_id)}
                        </Badge>
                    ) : null}
                </div>

                <div className="p-4 space-y-4">
                    {!props.po ? (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                            Select a pending Purchase Order on the left to view details.
                        </div>
                    ) : props.loading ? (
                        <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
                            Loading purchase order details...
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-border bg-background p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        PO Information
                                    </div>
                                    <div className="mt-2 space-y-1 text-sm">
                                        <div className="flex justify-between gap-3">
                                            <span className="text-muted-foreground">PO Number</span>
                                            <span className="font-mono font-bold text-foreground">
                                                {String(poAny?.purchase_order_no ?? poAny?.poNumber ?? "—")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-muted-foreground">Date</span>
                                            <span className="font-medium text-foreground">
                                                {String(poAny?.date ?? poAny?.date_encoded ?? "—")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-muted-foreground">Branch</span>
                                            <span className="font-medium text-foreground truncate text-right">
                                                {branchLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background p-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Supplier
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-sm font-bold text-foreground truncate">{supplierName}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-background p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Payment Status
                                </div>
                                <div className="mt-2 rounded-lg bg-muted/30 p-3 text-sm">
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                        Payment Status: {paymentStatusLabel}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 border border-border rounded-xl bg-muted/30 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Products
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-black uppercase">
                                        {lines.length} item(s)
                                    </Badge>
                                </div>
                                {lines.length ? (
                                    <div className="rounded-lg border border-border bg-background overflow-hidden">
                                        <div className="overflow-auto max-h-[400px]">
                                            <table className="w-full text-left text-xs border-separate border-spacing-0">
                                                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm shadow-sm">
                                                    <tr>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground border-b border-border">Brand</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground border-b border-border">Category</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground border-b border-border">Product Name</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground text-right border-b border-border">Price</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground border-b border-border">UOM</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground text-right border-b border-border">Qty</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground text-right border-b border-border">Gross</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground border-b border-border">Discount Type</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground text-right border-b border-border">Discount</th>
                                                        <th className="px-3 py-2 font-black uppercase tracking-tight text-muted-foreground text-right border-b border-border">Net</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {currentLines.map((l) => (
                                                        <tr key={l.key} className="hover:bg-muted/30 transition-colors">
                                                            <td className="px-3 py-2 text-muted-foreground border-b border-border/10">{l.brand}</td>
                                                            <td className="px-3 py-2 text-muted-foreground border-b border-border/10">{l.category}</td>
                                                            <td className="px-3 py-2 font-bold text-foreground border-b border-border/10">{l.name}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums border-b border-border/10">{fmt.format(l.price)}</td>
                                                            <td className="px-3 py-2 text-muted-foreground border-b border-border/10">{l.uom}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums font-medium border-b border-border/10">{l.qty}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums font-medium border-b border-border/10">{fmt.format(l.gross)}</td>
                                                            <td className="px-3 py-2 text-muted-foreground uppercase border-b border-border/10">{l.discountType}</td>
                                                            <td className="px-3 py-2 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400 border-b border-border/10">
                                                                {fmt.format(l.discountAmount)}
                                                            </td>
                                                            <td className="px-3 py-2 text-right tabular-nums font-black text-foreground border-b border-border/10">{fmt.format(l.net)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* ✅ Pagination Controls */}
                                        <div className="border-t border-border p-3 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>Rows per page:</span>
                                                <Select
                                                    value={String(pageSize)}
                                                    onValueChange={(v) => {
                                                        setPageSize(Number(v));
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 w-[70px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[10, 20, 30, 50, 100].map((size) => (
                                                            <SelectItem key={size} value={String(size)}>
                                                                {size}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <span className="ml-2">
                                                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                                                    {Math.min(currentPage * pageSize, lines.length)} of{" "}
                                                    {lines.length} items
                                                </span>
                                            </div>

                                            {totalPages > 1 && (
                                                <Pagination className="w-auto mx-0">
                                                    <PaginationContent>
                                                        <PaginationItem>
                                                            <PaginationPrevious
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (currentPage > 1) setCurrentPage((p) => p - 1);
                                                                }}
                                                                className={cn(
                                                                    "h-8 px-2 cursor-pointer",
                                                                    currentPage === 1 && "pointer-events-none opacity-50"
                                                                )}
                                                            />
                                                        </PaginationItem>
                                                        
                                                        <div className="flex items-center gap-1">
                                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                                .filter(p => {
                                                                    return p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1);
                                                                })
                                                                .map((p, i, arr) => (
                                                                    <React.Fragment key={p}>
                                                                        {i > 0 && arr[i-1] !== p - 1 && (
                                                                            <PaginationItem>
                                                                                <PaginationEllipsis />
                                                                            </PaginationItem>
                                                                        )}
                                                                        <PaginationItem>
                                                                            <PaginationLink
                                                                                href="#"
                                                                                className="h-8 w-8 cursor-pointer"
                                                                                isActive={currentPage === p}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    setCurrentPage(p);
                                                                                }}
                                                                            >
                                                                                {p}
                                                                            </PaginationLink>
                                                                        </PaginationItem>
                                                                    </React.Fragment>
                                                                ))}
                                                        </div>

                                                        <PaginationItem>
                                                            <PaginationNext
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
                                                                }}
                                                                className={cn(
                                                                    "h-8 px-2 cursor-pointer",
                                                                    currentPage === totalPages && "pointer-events-none opacity-50"
                                                                )}
                                                            />
                                                        </PaginationItem>
                                                    </PaginationContent>
                                                </Pagination>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                        No product lines found for this PO.
                                    </div>
                                )}
                            </div>

                            <div className="p-5 border border-border rounded-xl bg-muted/30 space-y-3">
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Financial Summary
                                </div>

                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground font-medium uppercase">Gross Amount</span>
                                    <span className="font-bold text-foreground">{fmt.format(grossAmount)}</span>
                                </div>

                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground font-medium uppercase">Discount</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        -{fmt.format(discountAmount)}
                                    </span>
                                </div>

                                <div className="flex justify-between text-xs border-b border-border/50 pb-3">
                                    <span className="text-muted-foreground font-medium uppercase">Net Amount</span>
                                    <span className="font-bold text-foreground">{fmt.format(netAmount)}</span>
                                </div>

                                {markAsInvoice ? (
                                    <>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground font-medium uppercase">VAT (12%)</span>
                                            <span className="font-bold text-foreground">{fmt.format(vatAmount || vatAmountComputed)}</span>
                                        </div>

                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground font-medium uppercase">EWT Goods (1%)</span>
                                            <span className="font-bold text-destructive">-{fmt.format(ewtGoods)}</span>
                                        </div>

                                        <div className="rounded-md bg-background/60 border border-border/60 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400 font-bold italic">
                                            Note: VAT and EWT are shown for display purposes. EWT (1%) is calculated from the VAT-exclusive amount (Net / 1.12).
                                        </div>
                                    </>
                                ) : null}

                                <div className="flex justify-between items-center pt-2 border-t border-border/50 mt-2">
                                    <span className="font-black text-foreground uppercase tracking-tighter text-sm">
                                        Total
                                    </span>
                                    <span className="font-black text-2xl text-primary tracking-tighter">
                                        {fmt.format(totalAmount)}
                                    </span>
                                </div>

                                {!markAsInvoice ? (
                                    <div className="rounded-lg bg-background/60 border border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
                                        PO not marked as invoice - Accounts payable will not be affected
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary/70 italic">
                                        Note: This Purchase Order is marked as an invoice and will affect accounts payable.
                                    </div>
                                )}
                            </div>

                            <Separator />

                            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                                <div className="flex items-center gap-3">
                                    <Switch 
                                        checked={markAsInvoice} 
                                        onCheckedChange={setMarkAsInvoice} 
                                        id="markAsInvoice" 
                                    />
                                    <Label htmlFor="markAsInvoice" className="text-sm font-bold">
                                        Mark as Invoice
                                    </Label>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Payment Term
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select value={paymentTerm} onValueChange={(v) => setPaymentTerm(v as PaymentTerm)}>
                                            <SelectTrigger className="h-10 w-[220px] rounded-xl">
                                                <SelectValue placeholder="Select payment term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash_with_order">Cash With Order</SelectItem>
                                                <SelectItem value="cash_on_delivery">Cash On Delivery</SelectItem>
                                                <SelectItem value="terms">Terms</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {paymentTerm === "terms" ? (
                                            <div className="flex items-center gap-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Days
                                                </div>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={String(termsDays)}
                                                    onChange={(e) => setTermsDays(Math.max(1, toNum(e.target.value)))}
                                                    className="h-10 w-[110px] rounded-xl"
                                                />
                                            </div>
                                        ) : null}

                                        <AlertDialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
                                            <Button
                                                type="button"
                                                className="h-10 rounded-xl font-black uppercase tracking-wider"
                                                disabled={approveDisabled}
                                                onClick={() => setConfirmOpen(true)}
                                            >
                                                {submitting ? "Approving..." : "Approve PO"}
                                            </Button>

                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure this is the final approval?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will approve and post the Purchase Order. Please confirm before proceeding.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>

                                                <AlertDialogFooter>
                                                    <AlertDialogCancel asChild>
                                                        <Button type="button" variant="outline" disabled={submitting}>
                                                            Cancel
                                                        </Button>
                                                    </AlertDialogCancel>

                                                    <AlertDialogAction asChild>
                                                        <Button type="button" onClick={runApprove} disabled={approveDisabled}>
                                                            Confirm &amp; Approve
                                                        </Button>
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
