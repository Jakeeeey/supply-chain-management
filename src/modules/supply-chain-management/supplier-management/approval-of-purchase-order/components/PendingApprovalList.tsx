"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PendingApprovalPO } from "../types";

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

type Props = {
    items: PendingApprovalPO[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    disabled?: boolean;
};

// ✅ only show 3 per page
const PAGE_SIZE = 3;

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
    const helper = safeStr(
        row?.branch_name_text ?? row?.branchNameText ?? row?.branchName ?? "",
        ""
    );
    const helperCode = safeStr(
        row?.branch_code_text ?? row?.branchCodeText ?? row?.branchCode ?? "",
        ""
    );

    if (helper) {
        if (helperCode) return `${helperCode} — ${helper}`;
        return helper;
    }

    return branchLabel(row?.branch_id);
}

function supplierLabelFromRow(row: any) {
    const helper = safeStr(row?.supplier_name_text ?? "", "");
    if (helper) return helper;

    return safeStr(
        row?.supplier_name?.supplier_name ??
        row?.supplier_name?.name ??
        row?.supplierName ??
        row?.supplier ??
        "—"
    );
}

function getPaginationModel(totalPages: number, currentPage: number) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1) as Array<
            number | "ellipsis"
        >;
    }

    const items: Array<number | "ellipsis"> = [];
    items.push(1);

    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);

    if (left > 2) items.push("ellipsis");

    for (let p = left; p <= right; p++) items.push(p);

    if (right < totalPages - 1) items.push("ellipsis");

    items.push(totalPages);
    return items;
}

export default function PendingApprovalList({
                                                items,
                                                selectedId,
                                                onSelect,
                                                disabled,
                                            }: Props) {
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

    const paginationModel = React.useMemo(
        () => getPaginationModel(totalPages, page),
        [totalPages, page]
    );

    const isDisabled = Boolean(disabled);

    const goToPage = React.useCallback(
        (p: number) => {
            if (isDisabled) return;
            const next = Math.min(Math.max(1, p), totalPages);
            setPage(next);
        },
        [isDisabled, totalPages]
    );

    const onPrev = React.useCallback(() => {
        if (isDisabled) return;
        setPage((p) => Math.max(1, p - 1));
    }, [isDisabled]);

    const onNext = React.useCallback(() => {
        if (isDisabled) return;
        setPage((p) => Math.min(totalPages, p + 1));
    }, [isDisabled, totalPages]);

    return (
        <div className="min-w-0 border border-border rounded-xl bg-background shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-black text-foreground uppercase tracking-tight">
                        Pending for Approval
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {items?.length ?? 0} total
                    </div>
                </div>

                <Badge variant="outline" className="text-[10px] font-black uppercase">
                    Page {page} of {totalPages}
                </Badge>
            </div>

            <div className={cn("p-3 space-y-2", isDisabled ? "opacity-70 pointer-events-none" : "")}>
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

                                        <div className="text-[11px] text-muted-foreground truncate">{supplier}</div>

                                        <div className="text-[11px] text-muted-foreground truncate">{br}</div>

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

            {/* ✅ Shadcn Pagination (only show when needed) */}
            {items.length > PAGE_SIZE ? (
                <div className="px-4 py-3 border-t border-border bg-muted/20">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    aria-disabled={isDisabled || page === 1}
                                    className={cn(isDisabled || page === 1 ? "pointer-events-none opacity-50" : "")}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (page === 1 || isDisabled) return;
                                        onPrev();
                                    }}
                                />
                            </PaginationItem>

                            {paginationModel.map((it, idx) => {
                                if (it === "ellipsis") {
                                    return (
                                        <PaginationItem key={`el-${idx}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    );
                                }

                                const p = it;
                                const active = p === page;

                                return (
                                    <PaginationItem key={p}>
                                        <PaginationLink
                                            href="#"
                                            isActive={active}
                                            aria-disabled={isDisabled}
                                            className={cn(isDisabled ? "pointer-events-none opacity-60" : "")}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                goToPage(p);
                                            }}
                                        >
                                            {p}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    aria-disabled={isDisabled || page >= totalPages}
                                    className={cn(
                                        isDisabled || page >= totalPages ? "pointer-events-none opacity-50" : ""
                                    )}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (page >= totalPages || isDisabled) return;
                                        onNext();
                                    }}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            ) : null}
        </div>
    );
}
