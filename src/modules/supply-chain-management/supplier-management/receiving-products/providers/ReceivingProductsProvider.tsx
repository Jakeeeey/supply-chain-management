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
    // left list
    list: ReceivingListItem[];
    listLoading: boolean;
    listError: string;
    refreshList: () => Promise<void>;
    openPO: (poId: string) => Promise<void>;

    // selection (your workbench expects selectedPO)
    selectedPO: ReceivingPODetail | null;

    // step 0 compat (optional)
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
    const [strict, setStrict] = React.useState(true);
    const [scanError, setScanError] = React.useState("");
    const [lastMatched, setLastMatched] = React.useState<ScanRFIDResult | null>(null);
    const [activity, setActivity] = React.useState<ActivityRow[]>([]);
    const [scannedCountByPorId, setScannedCountByPorId] = React.useState<Record<string, number>>({});

    const [savingReceipt, setSavingReceipt] = React.useState(false);
    const [saveError, setSaveError] = React.useState("");

    const refreshList = React.useCallback(async () => {
        setListLoading(true);
        setListError("");
        try {
            const r = await fetch("/api/scm/supplier-management/receiving-products", { cache: "no-store" });
            const j = await asJson(r);
            setList(Array.isArray(j?.data) ? j.data : []);
        } catch (e: any) {
            setListError(String(e?.message ?? e));
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

    const openPO = React.useCallback(
        async (poId: string) => {
            setVerifyError("");
            resetSession();

            try {
                const r = await fetch("/api/scm/supplier-management/receiving-products", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "open_po", poId }),
                });
                const j = await asJson(r);
                setSelectedPO(j?.data ?? null);

                // auto-fill receipt defaults
                setReceiptDate(todayYMD());
                setReceiptNo(`REC-${String(Math.floor(Math.random() * 9000) + 1000)}`);
                setReceiptType(""); // user must pick

                // keep barcode blank, but set for reference
                setPoBarcode(j?.data?.poNumber ?? "");
            } catch (e: any) {
                setListError(String(e?.message ?? e));
            }
        },
        [resetSession]
    );

    // optional: verify by PO number if user types
    const verifyPO = React.useCallback(async () => {
        setVerifyError("");
        resetSession();

        const code = String(poBarcode ?? "").trim();
        if (!code) {
            setVerifyError("Enter/select PO first.");
            return;
        }

        try {
            const r = await fetch("/api/scm/supplier-management/receiving-products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "verify_po", barcode: code }),
            });
            const j = await asJson(r);
            setSelectedPO(j?.data ?? null);

            setReceiptDate(todayYMD());
            setReceiptNo(`REC-${String(Math.floor(Math.random() * 9000) + 1000)}`);
            setReceiptType("");
        } catch (e: any) {
            setVerifyError(String(e?.message ?? e));
        }
    }, [poBarcode, resetSession]);

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
            const r = await fetch("/api/scm/supplier-management/receiving-products", {
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

            // increment per POR
            const porId = String(data?.porId ?? "");
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
        if (!Object.keys(counts).length) return setSaveError("Scan at least 1 RFID before saving.");

        setSavingReceipt(true);
        try {
            const r = await fetch("/api/scm/supplier-management/receiving-products", {
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
            if (detail) setSelectedPO(detail);

            // refresh list statuses
            refreshList();

            // clear session scans
            resetSession();
        } catch (e: any) {
            setSaveError(String(e?.message ?? e));
        } finally {
            setSavingReceipt(false);
        }
    }, [selectedPO, receiptNo, receiptType, receiptDate, scannedCountByPorId, refreshList, resetSession]);

    const value: Ctx = {
        list,
        listLoading,
        listError,
        refreshList,
        openPO,

        selectedPO,

        poBarcode,
        setPoBarcode,
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

    return <ReceivingProductsContext.Provider value={value}>{children}</ReceivingProductsContext.Provider>;
}

export function useReceivingProducts() {
    const ctx = React.useContext(ReceivingProductsContext);
    if (!ctx) throw new Error("useReceivingProducts must be used within ReceivingProductsProvider");
    return ctx;
}
