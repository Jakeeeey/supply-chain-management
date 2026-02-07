"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { PurchaseOrderDetail, PaymentTerm } from "../types";

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

function toNum(v: any): number {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function unwrap(po: any) {
    return po?.data ?? po;
}

function safeStr(v: any, fallback = "—") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}

type NormalizedLine = {
    key: string;
    name: string;
    uom: string;
    qty: number;
    price: number;
    total: number;
};

function normalizeLines(rawItems: any[]): NormalizedLine[] {
    if (!Array.isArray(rawItems)) return [];
    return rawItems.map((it: any, idx: number) => {
        const key = String(it?.po_item_id ?? it?.id ?? idx);
        const name = safeStr(it?.item_name ?? it?.name ?? it?.product_name ?? `Item ${idx + 1}`);
        const uom = safeStr(it?.uom ?? it?.unit ?? "—");
        const qty = Math.max(0, toNum(it?.qty ?? it?.quantity ?? 0));
        const price = Math.max(0, toNum(it?.unit_price ?? it?.price ?? 0));
        const total = toNum(it?.line_total) || Math.max(0, qty * price);
        return { key, name, uom, qty, price, total };
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

    const poAny: any = React.useMemo(() => unwrap(props.po), [props.po]);

    React.useEffect(() => {
        setMarkAsInvoice(false);
        setPaymentTerm("cash_on_delivery");
        setTermsDays(30);
    }, [poAny?.purchase_order_id ?? poAny?.id ?? null]);

    const branchLabel = React.useMemo(() => {
        const b = poAny?.branch_id ?? null;
        const code = safeStr(b?.branch_code ?? b?.code ?? "");
        const name = safeStr(b?.branch_name ?? b?.name ?? b?.branch_description ?? "");
        if (code !== "—" && name !== "—") return `${code} — ${name}`;
        if (name !== "—") return name;
        const raw = poAny?.branch_id_value ?? poAny?.branch_id ?? poAny?.branch;
        const s = String(raw ?? "").trim();
        return s ? s : "—";
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

    const apBalance = React.useMemo(() => {
        return toNum(poAny?.supplier_name?.ap_balance ?? poAny?.apBalance ?? 0);
    }, [poAny]);

    const lines = React.useMemo(() => normalizeLines(poAny?.items ?? []), [poAny]);

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

    const ewtGoods = React.useMemo(() => {
        if (ewtDirect > 0) return ewtDirect;
        return netAmount > 0 ? netAmount * 0.01 : 0;
    }, [ewtDirect, netAmount]);

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

    const approveDisabled = props.disabled || props.loading || !poAny?.purchase_order_id;

    return (
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
                                    <div className="text-sm font-bold text-foreground truncate">
                                        {supplierName}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        A/P Balance:{" "}
                                        <span className="text-foreground font-medium">{fmt.format(apBalance)}</span>
                                    </div>
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
                                <ScrollArea className="max-h-56 pr-2">
                                    <div className="space-y-2">
                                        {lines.map((l) => (
                                            <div key={l.key} className="rounded-lg border border-border bg-background p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-foreground truncate">{l.name}</div>
                                                        <div className="text-[11px] text-muted-foreground mt-1">
                                                            UOM: {l.uom} • Qty: {l.qty} • Unit Price: {fmt.format(l.price)}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-black text-foreground">{fmt.format(l.total)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
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

                            {/* ✅ VAT/EWT + note only when Mark as Invoice is ON */}
                            {markAsInvoice ? (
                                <>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground font-medium uppercase">VAT</span>
                                        <span className="font-bold text-foreground">{fmt.format(vatAmount)}</span>
                                    </div>

                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground font-medium uppercase">EWT Goods (1%)</span>
                                        <span className="font-bold text-destructive">-{fmt.format(ewtGoods)}</span>
                                    </div>

                                    <div className="rounded-md bg-background/60 border border-border/60 px-3 py-2 text-[11px] text-muted-foreground italic">
                                        Note: VAT and EWT are shown for reciept/invoice display purposes only
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
                                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-bold text-primary">Total Accounts Payable (after approval):</span>
                                        <span className="font-black text-primary">{fmt.format(apBalance + totalAmount)}</span>
                                    </div>
                                    <div className="mt-1 text-[11px] text-primary/80">
                                        Current: {fmt.format(apBalance)} + This PO: {fmt.format(totalAmount)}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                                <Switch checked={markAsInvoice} onCheckedChange={setMarkAsInvoice} id="markAsInvoice" />
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

                                    <Button
                                        type="button"
                                        className="h-10 rounded-xl font-black uppercase tracking-wider"
                                        disabled={approveDisabled}
                                        onClick={() =>
                                            props.onApprove({
                                                markAsInvoice,
                                                paymentTerm,
                                                termsDays: paymentTerm === "terms" ? Math.max(1, termsDays) : undefined,
                                            })
                                        }
                                    >
                                        Approve PO
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
