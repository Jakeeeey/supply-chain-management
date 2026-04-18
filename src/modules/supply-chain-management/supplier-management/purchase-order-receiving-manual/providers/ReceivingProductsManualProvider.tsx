"use client";

import * as React from "react";

type POStatus = "OPEN" | "PARTIAL" | "CLOSED";

export type ReceivingListItem = {
    id: string;
    poNumber: string;
    supplierName: string;
    status: POStatus;
    totalAmount: number;
    currency: "PHP";
    itemsCount: number;
    branchesCount: number;
};

export type ReceivingPOItem = {
    id: string; // porId
    porId?: string;
    productId: string;
    name: string;
    barcode: string;
    uom: string;
    expectedQty: number;
    receivedQty: number;
    requiresRfid: true;
    taggedQty: number;
    rfids?: string[];
    isReceived?: boolean;
    unitPrice?: number;
    discountType?: string;
    discountAmount?: number;
    netAmount?: number;
    lot_no?: string;
    expiry_date?: string;
};

export type ReceivingPODetail = {
    id: string;
    poNumber: string;
    supplier: { id: string; name: string };
    status: POStatus;
    totalAmount: number;
    currency: "PHP";
    allocations: Array<{
        branch: { id: string; name: string };
        items: ReceivingPOItem[];
    }>;
    createdAt: string;
};



export type SavedItem = {
    productId: string;
    name: string;
    barcode: string;
    expectedQty: number;
    receivedQtyAtStart: number;
    receivedQtyNow: number;
    rfids?: string[]; // Kept for compatibility but unused

};

export type ReceiptSavedInfo = {
    poId: string;
    receiptNo: string;
    receiptType: string;
    receiptDate: string;
    items: SavedItem[];
    isFullyReceived: boolean;
    savedAt: number;
};

type Ctx = {
    // ✅ list (keep both naming styles)
    list: ReceivingListItem[];
    poList: ReceivingListItem[];

    listLoading: boolean;
    listError: string;
    refreshList: () => Promise<void>;

    // ✅ selection
    selectedPO: ReceivingPODetail | null;

    // ✅ open helpers (keep both)
    openPO: (poId: string) => Promise<void>;
    selectAndVerifyPO: (a: string, b?: string) => Promise<void>;

    // Scan PO step compat
    poBarcode: string;
    setPoBarcode: (v: string) => void;
    verifyPO: () => Promise<void>;
    verifyError: string;

    // receipt
    receiptNo: string;
    setReceiptNo: (v: string) => void;
    receiptType: string;
    setReceiptType: (v: string) => void;
    receiptDate: string;
    setReceiptDate: (v: string) => void;

    manualCounts: Record<string, number>;
    setManualCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;

    // ✅ NEW: receipt saved signal (non-breaking)
    receiptSaved: ReceiptSavedInfo | null;
    clearReceiptSaved: () => void;

    saveReceipt: (porMetaData?: Record<string, { lotNo: string; expiryDate: string }>) => Promise<void>;
    savingReceipt: boolean;
    saveError: string;
};

const ReceivingProductsManualContext = React.createContext<Ctx | null>(null);

async function asJson(r: Response) {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        throw new Error(j?.error || j?.errors?.[0]?.message || `Request failed: ${r.status}`);
    }
    return j;
}

function todayYMD() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function genReceiptNo() {
    return `REC-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

const API_URL = "/api/scm/supplier-management/purchase-order-receiving-manual";



export function ReceivingProductsManualProvider({ children }: { children: React.ReactNode }) {
    const [list, setList] = React.useState<ReceivingListItem[]>([]);
    const [listLoading, setListLoading] = React.useState(false);
    const [listError, setListError] = React.useState("");

    const [selectedPO, setSelectedPO] = React.useState<ReceivingPODetail | null>(null);

    // step 0 compat
    const [poBarcode, setPoBarcode] = React.useState("");
    const [verifyError, setVerifyError] = React.useState("");

    // receipt
    const [receiptNo, setReceiptNo] = React.useState("");
    const [receiptType, setReceiptType] = React.useState("");
    const [receiptDate, setReceiptDate] = React.useState(todayYMD());

    const [manualCounts, setManualCounts] = React.useState<Record<string, number>>({});

    const [savingReceipt, setSavingReceipt] = React.useState(false);
    const [saveError, setSaveError] = React.useState("");

    // ✅ NEW: success signal for UI
    const [receiptSaved, setReceiptSaved] = React.useState<ReceiptSavedInfo | null>(null);
    const clearReceiptSaved = React.useCallback(() => setReceiptSaved(null), []);

    const refreshList = React.useCallback(async () => {
        setListLoading(true);
        setListError("");
        try {
            const r = await fetch(API_URL, { cache: "no-store" });
            const j = await asJson(r);
            setList(Array.isArray((j as { data: ReceivingListItem[] })?.data) ? (j as { data: ReceivingListItem[] }).data : []);
        } catch (e: unknown) {
            const msg = (e as Error)?.message ?? String(e);
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
    }, [refreshList]);

    const resetSession = React.useCallback(() => {
        setSaveError("");
        setManualCounts({});
    }, []);

    const openPOById = React.useCallback(
        async (poId: string) => {
            setVerifyError("");
            setListError("");
            resetSession();
            setReceiptSaved(null);

            // ✅ avoid stale PO if server blocks or errors
            setSelectedPO(null);


            const id = String(poId ?? "").trim();
            if (!id) return;

            try {
                const r = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "open_po", poId: id }),
                });
                const j = await asJson(r);

                const detail = (j?.data ?? null) as ReceivingPODetail | null;
                setSelectedPO(detail);

                setReceiptDate(todayYMD());
                setReceiptNo(genReceiptNo());
                setReceiptType("");

                setPoBarcode(detail?.poNumber ?? "");
            } catch (e: unknown) {
                const msg = (e as Error)?.message ?? String(e);
                if (msg.trim().toLowerCase() !== "fetch failed") {
                    setVerifyError(msg);
                }
            }
        },
        [resetSession]
    );

    const openPOByBarcode = React.useCallback(
        async (barcode: string) => {
            setVerifyError("");
            setListError("");
            resetSession();
            setReceiptSaved(null);

            // ✅ avoid stale PO if server blocks or errors
            setSelectedPO(null);

            const code = String(barcode ?? "").trim();
            if (!code) {
                setVerifyError("Enter/select PO first.");
                return;
            }

            try {
                const r = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "verify_po", barcode: code }),
                });
                const j = await asJson(r);

                const detail = (j?.data ?? null) as ReceivingPODetail | null;
                setSelectedPO(detail);

                setReceiptDate(todayYMD());
                setReceiptNo(genReceiptNo());
                setReceiptType("");

                setPoBarcode(code);
            } catch (e: unknown) {
                const msg = (e as Error)?.message ?? String(e);
                if (msg.trim().toLowerCase() !== "fetch failed") {
                    setVerifyError(msg);
                }
            }
        },
        [resetSession]
    );

    const openPO = React.useCallback(
        async (poId: string) => {
            try {
                await openPOById(poId);
            } catch (e: unknown) {
                setListError((e as Error)?.message ?? String(e));
            }
        },
        [openPOById]
    );

    const selectAndVerifyPO = React.useCallback(
        async (a: string, b?: string) => {
            try {
                const first = String(a ?? "").trim();
                const second = typeof b === "string" ? String(b).trim() : "";

                if (second) {
                    setPoBarcode(second);
                    await openPOById(first);
                    return;
                }

                const hitById = (list ?? []).find((x) => String(x?.id) === first);
                if (hitById) {
                    setPoBarcode(hitById.poNumber);
                    await openPOById(hitById.id);
                    return;
                }

                setPoBarcode(first);
                await openPOByBarcode(first);
            } catch (e: unknown) {
                setVerifyError((e as Error)?.message ?? String(e));
            }
        },
        [list, openPOByBarcode, openPOById]
    );

    const verifyPO = React.useCallback(async () => {
        try {
            await openPOByBarcode(poBarcode);
        } catch (e: unknown) {
            setVerifyError((e as Error)?.message ?? String(e));
        }
    }, [openPOByBarcode, poBarcode]);



    const saveReceipt = React.useCallback(async (porMetaData?: Record<string, { lotNo: string; expiryDate: string }>) => {
        setSaveError("");

        const poId = selectedPO?.id;
        if (!poId) return setSaveError("Select a PO first.");
        if (!receiptNo.trim()) return setSaveError("Receipt Number is required.");
        if (!receiptType.trim()) return setSaveError("Receipt Type is required.");
        if (!receiptDate.trim()) return setSaveError("Receipt Date is required.");

        const counts = manualCounts ?? {};
        if (!Object.keys(counts).length || Object.values(counts).every(c => c <= 0)) return setSaveError("Enter at least 1 count before saving.");

        setSavingReceipt(true);
        try {
            const oldReceiptNo = receiptNo.trim();

            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save_receipt",
                    poId,
                    receiptNo: oldReceiptNo,
                    receiptType: receiptType.trim(),
                    receiptDate: receiptDate.trim(),
                    porCounts: counts,
                    porMetaData: porMetaData ?? {},
                }),
            });
            const j = await asJson(r);

            const detail = j?.data?.detail ?? null;
            if (detail) {
                setSelectedPO(detail);
                setPoBarcode(detail?.poNumber ?? "");
            }

            // ✅ gather items for printing (All items in PO, with their current statuses)
            const allocs = Array.isArray(detail?.allocations) ? detail.allocations : [];
            const allItems = allocs.flatMap((a: unknown) => {
                const aObj = a as Record<string, unknown>;
                return Array.isArray(aObj?.items) ? aObj.items : [];
            });
            
            // Calculate if fully received across all items
            const countsMap = counts || {};
            const isFullyReceivedNow = allItems.every((it: unknown) => {
                const itObj = it as ReceivingPOItem;
                const scannedNow = Number(countsMap[itObj.id] || 0);
                return (Number(itObj.receivedQty) + scannedNow) >= Number(itObj.expectedQty);
            });
            
            const savedItems: SavedItem[] = allItems.map((it: unknown) => {
                const itObj = it as ReceivingPOItem;
                const scannedNow = Number(countsMap[itObj.id] || 0);
                return {
                    productId: String(itObj.productId),
                    name: String(itObj.name),
                    barcode: String(itObj.barcode),
                    expectedQty: Number(itObj.expectedQty),
                    receivedQtyAtStart: Number(itObj.receivedQty) - scannedNow,
                    receivedQtyNow: scannedNow,
                    rfids: []
                };
            });


            // ✅ mark success for UI
            setReceiptSaved({
                poId: String(poId),
                receiptNo: oldReceiptNo,
                receiptType: receiptType.trim(),
                receiptDate: receiptDate.trim(),
                items: savedItems,
                isFullyReceived: isFullyReceivedNow,
                savedAt: Date.now()
            });

            refreshList();
            resetSession();

            // ✅ IMPORTANT: prepare a new receipt immediately (supports multiple receipts)
            setReceiptDate(todayYMD());
            setReceiptNo(genReceiptNo());
            setReceiptType("");
        } catch (e: unknown) {
            setSaveError((e as Error)?.message ?? String(e));
        } finally {
            setSavingReceipt(false);
        }
    }, [selectedPO, receiptNo, receiptType, receiptDate, manualCounts, refreshList, resetSession]);

    const value: Ctx = {
        list,
        poList: list,

        listLoading,
        listError,
        refreshList,

        selectedPO,

        openPO,
        selectAndVerifyPO,

        poBarcode,
        setPoBarcode: (v: string) => setPoBarcode(v),
        verifyPO,
        verifyError,

        receiptNo,
        setReceiptNo,
        receiptType,
        setReceiptType,
        receiptDate,
        setReceiptDate,

        manualCounts: manualCounts ?? {},
        setManualCounts,

        receiptSaved,
        clearReceiptSaved,

        saveReceipt,
        savingReceipt,
        saveError,
    };

    return <ReceivingProductsManualContext.Provider value={value}>{children}</ReceivingProductsManualContext.Provider>;
}

export function useReceivingProductsManual() {
    const ctx = React.useContext(ReceivingProductsManualContext);
    if (!ctx) throw new Error("useReceivingProductsManual must be used within ReceivingProductsManualProvider");
    return ctx;
}
