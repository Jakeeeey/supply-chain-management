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
    time: string;
    status: "ok" | "warn";
};

type Ctx = {
    // ✅ list (keep both naming styles to avoid breaking UI)
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

    // step 0 compat (Scan PO)
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
    strict: boolean;
    setStrict: (v: boolean) => void;
    scanError: string;

    lastMatched: ScanRFIDResult | null;
    activity: ActivityRow[];

    scannedCountByPorId: Record<string, number>;

    scanRFID: () => Promise<void>;
    saveReceipt: () => Promise<void>;
    savingReceipt: boolean;
    saveError: string;
};

const ReceivingProductsContext = React.createContext<Ctx | null>(null);

async function asJson(r: Response) {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        throw new Error(
            j?.error || j?.errors?.[0]?.message || `Request failed: ${r.status}`
        );
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

export function ReceivingProductsProvider({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    const [list, setList] = React.useState<ReceivingListItem[]>([]);
    const [listLoading, setListLoading] = React.useState(false);
    const [listError, setListError] = React.useState("");

    const [selectedPO, setSelectedPO] = React.useState<ReceivingPODetail | null>(
        null
    );

    // step 0 compat
    const [poBarcode, setPoBarcode] = React.useState("");
    const [verifyError, setVerifyError] = React.useState("");

    // receipt
    const [receiptNo, setReceiptNo] = React.useState("");
    const [receiptType, setReceiptType] = React.useState("");
    const [receiptDate, setReceiptDate] = React.useState(todayYMD());

    // scan
    const [rfid, setRfid] = React.useState("");
    const [strict, setStrict] = React.useState(true);
    const [scanError, setScanError] = React.useState("");
    const [lastMatched, setLastMatched] = React.useState<ScanRFIDResult | null>(
        null
    );
    const [activity, setActivity] = React.useState<ActivityRow[]>([]);
    const [scannedCountByPorId, setScannedCountByPorId] = React.useState<
        Record<string, number>
    >({});

    const [savingReceipt, setSavingReceipt] = React.useState(false);
    const [saveError, setSaveError] = React.useState("");

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

    // ---------- internal open helpers ----------
    const openPOById = React.useCallback(
        async (poId: string) => {
            setVerifyError("");
            setListError("");
            resetSession();

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

            // auto-fill receipt defaults (per your flow)
            setReceiptDate(todayYMD());
            setReceiptNo(genReceiptNo());
            setReceiptType(""); // user must pick

            // keep barcode in sync for Scan PO step
            setPoBarcode(detail?.poNumber ?? "");
        },
        [resetSession]
    );

    const openPOByBarcode = React.useCallback(
        async (barcode: string) => {
            setVerifyError("");
            setListError("");
            resetSession();

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

    // ---------- exposed APIs ----------
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

    /**
     * ✅ Used by AvailableForReceiving.tsx
     * Supports:
     * - selectAndVerifyPO(poNumber)
     * - selectAndVerifyPO(poId, poNumber)
     * - selectAndVerifyPO(poId) if item.id is passed
     */
    const selectAndVerifyPO = React.useCallback(
        async (a: string, b?: string) => {
            try {
                const first = String(a ?? "").trim();
                const second = typeof b === "string" ? String(b).trim() : "";

                // If passed (poId, poNumber) -> open by id
                if (second) {
                    setPoBarcode(second);
                    await openPOById(first);
                    return;
                }

                // If first matches a list item id, treat as poId
                const hitById = (list ?? []).find((x) => String(x?.id) === first);
                if (hitById) {
                    setPoBarcode(hitById.poNumber);
                    await openPOById(hitById.id);
                    return;
                }

                // Otherwise treat as barcode/po number (verify_po)
                setPoBarcode(first);
                await openPOByBarcode(first);
            } catch (e: any) {
                // prefer verify error if using barcode, else listError
                const msg = String(e?.message ?? e);
                setVerifyError(msg);
            }
        },
        [list, openPOByBarcode, openPOById]
    );

    // optional: Scan PO step button
    const verifyPO = React.useCallback(async () => {
        try {
            await openPOByBarcode(poBarcode);
        } catch (e: any) {
            setVerifyError(String(e?.message ?? e));
        }
    }, [openPOByBarcode, poBarcode]);

    const scanRFID = React.useCallback(async () => {
        setScanError("");
        setLastMatched(null);

        const poId = selectedPO?.id;
        if (!poId) {
            setScanError("Select a PO first.");
            return;
        }

        const value = rfid.trim();
        if (!value) {
            setScanError("Scan RFID first.");
            return;
        }

        try {
            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "scan_rfid", poId, rfid: value }),
            });
            const j = await asJson(r);
            const data = j?.data as ScanRFIDResult;

            // strict rules (safe)
            if (strict && data?.alreadyReceived) {
                setActivity((prev) => [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        rfid: data.rfid,
                        productName: data.productName,
                        time: data.time || new Date().toISOString(),
                        status: "warn",
                    },
                    ...prev,
                ]);
                setScanError("RFID already received. (Strict mode)");
                setRfid("");
                setLastMatched(data);
                return;
            }

            const porId = String(data?.porId ?? "");
            if (!porId) {
                setScanError("Invalid scan result (missing porId).");
                setRfid("");
                return;
            }

            // increment per POR
            setScannedCountByPorId((prev) => ({
                ...(prev ?? {}),
                [porId]: (prev?.[porId] ?? 0) + 1,
            }));

            setActivity((prev) => [
                {
                    id: `${Date.now()}-${Math.random()}`,
                    rfid: data.rfid,
                    productName: data.productName,
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
    }, [selectedPO, rfid, strict]);

    const saveReceipt = React.useCallback(async () => {
        setSaveError("");

        const poId = selectedPO?.id;
        if (!poId) return setSaveError("Select a PO first.");
        if (!receiptNo.trim()) return setSaveError("Receipt Number is required.");
        if (!receiptType.trim()) return setSaveError("Receipt Type is required.");
        if (!receiptDate.trim()) return setSaveError("Receipt Date is required.");

        const counts = scannedCountByPorId ?? {};
        if (!Object.keys(counts).length)
            return setSaveError("Scan at least 1 RFID before saving.");

        setSavingReceipt(true);
        try {
            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save_receipt",
                    poId,
                    receiptNo: receiptNo.trim(),
                    receiptType: receiptType.trim(),
                    receiptDate: receiptDate.trim(),
                    porCounts: counts,
                }),
            });
            const j = await asJson(r);

            const detail = j?.data?.detail ?? null;
            if (detail) {
                setSelectedPO(detail);
                setPoBarcode(detail?.poNumber ?? "");
            }

            // refresh list statuses
            refreshList();

            // clear session scans
            resetSession();
        } catch (e: any) {
            setSaveError(String(e?.message ?? e));
        } finally {
            setSavingReceipt(false);
        }
    }, [
        selectedPO,
        receiptNo,
        receiptType,
        receiptDate,
        scannedCountByPorId,
        refreshList,
        resetSession,
    ]);

    const value: Ctx = {
        // list
        list,
        poList: list,

        listLoading,
        listError,
        refreshList,

        // selection
        selectedPO,

        // open helpers
        openPO,
        selectAndVerifyPO,

        // scan po
        poBarcode,
        setPoBarcode: (v: string) => setPoBarcode(v),
        verifyPO,
        verifyError,

        // receipt
        receiptNo,
        setReceiptNo,
        receiptType,
        setReceiptType,
        receiptDate,
        setReceiptDate,

        // scan rfid
        rfid,
        setRfid,
        strict,
        setStrict,
        scanError,

        lastMatched,
        activity,

        scannedCountByPorId: scannedCountByPorId ?? {},

        scanRFID,
        saveReceipt,
        savingReceipt,
        saveError,
    };

    return (
        <ReceivingProductsContext.Provider value={value}>
            {children}
        </ReceivingProductsContext.Provider>
    );
}

export function useReceivingProducts() {
    const ctx = React.useContext(ReceivingProductsContext);
    if (!ctx)
        throw new Error(
            "useReceivingProducts must be used within ReceivingProductsProvider"
        );
    return ctx;
}
