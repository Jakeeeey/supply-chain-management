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

type ScanRFIDResult = {
    porId: string;
    rfid: string;
    productId: string;
    productName: string;
    sku: string;
    time: string;
    alreadyReceived?: boolean;
};

type ActivityRow = {
    id: string;
    rfid: string;
    productName: string;
    productId: string;
    porId: string;
    time: string;
    status: "ok" | "warn";
};

export type SavedItem = {
    productId: string;
    name: string;
    barcode: string;
    expectedQty: number;
    receivedQtyAtStart: number;
    receivedQtyNow: number;
    rfids: string[];
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

    // rfid scan
    rfid: string;
    setRfid: (v: string) => void;
    scanError: string;

    lastMatched: ScanRFIDResult | null;
    activity: ActivityRow[];

    scannedCountByPorId: Record<string, number>;

    // ✅ NEW: receipt saved signal (non-breaking)
    receiptSaved: ReceiptSavedInfo | null;
    clearReceiptSaved: () => void;

    scanRFID: (rfidOverride?: string) => Promise<void>;
    removeActivity: (id: string) => void;
    saveReceipt: (porMetaData?: Record<string, { lotNo: string; expiryDate: string }>) => Promise<void>;
    savingReceipt: boolean;
    saveError: string;
};

const ReceivingProductsContext = React.createContext<Ctx | null>(null);

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

const API_URL = "/api/scm/supplier-management/receiving-products";

export function ReceivingProductsProvider({ children }: { children: React.ReactNode }) {
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

    // scan
    const [rfid, setRfid] = React.useState("");
    const [scanError, setScanError] = React.useState("");
    const [lastMatched, setLastMatched] = React.useState<ScanRFIDResult | null>(null);
    const [activity, setActivity] = React.useState<ActivityRow[]>([]);
    const [scannedCountByPorId, setScannedCountByPorId] = React.useState<Record<string, number>>({});

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
            setList(Array.isArray(j?.data) ? j.data : []);
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

    const resetSession = React.useCallback(() => {
        setScanError("");
        setSaveError("");
        setLastMatched(null);
        setActivity([]);
        setScannedCountByPorId({});
        setRfid("");
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
        },
        [resetSession]
    );

    const openPO = React.useCallback(
        async (poId: string) => {
            try {
                await openPOById(poId);
            } catch (e: any) {
                setListError(String(e?.message ?? e));
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
            } catch (e: any) {
                setVerifyError(String(e?.message ?? e));
            }
        },
        [list, openPOByBarcode, openPOById]
    );

    const verifyPO = React.useCallback(async () => {
        try {
            await openPOByBarcode(poBarcode);
        } catch (e: any) {
            setVerifyError(String(e?.message ?? e));
        }
    }, [openPOByBarcode, poBarcode]);

    const removeActivity = React.useCallback((id: string) => {
        setActivity((prev) => {
            const row = prev.find((a) => a.id === id);
            if (!row) return prev;

            // If removing an "ok" scan, also decrement the scannedCountByPorId
            if (row.status === "ok" && row.porId) {
                setScannedCountByPorId((counts) => {
                    const current = counts[row.porId] ?? 0;
                    if (current <= 1) {
                        const next = { ...counts };
                        delete next[row.porId];
                        return next;
                    }
                    return { ...counts, [row.porId]: current - 1 };
                });
            }

            return prev.filter((a) => a.id !== id);
        });
    }, []);

    const scanRFID = React.useCallback(async (rfidOverride?: string) => {
        setScanError("");
        setLastMatched(null);

        const poId = selectedPO?.id;
        if (!poId) return setScanError("Select a PO first.");

        const value = (rfidOverride ?? rfid).trim();
        if (!value) return setScanError("Scan RFID first.");

        try {
            // ✅ Block duplicate: if same RFID already verified as "ok" in this session
            const alreadyVerifiedInSession = activity.some(
                (a) => a.rfid === value && a.status === "ok"
            );
            if (alreadyVerifiedInSession) {
                setScanError(
                    `Already scanned RFID (${value.slice(-6).toUpperCase()}) cannot be duplicated.`
                );
                return;
            }

            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "scan_rfid", poId, rfid: value }),
            });
            const j = await asJson(r);
            const data = j?.data as ScanRFIDResult;

            const porId = String(data?.porId ?? "");
            if (!porId) {
                setScanError("Invalid scan result (missing porId).");
                setRfid("");
                return;
            }

            // Already received (posted) — show warn only, do NOT increment count
            if (data?.alreadyReceived) {
                setActivity((prev) => [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        rfid: data.rfid,
                        productName: data.productName,
                        productId: data.productId ?? "",
                        porId,
                        time: data.time || new Date().toISOString(),
                        status: "warn",
                    },
                    ...prev,
                ]);
                setScanError("This RFID is already received. It was not counted again.");
                setRfid("");
                return;
            }

            setScannedCountByPorId((prev) => ({
                ...(prev ?? {}),
                [porId]: (prev?.[porId] ?? 0) + 1,
            }));

            setActivity((prev) => [
                {
                    id: `${Date.now()}-${Math.random()}`,
                    rfid: data.rfid,
                    productName: data.productName,
                    productId: data.productId ?? "",
                    porId,
                    time: data.time || new Date().toISOString(),
                    status: "ok",
                },
                ...prev,
            ]);

            setLastMatched(data);
            setRfid("");
        } catch (e: any) {
            setScanError(String(e?.message ?? e));
        }
    }, [selectedPO, rfid, activity]);

    const saveReceipt = React.useCallback(async (porMetaData?: Record<string, { lotNo: string; expiryDate: string }>) => {
        setSaveError("");

        const poId = selectedPO?.id;
        if (!poId) return setSaveError("Select a PO first.");
        if (!receiptNo.trim()) return setSaveError("Receipt Number is required.");
        if (!receiptType.trim()) return setSaveError("Receipt Type is required.");
        if (!receiptDate.trim()) return setSaveError("Receipt Date is required.");

        const counts = scannedCountByPorId ?? {};
        if (!Object.keys(counts).length) return setSaveError("Scan at least 1 RFID before saving.");

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
            const allItems = allocs.flatMap((a: any) => Array.isArray(a?.items) ? a.items : []);
            
            // Calculate if fully received across all items
            const countsMap = counts || {};
            const isFullyReceivedNow = allItems.every((it: any) => {
                const scannedNow = Number(countsMap[it.id] || 0);
                return (Number(it.receivedQty) + scannedNow) >= Number(it.expectedQty);
            });

            const savedItems: SavedItem[] = allItems.map((it: any) => {
                const scannedNow = Number(countsMap[it.id] || 0);
                const itemRfids = activity
                    .filter((a: any) => a.status === "ok" && String(a.porId) === String(it.id))
                    .map((a: any) => a.rfid);

                return {
                    productId: it.productId,
                    name: it.name,
                    barcode: it.barcode,
                    expectedQty: Number(it.expectedQty),
                    receivedQtyAtStart: Number(it.receivedQty) - scannedNow, // already matched in detail
                    receivedQtyNow: scannedNow,
                    rfids: Array.from(new Set(itemRfids))
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
        } catch (e: any) {
            setSaveError(String(e?.message ?? e));
        } finally {
            setSavingReceipt(false);
        }
    }, [selectedPO, receiptNo, receiptType, receiptDate, scannedCountByPorId, refreshList, resetSession]);

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

        rfid,
        setRfid,
        scanError,

        lastMatched,
        activity,

        scannedCountByPorId: scannedCountByPorId ?? {},

        receiptSaved,
        clearReceiptSaved,

        scanRFID,
        removeActivity,
        saveReceipt,
        savingReceipt,
        saveError,
    };

    return <ReceivingProductsContext.Provider value={value}>{children}</ReceivingProductsContext.Provider>;
}

export function useReceivingProducts() {
    const ctx = React.useContext(ReceivingProductsContext);
    if (!ctx) throw new Error("useReceivingProducts must be used within ReceivingProductsProvider");
    return ctx;
}
