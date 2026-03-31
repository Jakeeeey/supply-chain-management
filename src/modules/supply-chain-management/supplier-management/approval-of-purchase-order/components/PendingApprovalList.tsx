"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Props = {
    items: PendingApprovalPO[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    disabled?: boolean;
};

// ✅ default to 5 per page
const DEFAULT_PAGE_SIZE = 5;

function safeStr(v: unknown, fallback = "—") {
    const s = String(v ?? "").trim();
    return s ? s : fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    return "—";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const [searchQuery, setSearchQuery] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

    // ✅ Filtered list based on search
    const filteredItems = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return items ?? [];
        return (items ?? []).filter((x) => {
            const row = x as Record<string, unknown>;
            const poNo = safeStr(row.poNumber ?? row.purchase_order_no ?? "").toLowerCase();
            const supplier = supplierLabelFromRow(row).toLowerCase();
            const br = branchLabelFromRow(row).toLowerCase();
            const date = safeStr(row.date ?? row.date_encoded ?? "").toLowerCase();
            return poNo.includes(q) || supplier.includes(q) || br.includes(q) || date.includes(q);
        });
    }, [items, searchQuery]);

    const totalPages = React.useMemo(
        () => Math.max(1, Math.ceil((filteredItems?.length ?? 0) / pageSize)),
        [filteredItems?.length, pageSize]
    );

    React.useEffect(() => {
        setPage((p) => Math.min(Math.max(1, p), totalPages));
    }, [totalPages, filteredItems?.length]);

    const paginated = React.useMemo(() => {
        const start = (page - 1) * pageSize;
        return (filteredItems ?? []).slice(start, start + pageSize);
    }, [filteredItems, page, pageSize]);

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
                        {filteredItems.length} filtered / {items?.length ?? 0} total
                    </div>
                </div>

                <Badge variant="outline" className="text-[10px] font-black uppercase">
                    Page {page} of {totalPages}
                </Badge>
            </div>

            <div className="p-3 pb-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search PO#, Supplier, Branch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl shadow-sm border-border bg-background"
                    />
                </div>
            </div>

            <div className={cn("p-3 space-y-2", isDisabled ? "opacity-70 pointer-events-none" : "")}>
                {paginated.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No pending purchase orders.
                    </div>
                ) : (
                    paginated.map((x) => {
                        const row = x as Record<string, unknown>;

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

            {/* ✅ Standard Pagination Footer */}
            {items.length > 0 ? (
                <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">
                                Rows per page
                            </span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(v) => {
                                    setPageSize(Number(v));
                                    setPage(1);
                                }}
                                disabled={isDisabled}
                            >
                                <SelectTrigger className="h-7 w-[70px] text-[10px] font-bold rounded-lg border-border bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[5, 10, 20, 50].map((size) => (
                                        <SelectItem key={size} value={String(size)} className="text-[10px] font-bold">
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                            {page} of {totalPages}
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="pt-1 border-t border-border/40">
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
                    )}
                </div>
            ) : null}
        </div>
    );
}
