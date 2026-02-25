// providers/PostingOfProvider.tsx
"use client";

import * as React from "react";
import type { POListItem, PurchaseOrder } from "../types";

// ✅ Use the existing global toaster (Sonner) — do NOT mount another Toaster here
import { toast } from "sonner";

const API = "/api/scm/supplier-management/posting-of-po";

async function asJson(r: Response) {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || j?.errors?.[0]?.message || `Request failed: ${r.status}`);
    return j?.data;
}

type Ctx = {
    // list
    list: POListItem[];
    listLoading: boolean;
    listError: string;
    refreshList: () => Promise<void>;

    // pagination (requested)
    q: string;
    setQ: (v: string) => void;
    page: number;
    setPage: (v: number) => void;
    pageSize: 3 | 5;
    setPageSize: (v: 3 | 5) => void;

    // selection
    selectedPO: PurchaseOrder | null;
    openPO: (poId: string) => Promise<void>;

    // posting actions
    posting: boolean;
    postError: string;
    postReceipt: (poId: string, receiptNo: string) => Promise<void>;
    postAllReceipts: (poId: string) => Promise<void>;

    // success banner (no global toast dependency)
    successMsg: string;
    clearSuccess: () => void;
};

const PostingOfPoContext = React.createContext<Ctx | null>(null);

export function PostingOfPoProvider({ children }: { children: React.ReactNode }) {
    const [list, setList] = React.useState<POListItem[]>([]);
    const [listLoading, setListLoading] = React.useState(false);
    const [listError, setListError] = React.useState("");

    const [selectedPO, setSelectedPO] = React.useState<PurchaseOrder | null>(null);

    const [q, setQ] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState<3 | 5>(5);

    const [posting, setPosting] = React.useState(false);
    const [postError, setPostError] = React.useState("");

    const [successMsg, setSuccessMsg] = React.useState("");
    const clearSuccess = React.useCallback(() => setSuccessMsg(""), []);

    const refreshList = React.useCallback(async () => {
        setListLoading(true);
        setListError("");
        try {
            const r = await fetch(API, { cache: "no-store" });
            const data = await asJson(r);
            setList(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setListError(String(e?.message ?? e));
            setList([]);
        } finally {
            setListLoading(false);
        }
    }, []);

    React.useEffect(() => {
        refreshList();
    }, [refreshList]);

    const openPO = React.useCallback(
        async (poId: string) => {
            setListError("");
            setPostError("");
            clearSuccess();
            const id = String(poId ?? "").trim();
            if (!id) return;

            try {
                const r = await fetch(API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "open_po", poId: id }),
                });
                const data = await asJson(r);
                setSelectedPO((data ?? null) as PurchaseOrder | null);
            } catch (e: any) {
                setListError(String(e?.message ?? e));
            }
        },
        [clearSuccess]
    );

    const postReceipt = React.useCallback(
        async (poId: string, receiptNo: string) => {
            setPosting(true);
            setPostError("");
            clearSuccess();

            try {
                const r = await fetch(API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "post_receipt", poId, receiptNo }),
                });
                await asJson(r);

                // ✅ Toast success (global toaster will render it)
                toast.success("Receipt posted successfully!", {
                    description: `Receipt ${receiptNo} has been posted.`,
                });

                // keep existing banner (don’t remove)
                setSuccessMsg("Receipt posted successfully.");

                await refreshList();
                await openPO(poId);
            } catch (e: any) {
                const msg = String(e?.message ?? e);

                toast.error("Failed to post receipt", { description: msg });
                setPostError(msg);
            } finally {
                setPosting(false);
            }
        },
        [openPO, refreshList, clearSuccess]
    );

    const postAllReceipts = React.useCallback(
        async (poId: string) => {
            setPosting(true);
            setPostError("");
            clearSuccess();

            try {
                const r = await fetch(API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "post_all", poId }),
                });
                await asJson(r);

                // ✅ Toast success
                toast.success("Receipts posted successfully!", {
                    description: "All receipts for this PO have been posted.",
                });

                // keep existing banner (don’t remove)
                setSuccessMsg("All receipts posted successfully.");

                await refreshList();
                await openPO(poId);
            } catch (e: any) {
                const msg = String(e?.message ?? e);

                toast.error("Failed to post receipts", { description: msg });
                setPostError(msg);
            } finally {
                setPosting(false);
            }
        },
        [openPO, refreshList, clearSuccess]
    );

    const value: Ctx = {
        list,
        listLoading,
        listError,
        refreshList,

        q,
        setQ,
        page,
        setPage,
        pageSize,
        setPageSize,

        selectedPO,
        openPO,

        posting,
        postError,
        postReceipt,
        postAllReceipts,

        successMsg,
        clearSuccess,
    };

    return <PostingOfPoContext.Provider value={value}>{children}</PostingOfPoContext.Provider>;
}

export function usePostingOfPo() {
    const ctx = React.useContext(PostingOfPoContext);
    if (!ctx) throw new Error("usePostingOfPo must be used within PostingOfPoProvider");
    return ctx;
}
