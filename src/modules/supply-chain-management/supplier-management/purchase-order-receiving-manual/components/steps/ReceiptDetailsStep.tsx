/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, XCircle, AlertCircle } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useReceivingProductsManual } from "../../providers/ReceivingProductsManualProvider";



function statusBadgeClasses(status?: string) {
    const s = String(status || "").toUpperCase();
    if (s === "CLOSED") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20";
    if (s === "PARTIAL") return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20";
    return "bg-primary/15 text-primary border border-primary/20";
}

const API_URL = "/api/scm/supplier-management/purchase-order-receiving-manual";

export function ReceiptDetailsStep({ onContinue }: { onContinue: () => void }) {
    const {
        selectedPO,
        receiptNo,
        setReceiptNo,
        receiptType,
        setReceiptType,
        receiptTypes,
        receiptDate,
        setReceiptDate,
        loadReceipt,
        editingReceiptId,
        clearEditingReceiptId,
    } = useReceivingProductsManual();

    const [receiptNoDupError, setReceiptNoDupError] = React.useState<string | null>(null);
    const [checkingDup, setCheckingDup] = React.useState(false);
    const dupCheckTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // ✅ Debounced receipt number duplicate check
    const checkReceiptNoDuplicate = React.useCallback((value: string) => {
        if (dupCheckTimer.current) clearTimeout(dupCheckTimer.current);
        const trimmed = value.trim();
        if (!trimmed || !selectedPO?.id) {
            setReceiptNoDupError(null);
            return;
        }
        dupCheckTimer.current = setTimeout(async () => {
            try {
                setCheckingDup(true);
                const r = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "check_receipt_no", receiptNo: trimmed, poId: selectedPO.id }),
                });
                const j = await r.json().catch(() => ({}));
                if (j?.data?.isDuplicate) {
                    setReceiptNoDupError(`This receipt number is already in use on ${j.data.existingPoNo}.`);
                } else {
                    setReceiptNoDupError(null);
                }
            } catch {
                // Silently fail — backend will catch on save
                setReceiptNoDupError(null);
            } finally {
                setCheckingDup(false);
            }
        }, 400);
    }, [selectedPO?.id]);

    // Clear dup error when editing receipt changes
    React.useEffect(() => {
        if (editingReceiptId) setReceiptNoDupError(null);
    }, [editingReceiptId]);

    const branchesLabel = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const names = allocs
            .map((a) => String(a?.branch?.name || "").trim())
            .filter(Boolean);
        if (!names.length) return "—";
        return Array.from(new Set(names)).join(", ");
    }, [selectedPO]);

    const progress = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const items = allocs.flatMap((a) => (Array.isArray(a?.items) ? a.items : []));
        const totalExpected = items.reduce((acc, it: any) => acc + (Number(it?.expectedQty) || 0), 0);
        const totalReceived = items.reduce((acc, it: any) => acc + (Number(it?.receivedQty) || 0), 0);
        return { totalExpected, totalReceived };
    }, [selectedPO]);

    const receiptHint = React.useMemo(() => {
        if (!selectedPO) return "";
        const { totalExpected, totalReceived } = progress;
        if (totalExpected <= 0) return "";
        if (totalReceived >= totalExpected) return "This PO appears fully received already.";
        if (totalReceived > 0) return "This will be a partial receiving receipt (continuation is allowed).";
        return "This will start manual receiving for this PO.";
    }, [selectedPO, progress]);

    const handleContinue = () => {
        if (!selectedPO) {
            toast.error("Process aborted", { description: "Select a PO first." });
            return;
        }

        const errs: string[] = [];
        if (!receiptNo.trim()) errs.push("Receipt Number is required.");
        if (!receiptType.trim()) errs.push("Receipt Type is required.");
        if (!receiptDate.trim()) errs.push("Receipt Date is required.");

        // ✅ Date year range validation
        if (receiptDate.trim()) {
            const parsedYear = new Date(receiptDate.trim()).getFullYear();
            if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 3000) {
                errs.push("Invalid year. Must be between 2000 and 3000.");
            }
        }

        // ✅ Block if duplicate receipt number detected (sync check for race conditions)
        const trimmedReceiptNo = receiptNo.trim();
        if (trimmedReceiptNo && Array.isArray(selectedPO?.history)) {
            const exists = selectedPO.history.some((h: { receiptNo: string }) => h.receiptNo === trimmedReceiptNo);
            if (exists) {
                if (!editingReceiptId) {
                    errs.push("Receipt Number already exists for this PO.");
                } else if (editingReceiptId !== trimmedReceiptNo) {
                    errs.push("Cannot rename to an existing receipt number.");
                }
            }
        }

        if (receiptNoDupError && !errs.includes(receiptNoDupError)) {
            errs.push(receiptNoDupError);
        }

        if (errs.length > 0) {
            toast.error("Required fields missing", {
                description: errs.join(" "),
            });
            return;
        }

        onContinue();
    };

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold">Selected PO Details</div>
                    {selectedPO?.status ? (
                        <Badge variant="secondary" className={statusBadgeClasses(selectedPO.status)}>
                            {selectedPO.status}
                        </Badge>
                    ) : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">PO Number</div>
                    <div className="text-right font-medium">{selectedPO?.poNumber ?? "—"}</div>

                    <div className="text-muted-foreground">Supplier</div>
                    <div className="text-right font-medium">{selectedPO?.supplier?.name ?? "—"}</div>

                    <div className="text-muted-foreground">Delivery Branches</div>
                    <div className="text-right font-medium">{branchesLabel}</div>

                    <div className="text-muted-foreground">Receiving Progress</div>
                    <div className="text-right font-medium">
                        {progress.totalReceived} / {progress.totalExpected}
                    </div>
                </div>

                {receiptHint ? (
                    <div className="mt-3 text-xs text-muted-foreground">{receiptHint}</div>
                ) : null}
            </Card>

            {/* ✅ MERGED: Previous Receipts History */}
            {selectedPO?.history && selectedPO.history.length > 0 && (
                <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Previous Receipts History
                    </div>
                    <div className="mt-3 space-y-2">
                        {selectedPO.history.map((h: any) => (
                            <div
                                key={h.receiptNo}
                                className="flex items-center justify-between gap-3 text-xs border-b border-amber-500/10 pb-2 last:border-0 last:pb-0"
                            >
                                <div className="flex flex-col">
                                    <span className="font-mono font-medium text-amber-900 dark:text-amber-100">
                                        {h.receiptNo}
                                    </span>
                                    <span className="text-[10px] text-amber-700/70 dark:text-amber-400/60">
                                        {h.receiptDate || "N/A"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                        {h.itemsCount} {h.itemsCount === 1 ? "item" : "items"}
                                    </span>
                                    {h.isReverted ? (
                                        <>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] uppercase h-4 px-1 leading-none border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                            >
                                                Reverted
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 text-[10px] text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 gap-1"
                                                onClick={() => loadReceipt(h.receiptNo)}
                                            >
                                                <Pencil className="h-3 w-3 mr-0.5" />
                                                Edit
                                            </Button>
                                        </>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] uppercase h-4 px-1 leading-none font-bold",
                                                h.isPosted 
                                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" 
                                                    : "bg-muted text-muted-foreground border-border"
                                            )}
                                        >
                                            {h.isPosted ? "Posted" : "Unposted"}
                                        </Badge>
                                    )}

                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Receipt Details</div>
                    {editingReceiptId && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-orange-700 hover:bg-orange-100" onClick={clearEditingReceiptId}>
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancel Edit
                        </Button>
                    )}
                </div>
                {editingReceiptId ? (
                    <div className="mt-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                        Editing reverted receipt: <span className="font-mono">{editingReceiptId}</span>
                    </div>
                ) : (
                    <div className="mt-1 text-xs text-muted-foreground">
                        Create receipt first, then continue to product verification.
                    </div>
                )}

                <div className="mt-4 grid gap-4 max-w-md">
                    <div className="grid gap-2">
                        <Label>Receipt Number *</Label>
                        <Input 
                            value={receiptNo} 
                            onChange={(e) => {
                                setReceiptNo(e.target.value);
                                setReceiptNoDupError(null);
                            }}
                            onBlur={() => {
                                if (!editingReceiptId) checkReceiptNoDuplicate(receiptNo);
                            }}
                            placeholder="Enter receipt number"
                            className={receiptNoDupError ? "border-destructive focus-visible:ring-destructive" : ""}
                        />
                        {receiptNoDupError && (
                            <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span>{receiptNoDupError}</span>
                            </div>
                        )}
                        {checkingDup && (
                            <div className="text-xs text-muted-foreground mt-1">Checking availability...</div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Receipt Type *</Label>
                        <Select value={receiptType} onValueChange={setReceiptType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {receiptTypes.map((t) => (
                                    <SelectItem key={t.id} value={String(t.id)}>
                                        {t.type} [{t.shortcut}]
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Receipt Date *</Label>
                        <Input
                            type="date"
                            value={receiptDate}
                            max="3000-12-31"
                            min="2000-01-01"
                            onChange={(e) => setReceiptDate(e.target.value)}
                        />
                    </div>

                    <Button type="button" className="w-full" onClick={handleContinue} disabled={!!receiptNoDupError || checkingDup}>
                        Continue Product Verification
                    </Button>
                </div>
            </Card>
        </div>
    );
}
