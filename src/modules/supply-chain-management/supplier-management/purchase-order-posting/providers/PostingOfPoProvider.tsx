// providers/PostingOfProvider.tsx
"use client";

import * as React from "react";
import type { POListItem, PurchaseOrder, DiscountType } from "../types";

// ✅ Use the existing global toaster (Sonner) — do NOT mount another Toaster here
import { toast } from "sonner";

const API = "/api/scm/supplier-management/purchase-order-posting";

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
    setPage: React.Dispatch<React.SetStateAction<number>>;
    pageSize: number;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;

    // selection
    selectedPO: PurchaseOrder | null;
    openPO: (poId: string) => Promise<void>;

    // posting actions
    posting: boolean;
    postError: string;
    postReceipt: (poId: string, receiptNo: string) => Promise<void>;
    postAllReceipts: (poId: string) => Promise<void>;
    revertReceipt: (poId: string, receiptNo: string) => Promise<void>;
    reverting: boolean;

    // success banner (no global toast dependency)
    successMsg: string;
    clearSuccess: () => void;

    // config
    discountTypes: DiscountType[];
};

const PostingOfPoContext = React.createContext<Ctx | null>(null);

export function PostingOfPoProvider({ children }: { children: React.ReactNode }) {
    const [list, setList] = React.useState<POListItem[]>([]);
    const [listLoading, setListLoading] = React.useState(false);
    const [listError, setListError] = React.useState("");

    const [selectedPO, setSelectedPO] = React.useState<PurchaseOrder | null>(null);

    const [q, setQ] = React.useState("");
    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState<number>(5);

    const [posting, setPosting] = React.useState(false);
    const [postError, setPostError] = React.useState("");

    const [reverting, setReverting] = React.useState(false);

    const [successMsg, setSuccessMsg] = React.useState("");
    const clearSuccess = React.useCallback(() => setSuccessMsg(""), []);

    const [discountTypes, setDiscountTypes] = React.useState<DiscountType[]>([]);

    const refreshList = React.useCallback(async () => {
        setListLoading(true);
        setListError("");
        try {
            const r = await fetch(API, { cache: "no-store" });
            const data = await asJson(r);
            setList(Array.isArray(data) ? data : []);
        } catch (e: unknown) {
            const msg = String((e as Error)?.message ?? e);
            if (msg.trim().toLowerCase() !== "fetch failed") {
                setListError(msg);
            }
            setList([]);
        } finally {
            setListLoading(false);
        }
    }, []);

    React.useEffect(() => {
        refreshList();

        // also fetch discount types
        fetch("/api/scm/supplier-management/purchase-order-posting/discount-types")
            .then(r => r.json())
            .then(j => {
                if (j?.data && Array.isArray(j.data)) {
                    // Map API fields `discount_type` -> `name` and `total_percent` -> `percent`
                    const mapped = j.data.map((d: { id?: string | number; discount_type?: string; total_percent?: string | number }) => ({
                        id: String(d.id),
                        name: String(d.discount_type || ""),
                        percent: Number(d.total_percent || 0),
                        active: true
                    }));
                    setDiscountTypes(mapped);
                }
            })
            .catch(() => {});
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
            } catch (e: unknown) {
                const msg = String((e as Error)?.message ?? e);
                if (msg.trim().toLowerCase() !== "fetch failed") {
                    setListError(msg);
                }
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
            } catch (e: unknown) {
                const err = e as Error;
                const msg = String(err?.message ?? err);

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
            } catch (e: unknown) {
                const err = e as Error;
                const msg = String(err?.message ?? err);

                toast.error("Failed to post receipts", { description: msg });
                setPostError(msg);
            } finally {
                setPosting(false);
            }
        },
        [openPO, refreshList, clearSuccess]
    );

    const revertReceipt = React.useCallback(
        async (poId: string, receiptNo: string) => {
            setReverting(true);
            setPostError("");
            clearSuccess();

            try {
                const r = await fetch(API, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "revert_receipt", poId, receiptNo }),
                });
                await asJson(r);

                toast.success("Receipt reverted successfully!", {
                    description: `Receipt ${receiptNo} has been returned to receiving.`,
                });

                setSuccessMsg(`Receipt ${receiptNo} reverted to receiving.`);

                await refreshList();
                await openPO(poId);
            } catch (e: unknown) {
                const err = e as Error;
                const msg = String(err?.message ?? err);

                toast.error("Failed to revert receipt", { description: msg });
                setPostError(msg);
            } finally {
                setReverting(false);
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
        revertReceipt,
        reverting,

        successMsg,
        clearSuccess,
        discountTypes,
    };

    return <PostingOfPoContext.Provider value={value}>{children}</PostingOfPoContext.Provider>;
}

export function usePostingOfPo() {
    const ctx = React.useContext(PostingOfPoContext);
    if (!ctx) throw new Error("usePostingOfPo must be used within PostingOfPoProvider");
    return ctx;
}
