"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PendingApprovalPO } from "../types";

type Props = {
    items: PendingApprovalPO[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    disabled?: boolean;
};

const PAGE_SIZE = 5;

function safeStr(v: any, fallback = "—") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}

function branchLabel(branch: any) {
    if (!branch) return "—";

    if (Array.isArray(branch)) {
        if (!branch.length) return "—";
        const labels = branch
            .map((b) => {
                const code = safeStr(b?.branch_code ?? "");
                const name = safeStr(b?.branch_name ?? b?.branch_description ?? "");
                if (code !== "—" && name !== "—") return `${code} — ${name}`;
                if (name !== "—") return name;
                return "—";
            })
            .filter((x) => x !== "—");

        if (!labels.length) return "—";
        if (labels.length <= 2) return labels.join(", ");
        return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
    }

    const code = safeStr(branch?.branch_code ?? "");
    const name = safeStr(branch?.branch_name ?? branch?.branch_description ?? "");
    if (code !== "—" && name !== "—") return `${code} — ${name}`;
    if (name !== "—") return name;

    // if numeric/raw, do NOT show id
    return "—";
}

/** ✅ prefers helper text from API, otherwise uses expanded object */
function branchLabelFromRow(row: any) {
    // From updated approval-of-po route (recommended)
    const helper = safeStr(row?.branch_name_text ?? row?.branchNameText ?? row?.branchName ?? "", "");
    const helperCode = safeStr(row?.branch_code_text ?? row?.branchCodeText ?? row?.branchCode ?? "", "");

    if (helper) {
        // If code also provided, show code — name
        if (helperCode) return `${helperCode} — ${helper}`;
        return helper;
    }

    // Expanded object/array support
    return branchLabel(row?.branch_id);
}

function supplierLabelFromRow(row: any) {
    // From updated approval-of-po route (recommended)
    const helper = safeStr(row?.supplier_name_text ?? "", "");
    if (helper) return helper;

    // Expanded object case
    return safeStr(
        row?.supplier_name?.supplier_name ??
        row?.supplier_name?.name ??
        row?.supplierName ??
        row?.supplier ??
        "—"
    );
}

export default function PendingApprovalList({ items, selectedId, onSelect, disabled }: Props) {
    const [page, setPage] = React.useState(1);

    const totalPages = React.useMemo(
        () => Math.max(1, Math.ceil((items?.length ?? 0) / PAGE_SIZE)),
        [items?.length]
    );

    React.useEffect(() => {
        setPage((p) => Math.min(Math.max(1, p), totalPages));
    }, [totalPages, items?.length]);

    const paginated = React.useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return (items ?? []).slice(start, start + PAGE_SIZE);
    }, [items, page]);

    const dotPages = React.useMemo(() => {
        const total = totalPages;
        const current = Math.min(Math.max(1, page), total);
        const maxDots = 5;
        const half = Math.floor(maxDots / 2);

        let start = Math.max(1, current - half);
        let end = Math.min(total, start + maxDots - 1);
        start = Math.max(1, end - maxDots + 1);

        const pages: number[] = [];
        for (let p = start; p <= end; p++) pages.push(p);
        return pages;
    }, [page, totalPages]);

    return (
        <div className="min-w-0 border border-border rounded-xl bg-background shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-black text-foreground uppercase tracking-tight">
                        Pending for Approval
                    </div>
                    <div className="text-[11px] text-muted-foreground">{items?.length ?? 0} total</div>
                </div>

                <Badge variant="outline" className="text-[10px] font-black uppercase">
                    Page {page} of {totalPages}
                </Badge>
            </div>

            <div className={cn("p-3 space-y-2", disabled ? "opacity-70 pointer-events-none" : "")}>
                {paginated.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No pending purchase orders.
                    </div>
                ) : (
                    paginated.map((x) => {
                        const row: any = x;

                        const id = String(row.id ?? row.purchase_order_id ?? "");
                        const poNo = safeStr(row.poNumber ?? row.purchase_order_no ?? "—");
                        const date = safeStr(row.date ?? row.date_encoded ?? "—");

                        const supplier = supplierLabelFromRow(row);
                        const br = branchLabelFromRow(row);

                        const total = Number(row.totalAmount ?? row.total_amount ?? row.total ?? 0) || 0;

                        const selected = selectedId === id;

                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onSelect(id)}
                                className={cn(
                                    "w-full text-left rounded-lg border border-border bg-background p-3 transition",
                                    "hover:bg-muted/40",
                                    selected ? "ring-2 ring-primary/40 border-primary/50" : ""
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 space-y-1">
                                        <div className="text-xs font-black text-foreground truncate">{poNo}</div>

                                        <div className="text-[11px] text-muted-foreground truncate">
                                            {supplier}
                                        </div>

                                        <div className="text-[11px] text-muted-foreground truncate">
                                            {br}
                                        </div>

                                        <div className="text-[10px] text-muted-foreground truncate">{date}</div>
                                    </div>

                                    <Badge variant="secondary" className="text-[10px] font-black">
                                        {total.toLocaleString()}
                                    </Badge>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {items.length > PAGE_SIZE ? (
                <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-[10px] font-black uppercase"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Prev
                    </Button>

                    <div className="flex gap-1.5">
                        {dotPages.map((p) => (
                            <div
                                key={p}
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    page === p ? "bg-primary" : "bg-border"
                                )}
                            />
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-[10px] font-black uppercase"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
