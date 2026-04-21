"use client";

import * as React from "react";
import { toast } from "sonner";

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
    id: string; // unique identifier (porId or placeholder)
    porId?: string;
    productId: string;
    branchId?: string;
    name: string;
    barcode: string;
    uom: string;
    uomCount?: number;
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
    isExtra?: boolean;
};

export type LotOption = {
    lot_id: number;
    lot_name: string;
};

export type UnitOption = {
    unit_id: number;
    unit_name: string;
    unit_shortcut: string;
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
    history?: Array<{
        receiptNo: string;
        receiptDate: string;
        isPosted: boolean;
        itemsCount: number;
    }>;
    createdAt: string;
    priceType?: string;
};

export type SavedItem = {
    productId: string;
    name: string;
    barcode: string;
    expectedQty: number;
    receivedQtyAtStart: number;
    receivedQtyNow: number;
    rfids?: string[];
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

    saveReceipt: (porMetaData?: Record<string, { lotNo: string; batchNo?: string; expiryDate: string }>) => Promise<void>;
    savingReceipt: boolean;
    saveError: string;

    // ✅ NEW: Barcode Verification
    verifiedBarcodes: string[];
    verifyBarcode: (barcode: string) => Promise<boolean>;
    markProductAsVerified: (productId: string) => void;
    activeProductId: string | null;
    setActiveProductId: (id: string | null) => void;
    scanError: string;

    // ✅ NEW: Extra Product
    lookupProduct: (barcode: string) => Promise<{ productId: string; name: string; barcode: string; unitPrice: number } | null>;
    addExtraProductLocally: (item: { productId: string; name: string; barcode: string; branchId: string; branchName: string; unitPrice?: number }) => void;

    // ✅ LOTS
    lots: LotOption[];
    lotsLoading: boolean;

    // ✅ UNITS
    units: UnitOption[];
    unitsLoading: boolean;
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

const API_URL = "/api/scm/supplier-management/purchase-order-receiving-manual";

const playBeep = (type: "success" | "error" = "success") => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (type === "success") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } else {
            osc.type = "square";
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch {
        // Ignored if audio is blocked or unsupported
    }
};

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

    // ✅ NEW: Barcode Verification State
    const [verifiedBarcodes, setVerifiedBarcodes] = React.useState<string[]>([]);
    const [activeProductId, setActiveProductId] = React.useState<string | null>(null);
    const [scanError, setScanError] = React.useState("");

    // ✅ LOTS
    const [lots, setLots] = React.useState<LotOption[]>([]);
    const [lotsLoading, setLotsLoading] = React.useState(false);

    // ✅ UNITS
    const [units, setUnits] = React.useState<UnitOption[]>([]);
    const [unitsLoading, setUnitsLoading] = React.useState(false);

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
                toast.error(`Load failed: ${msg}`);
            }
            setList([]);
        } finally {
            setListLoading(false);
        }
    }, []);

    React.useEffect(() => {
        refreshList();
    }, [refreshList]);

    // ✅ Fetch lots on mount
    React.useEffect(() => {
        (async () => {
            setLotsLoading(true);
            try {
                const r = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "get_lots" }),
                });
                const j = await asJson(r);
                setLots(Array.isArray(j?.data) ? j.data : []);
            } catch {
                setLots([]);
            } finally {
                setLotsLoading(false);
            }
        })();
    }, []);

    // ✅ Fetch units on mount
    React.useEffect(() => {
        (async () => {
            setUnitsLoading(true);
            try {
                const r = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "get_units" }),
                });
                const j = await asJson(r);
                setUnits(Array.isArray(j?.data) ? j.data : []);
            } catch {
                setUnits([]);
            } finally {
                setUnitsLoading(false);
            }
        })();
    }, []);

    const resetSession = React.useCallback(() => {
        setSaveError("");
        setScanError("");
        setManualCounts({});
        setVerifiedBarcodes([]);
        setActiveProductId(null);
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
                setReceiptNo("");
                setReceiptType("");

                setPoBarcode(detail?.poNumber ?? "");
            } catch (e: unknown) {
                const msg = (e as Error)?.message ?? String(e);
                if (msg.trim().toLowerCase() !== "fetch failed") {
                    setVerifyError(msg);
                    toast.error(`Error: ${msg}`);
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
                setReceiptNo("");
                setReceiptType("");

                setPoBarcode(code);
            } catch (e: unknown) {
                const msg = (e as Error)?.message ?? String(e);
                if (msg.trim().toLowerCase() !== "fetch failed") {
                    setVerifyError(msg);
                    toast.error(`Verification error: ${msg}`);
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

    // ✅ NEW: Product lookup for extra products
    const lookupProduct = React.useCallback(async (barcode: string) => {
        try {
            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "lookup_product", barcode }),
            });
            const j = await asJson(r);
            return j?.data || null;
        } catch {
            return null;
        }
    }, []);

    // ✅ NEW: Add extra product locally
    const addExtraProductLocally = React.useCallback((item: { productId: string; name: string; barcode: string; branchId: string; branchName: string; unitPrice?: number }) => {
        setSelectedPO(prev => {
            if (!prev) return prev;
            const updated = { ...prev };
            const allocs = [...updated.allocations];

            let branchAlloc = allocs.find(a => a.branch.id === item.branchId);
            if (!branchAlloc) {
                branchAlloc = { branch: { id: item.branchId, name: item.branchName }, items: [] };
                allocs.push(branchAlloc);
            }

            const existingItem = branchAlloc.items.find(i => i.productId === item.productId);
            if (!existingItem) {
                branchAlloc.items = [...branchAlloc.items, {
                    id: `${item.productId}-${item.branchId}`,
                    porId: "",
                    productId: String(item.productId),
                    branchId: String(item.branchId),
                    name: item.name,
                    barcode: item.barcode,
                    uom: "—",
                    expectedQty: 0,
                    receivedQty: 0,
                    requiresRfid: true,
                    taggedQty: 0,
                    rfids: [],
                    isReceived: false,
                    unitPrice: item.unitPrice || 0,
                    discountType: "Standard",
                    discountAmount: 0,
                    netAmount: 0,
                    isExtra: true
                }];
            }

            updated.allocations = allocs;
            return updated;
        });
    }, []);

    // ✅ NEW: Barcode verification (for both existing and extra products)
    const verifyBarcode = React.useCallback(async (barcode: string) => {
        if (!selectedPO) return false;

        const code = String(barcode).trim().toLowerCase();
        if (!code) return false;

        const allocs = Array.isArray(selectedPO.allocations) ? selectedPO.allocations : [];
        let matchingItem: ReceivingPOItem | null = null;

        // Find matching item in PO
        for (const alloc of allocs) {
            for (const item of alloc.items) {
                if (
                    String(item.barcode).toLowerCase() === code ||
                    String(item.productId) === code
                ) {
                    matchingItem = item;
                    break;
                }
            }
            if (matchingItem) break;
        }

        if (!matchingItem) {
            // ✅ EXTRA PRODUCT LOGIC
            setScanError("");
            playBeep("success");
            const extraMatch = await lookupProduct(code);
            if (!extraMatch) {
                playBeep("error");
                setScanError(`Product not found in this Purchase Order, and not found in Master Catalog.`);
                return false;
            }

            const branchId = selectedPO.allocations[0]?.branch?.id || "0";
            const branchName = selectedPO.allocations[0]?.branch?.name || "Unassigned";

            addExtraProductLocally({
                productId: extraMatch.productId,
                name: extraMatch.name,
                barcode: extraMatch.barcode,
                branchId,
                branchName,
                unitPrice: extraMatch.unitPrice
            });

            matchingItem = { productId: extraMatch.productId } as ReceivingPOItem;
        }

        // Ensure not already verified
        if (verifiedBarcodes.includes(matchingItem.productId)) {
            playBeep("error");
            setScanError("Product already verified for this session.");
            return false;
        }

        if (matchingItem) {
            setVerifiedBarcodes((prev) => [...new Set([...prev, matchingItem!.productId])]);
            setActiveProductId(matchingItem.productId);
            toast.info(`Product Verified: ${matchingItem.name}`);
            playBeep("success");
            setScanError("");
            return true;
        }

        return false;
    }, [selectedPO, verifiedBarcodes, lookupProduct, addExtraProductLocally]);

    const markProductAsVerified = React.useCallback((productId: string) => {
        setVerifiedBarcodes(prev => {
            if (prev.includes(productId)) return prev;
            return [...prev, productId];
        });
        setActiveProductId(productId);
    }, []);

    const saveReceipt = React.useCallback(async (porMetaData?: Record<string, { lotNo: string; batchNo?: string; expiryDate: string }>) => {
        setSaveError("");

        const poId = selectedPO?.id;
        if (!poId) return setSaveError("Select a PO first.");
        const errs: string[] = [];
        if (!receiptNo.trim()) errs.push("Receipt Number is required.");
        if (!receiptType.trim()) errs.push("Receipt Type is required.");
        if (!receiptDate.trim()) errs.push("Receipt Date is required.");

        if (errs.length > 0) {
            toast.error("Required fields missing", {
                description: errs.join(" "),
            });
            return setSaveError(errs.join(" "));
        }

        const counts = manualCounts ?? {};
        if (!Object.keys(counts).length || Object.values(counts).every(c => c <= 0)) {
            const err = "Enter at least 1 count before saving.";
            toast.error(err);
            return setSaveError(err);
        }

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

            // ✅ gather items for printing
            const allocs = Array.isArray(detail?.allocations) ? detail.allocations : [];
            const allItems = allocs.flatMap((a: unknown) => {
                const aObj = a as Record<string, unknown>;
                return Array.isArray(aObj?.items) ? aObj.items : [];
            });

            // Calculate if fully received
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
            
            toast.success(`Receipt ${oldReceiptNo} saved successfully!`);

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

            // ✅ prepare a new receipt immediately
            setReceiptDate(todayYMD());
            setReceiptNo("");
            setReceiptType("");
        } catch (e: unknown) {
            const msg = (e as Error)?.message ?? String(e);
            setSaveError(msg);
            toast.error(`Save failed: ${msg}`);
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

        // ✅ NEW
        verifiedBarcodes,
        verifyBarcode,
        markProductAsVerified,
        activeProductId,
        setActiveProductId,
        scanError,

        lookupProduct,
        addExtraProductLocally,

        lots,
        lotsLoading,

        units,
        unitsLoading,
    };

    return <ReceivingProductsManualContext.Provider value={value}>{children}</ReceivingProductsManualContext.Provider>;
}

export function useReceivingProductsManual() {
    const ctx = React.useContext(ReceivingProductsManualContext);
    if (!ctx) throw new Error("useReceivingProductsManual must be used within ReceivingProductsManualProvider");
    return ctx;
}
