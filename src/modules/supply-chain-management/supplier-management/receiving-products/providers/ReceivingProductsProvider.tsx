"use client";

import * as React from "react";
import type {
    POListItem,
    PurchaseOrder,
    ReceiptForm,
    ReceiptTypeOption,
    ReceivingStep,
    ReceivedLine,
    POItem,
} from "../types";

type Ctx = {
    loadingList: boolean;
    list: POListItem[];
    selectedListId: string | null;

    step: ReceivingStep;

    po: PurchaseOrder | null;

    poBarcode: string;
    setPoBarcode: (v: string) => void;

    verifyError: string | null;
    verifyPO: () => Promise<void>;

    receipt: ReceiptForm;
    setReceipt: (patch: Partial<ReceiptForm>) => void;

    receiptTypes: ReceiptTypeOption[];

    goStep: (s: ReceivingStep) => void;

    selectedBranchId: string;
    setSelectedBranchId: (v: string) => void;

    scannedProductBarcode: string;
    setScannedProductBarcode: (v: string) => void;

    selectedScannedItem: POItem | null;

    rfidValue: string;
    setRfidValue: (v: string) => void;

    receivedLines: ReceivedLine[];
    addByBarcode: (barcode: string) => void;
    attachRfidToCurrent: (rfid: string) => void;
    clearCurrentScanned: () => void;

    saveLoading: boolean;
    saveReceipt: () => Promise<void>;
};

const ReceivingProductsContext = React.createContext<Ctx | null>(null);

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export function ReceivingProductsProvider({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    const [loadingList, setLoadingList] = React.useState(true);
    const [list, setList] = React.useState<POListItem[]>([]);
    const [selectedListId, setSelectedListId] = React.useState<string | null>(
        null
    );

    const [step, setStep] = React.useState<ReceivingStep>(1);

    const [po, setPo] = React.useState<PurchaseOrder | null>(null);

    const [poBarcode, setPoBarcode] = React.useState("");
    const [verifyError, setVerifyError] = React.useState<string | null>(null);

    const receiptTypes: ReceiptTypeOption[] = React.useMemo(
        () => [
            { code: "SI-CHARGE", label: "Charge Sales Invoice [SI-CHARGE]" },
            { code: "DR", label: "Delivery Receipt [DR]" },
            { code: "INV", label: "Supplier Invoice [INV]" },
        ],
        []
    );

    const [receipt, setReceiptState] = React.useState<ReceiptForm>({
        receiptNumber: "REC-0001",
        receiptTypeCode: "",
        receiptDate: todayISO(),
        lotNumber: "",
        lotExpiration: "",
    });

    const setReceipt = (patch: Partial<ReceiptForm>) =>
        setReceiptState((prev) => ({ ...prev, ...patch }));

    const [selectedBranchId, setSelectedBranchId] = React.useState("");

    const [scannedProductBarcode, setScannedProductBarcode] = React.useState("");
    const [currentItemId, setCurrentItemId] = React.useState<string | null>(null);

    const [rfidValue, setRfidValue] = React.useState("");

    const [receivedLines, setReceivedLines] = React.useState<ReceivedLine[]>([]);

    const [saveLoading, setSaveLoading] = React.useState(false);

    React.useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoadingList(true);
                const res = await fetch(
                    "/api/scm/supplier-management/receiving-products",
                    { method: "GET" }
                );
                const json = await res.json();
                if (!alive) return;
                setList(json?.data ?? []);
                // auto-select first item (matches wireframe feel)
                const first = (json?.data ?? [])?.[0]?.id ?? null;
                setSelectedListId(first);
            } catch {
                if (!alive) return;
                setList([]);
            } finally {
                if (!alive) return;
                setLoadingList(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    const goStep = (s: ReceivingStep) => setStep(s);

    const verifyPO = async () => {
        setVerifyError(null);
        const code = poBarcode.trim();
        if (!code) {
            setVerifyError("Please scan or type the PO barcode.");
            return;
        }
        try {
            const res = await fetch("/api/scm/supplier-management/receiving-products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "verify_po", barcode: code }),
            });
            const json = await res.json();
            if (!res.ok) {
                setVerifyError(json?.error ?? "Failed to verify PO.");
                return;
            }
            setPo(json?.data ?? null);
            // default branch empty until step 3
            setSelectedBranchId("");
            setReceivedLines([]);
            setCurrentItemId(null);
            setScannedProductBarcode("");
            setRfidValue("");
            setStep(2);
        } catch {
            setVerifyError("Network error while verifying PO.");
        }
    };

    const selectedScannedItem = React.useMemo(() => {
        if (!po || !currentItemId) return null;
        for (const alloc of po.allocations) {
            const found = alloc.items.find((x) => x.id === currentItemId);
            if (found) return found;
        }
        return null;
    }, [po, currentItemId]);

    const clearCurrentScanned = () => {
        setCurrentItemId(null);
        setScannedProductBarcode("");
        setRfidValue("");
    };

    const addByBarcode = (barcode: string) => {
        if (!po) return;
        const b = barcode.trim();
        if (!b) return;

        if (!selectedBranchId) {
            // require branch selection
            return;
        }

        const alloc = po.allocations.find((a) => a.branch.id === selectedBranchId);
        if (!alloc) return;

        const item = alloc.items.find(
            (x) => x.barcode.toLowerCase() === b.toLowerCase()
        );

        // If not found in branch, allow searching across all allocations (still show error via no-op)
        const fallback =
            item ??
            po.allocations.flatMap((a) => a.items).find((x) => x.barcode === b);

        if (!fallback) {
            // not found
            setCurrentItemId(null);
            setScannedProductBarcode(b);
            return;
        }

        setCurrentItemId(fallback.id);
        setScannedProductBarcode(b);

        // For non-RFID items, auto-increment receivedNowQty by 1
        if (!fallback.requiresRfid) {
            setReceivedLines((prev) => {
                const idx = prev.findIndex((l) => l.itemId === fallback.id);
                const expected = fallback.expectedQty;
                const alreadyReceived = fallback.receivedQty;
                const currentSession = idx >= 0 ? prev[idx].receivedNowQty : 0;
                const canAdd = alreadyReceived + currentSession + 1 <= expected;
                if (!canAdd) return prev;

                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = { ...next[idx], receivedNowQty: next[idx].receivedNowQty + 1 };
                    return next;
                }
                return [
                    ...prev,
                    {
                        itemId: fallback.id,
                        productId: fallback.productId,
                        barcode: fallback.barcode,
                        name: fallback.name,
                        uom: fallback.uom,
                        receivedNowQty: 1,
                        rfids: [],
                    },
                ];
            });
        }
    };

    const attachRfidToCurrent = (rfid: string) => {
        if (!po) return;
        if (!currentItemId) return;

        const tag = rfid.trim();
        if (!tag) return;

        const item = po.allocations.flatMap((a) => a.items).find((x) => x.id === currentItemId);
        if (!item) return;

        setReceivedLines((prev) => {
            const allRfids = prev.flatMap((x) => x.rfids);
            if (allRfids.includes(tag)) return prev;

            const idx = prev.findIndex((l) => l.itemId === currentItemId);
            const expected = item.expectedQty;
            const alreadyReceived = item.receivedQty;
            const currentSession = idx >= 0 ? prev[idx].receivedNowQty : 0;

            // each RFID counts as 1 unit received
            const canAdd = alreadyReceived + currentSession + 1 <= expected;
            if (!canAdd) return prev;

            if (idx >= 0) {
                const next = [...prev];
                next[idx] = {
                    ...next[idx],
                    receivedNowQty: next[idx].receivedNowQty + 1,
                    rfids: [...next[idx].rfids, tag],
                };
                return next;
            }

            return [
                ...prev,
                {
                    itemId: item.id,
                    productId: item.productId,
                    barcode: item.barcode,
                    name: item.name,
                    uom: item.uom,
                    receivedNowQty: 1,
                    rfids: [tag],
                },
            ];
        });

        setRfidValue("");
    };

    const saveReceipt = async () => {
        if (!po) return;
        if (!selectedBranchId) return;

        // basic validation
        if (!receipt.receiptNumber.trim()) return;
        if (!receipt.receiptTypeCode.trim()) return;
        if (!receipt.receiptDate.trim()) return;
        if (!receipt.lotNumber.trim()) return;
        if (!receipt.lotExpiration.trim()) return;

        if (receivedLines.length === 0) return;

        try {
            setSaveLoading(true);
            const res = await fetch("/api/scm/supplier-management/receiving-products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save_receipt",
                    poId: po.id,
                    branchId: selectedBranchId,
                    receipt,
                    receivedLines,
                }),
            });
            const json = await res.json();
            if (!res.ok) return;

            // reset to step 1 state
            setPo(null);
            setStep(1);
            setPoBarcode("");
            setVerifyError(null);
            setSelectedBranchId("");
            setReceivedLines([]);
            setCurrentItemId(null);
            setScannedProductBarcode("");
            setRfidValue("");

            // bump receipt number a bit (mock)
            const nextNo = json?.data?.receiptId ?? "REC-0001";
            setReceiptState((prev) => ({
                ...prev,
                receiptNumber: nextNo,
                receiptTypeCode: "",
                receiptDate: todayISO(),
                lotNumber: "",
                lotExpiration: "",
            }));

            // re-fetch list (optional)
            // keep it simple: no refetch now
        } finally {
            setSaveLoading(false);
        }
    };

    const value: Ctx = {
        loadingList,
        list,
        selectedListId,

        step,
        po,

        poBarcode,
        setPoBarcode,

        verifyError,
        verifyPO,

        receipt,
        setReceipt,
        receiptTypes,

        goStep,

        selectedBranchId,
        setSelectedBranchId,

        scannedProductBarcode,
        setScannedProductBarcode,

        selectedScannedItem,

        rfidValue,
        setRfidValue,

        receivedLines,
        addByBarcode,
        attachRfidToCurrent,
        clearCurrentScanned,

        saveLoading,
        saveReceipt,
    };

    return (
        <ReceivingProductsContext.Provider value={value}>
            {children}
        </ReceivingProductsContext.Provider>
    );
}

export function useReceivingProducts() {
    const ctx = React.useContext(ReceivingProductsContext);
    if (!ctx) throw new Error("useReceivingProducts must be used within provider");
    return ctx;
}
