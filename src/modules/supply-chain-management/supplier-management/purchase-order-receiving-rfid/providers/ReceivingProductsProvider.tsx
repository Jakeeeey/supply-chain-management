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
    id: string; // porId
    porId?: string;
    productId: string;
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
    lot_id?: number | null;
    batch_no?: string;
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
    isInvoice?: boolean;
};

type ScanRFIDResult = {
    rfid: string;
    productId?: string;
    porId?: string;
    productName?: string;
    sku?: string;
    time?: string;
    alreadyReceived?: boolean;
    status?: "unknown" | "known" | "error" | "tagged" | "received";
    poNumber?: string;
    items?: UntaggedItem[];
};

export type ActivityRow = {
    id: string;
    rfid: string;
    productName: string;
    productId: string;
    porId: string;
    time: string;
    status: "ok" | "warn" | "unknown" | "known" | "duplicate" | "limit" | "error";
};

export type SavedItem = {
    productId: string;
    name: string;
    barcode: string;
    expectedQty: number;
    receivedQtyAtStart: number;
    receivedQtyNow: number;
    unitPrice?: number;
    discountAmount?: number;
    batchNo?: string;
    lotId?: string;
    expiryDate?: string;
    uom?: string;
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
    receiverName?: string;
    isInvoice?: boolean;
};

// ✅ MERGED: Types for on-the-fly tagging modal
export type UntaggedItem = {
    productId: string;
    branchId: string;
    name: string;
    barcode: string;
    branchName: string;
    expectedQty: number;
};

export type PendingTag = {
    rfid: string;
    items: UntaggedItem[];
} | null;

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

    activePorId: string | null;
    setActivePorId: (id: string | null) => void;
    localScannedRfids: Array<{ rfid: string; productId: string; branchId: string; status: "known" | "unknown"; porId?: string; productName: string }>;

    // Virtual count based on DB scans + local buffer
    scannedCountByPorId: Record<string, number>;

    // ✅ NEW: receipt saved signal (non-breaking)
    receiptSaved: ReceiptSavedInfo | null;
    clearReceiptSaved: () => void;

    scanRFID: (rfidOverride?: string) => Promise<void>;
    removeActivity: (id: string) => void;
    saveReceipt: (porMetaData?: Record<string, { lotId: string; batchNo: string; expiryDate: string }>) => Promise<void>;
    savingReceipt: boolean;
    saveError: string;

    // ✅ EXTRA: Add Product via Supplier Picker
    addExtraProductLocally: (item: { productId: string; name: string; barcode: string; branchId: string; branchName: string; unitPrice?: number; discountType?: string; discountPercent?: number; uom?: string; sku?: string; }) => void;
    removeExtraProductLocally: (porId: string) => void;

    // ✅ CHECKLIST: Product verification (mirrors manual module)
    verifiedPorIds: string[];
    toggleProductVerification: (porId: string) => void;
    getSupplierProducts: (supplierId: string) => Promise<{ productId: string; name: string; sku: string; barcode: string; unitPrice: number; uom: string; discountType: string; discountPercent: number; }[]>;

    // ✅ METADATA (Batch, Lot, Expiry)
    metaDataByPorId: Record<string, { batchNo?: string; lotNo?: string; lotId?: string; expiryDate?: string }>;
    setMetaDataByPorId: React.Dispatch<React.SetStateAction<Record<string, { batchNo?: string; lotNo?: string; lotId?: string; expiryDate?: string }>>>;

    // ✅ LEGACY COMPAT: kept for TagRFIDStep internal usage
    markProductAsVerified: (productId: string, porId: string) => void;
    activeProductId: string | null;
    setActiveProductId: (id: string | null) => void;

    // ✅ LOTS: dropdown options
    lots: LotOption[];
    lotsLoading: boolean;

    // ✅ UNITS
    units: UnitOption[];
    unitsLoading: boolean;
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


const API_URL = "/api/scm/supplier-management/purchase-order-receiving-rfid";

// ✅ PERSISTENCE: localStorage helpers
const DRAFT_KEY_PREFIX = "scm_rfid_draft_";
function getDraftKey(poId: string) { return `${DRAFT_KEY_PREFIX}${poId}`; }

type ExtraItemDraft = {
    productId: string;
    name: string;
    barcode: string;
    branchId: string;
    branchName: string;
    unitPrice: number;
    discountType: string;
    discountPercent: number;
    uom: string;
    sku: string;
};

type DraftState = {
    localScannedRfids: Ctx["localScannedRfids"];
    activity: ActivityRow[];
    scannedCountByPorId: Record<string, number>;
    verifiedPorIds: string[];
    receiptNo: string;
    receiptType: string;
    receiptDate: string;
    metaDataByPorId?: Record<string, { batchNo?: string; lotNo?: string; lotId?: string; expiryDate?: string }>;
    extraItems?: ExtraItemDraft[];
    savedAt: number;
};

function saveDraft(poId: string, state: DraftState) {
    try { localStorage.setItem(getDraftKey(poId), JSON.stringify(state)); } catch { /* quota exceeded, ignore */ }
}
function loadDraft(poId: string): DraftState | null {
    try {
        const raw = localStorage.getItem(getDraftKey(poId));
        if (!raw) return null;
        return JSON.parse(raw) as DraftState;
    } catch { return null; }
}
function clearDraft(poId: string) {
    try { localStorage.removeItem(getDraftKey(poId)); } catch { /* ignore */ }
}

const playBeep = (type: "success" | "error" = "success") => {
    try {
        const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtor) return;
        const ctx = new AudioCtor();
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

export function ReceivingProductsProvider({ children, receiverId }: { children: React.ReactNode, receiverId?: number }) {
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

    // ✅ NEW BUFFER
    const [localScannedRfids, setLocalScannedRfids] = React.useState<Ctx["localScannedRfids"]>([]);

    const [scannedCountByPorId, setScannedCountByPorId] = React.useState<Record<string, number>>({});

    const [savingReceipt, setSavingReceipt] = React.useState(false);
    const [saveError, setSaveError] = React.useState("");

    // ✅ NEW: success signal for UI
    const [receiptSaved, setReceiptSaved] = React.useState<ReceiptSavedInfo | null>(null);
    const clearReceiptSaved = React.useCallback(() => setReceiptSaved(null), []);



    // ✅ LOTS: dropdown options
    const [lots, setLots] = React.useState<LotOption[]>([]);
    const [lotsLoading, setLotsLoading] = React.useState(false);

    // ✅ UNITS
    const [units, setUnits] = React.useState<UnitOption[]>([]);
    const [unitsLoading, setUnitsLoading] = React.useState(false);

    // ✅ NEW FLOW: Product Barcode Verification State
    const [verifiedPorIds, setVerifiedPorIds] = React.useState<string[]>([]);
    const [activeProductId, setActiveProductId] = React.useState<string | null>(null);
    const [activePorId, setActivePorId] = React.useState<string | null>(null);

    // ✅ METADATA
    const [metaDataByPorId, setMetaDataByPorId] = React.useState<Record<string, { batchNo?: string; lotNo?: string; lotId?: string; expiryDate?: string }>>({});

    const refreshList = React.useCallback(async () => {
        setListLoading(true);
        setListError("");
        try {
            const r = await fetch(API_URL, { cache: "no-store" });
            const j = await asJson(r);
            setList(Array.isArray(j?.data) ? j.data : []);
        } catch (e: unknown) {
            const msg = String((e as Error)?.message ?? e);
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

    // ✅ Fetch lots on mount (global, not per-PO)
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

    const resetSession = React.useCallback((opts?: { clearStorage?: boolean; poId?: string }) => {
        setScanError("");
        setSaveError("");
        setLastMatched(null);
        setActivity([]);
        setScannedCountByPorId({});
        setRfid("");
        setLocalScannedRfids([]);
        setVerifiedPorIds([]);
        setActiveProductId(null);
        if (opts?.clearStorage && opts?.poId) {
            clearDraft(opts.poId);
        }
    }, []);

    // ✅ PERSISTENCE: Auto-save draft to localStorage whenever tagging state changes
    React.useEffect(() => {
        const poId = selectedPO?.id;
        if (!poId) return;
        // Collect extra items from current allocations for persistence
        const extraItems: ExtraItemDraft[] = [];
        if (selectedPO?.allocations) {
            for (const alloc of selectedPO.allocations) {
                for (const item of alloc.items) {
                    if (item.isExtra) {
                        extraItems.push({
                            productId: item.productId,
                            name: item.name,
                            barcode: item.barcode,
                            branchId: alloc.branch.id,
                            branchName: alloc.branch.name,
                            unitPrice: item.unitPrice ?? 0,
                            discountType: item.discountType ?? "Standard",
                            discountPercent: item.discountAmount && item.unitPrice ? Number(((item.discountAmount / item.unitPrice) * 100).toFixed(2)) : 0,
                            uom: item.uom ?? "BOX",
                            sku: item.barcode,
                        });
                    }
                }
            }
        }
        // Only save if there's meaningful data
        if (localScannedRfids.length === 0 && activity.length === 0 && verifiedPorIds.length === 0 && extraItems.length === 0) return;
        saveDraft(poId, {
            localScannedRfids,
            activity,
            scannedCountByPorId,
            verifiedPorIds,
            receiptNo,
            receiptType,
            receiptDate,
            metaDataByPorId,
            extraItems,
            savedAt: Date.now(),
        });
    }, [selectedPO?.id, selectedPO?.allocations, localScannedRfids, activity, scannedCountByPorId, verifiedPorIds, receiptNo, receiptType, receiptDate, metaDataByPorId]);

    const openPOById = React.useCallback(
        async (poId: string, options?: { silent?: boolean }) => {
            const silent = !!options?.silent;

            if (!silent) {
                setVerifyError("");
                setListError("");
                resetSession();
                setReceiptSaved(null);
                // ✅ avoid stale PO if server blocks or errors
                setSelectedPO(null);
            }

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

                if (!silent) {
                    setPoBarcode(detail?.poNumber ?? "");
                    // ✅ PERSISTENCE: Restore draft if available
                    const draft = detail?.id ? loadDraft(detail.id) : null;
                    const hasDraftData = draft ? (
                        draft.localScannedRfids.length > 0 ||
                        Object.keys(draft.scannedCountByPorId || {}).length > 0 ||
                        (draft.verifiedPorIds && draft.verifiedPorIds.length > 0) ||
                        Object.keys(draft.metaDataByPorId || {}).length > 0 ||
                        (draft.extraItems && draft.extraItems.length > 0)
                    ) : false;

                    if (hasDraftData && draft) {
                        // ✅ Restore extra items into PO allocations
                        if (draft.extraItems && draft.extraItems.length > 0 && detail) {
                            const restored = { ...detail };
                            const allocs = [...restored.allocations];
                            for (const extra of draft.extraItems) {
                                let branchAlloc = allocs.find(a => a.branch.id === extra.branchId);
                                if (!branchAlloc) {
                                    branchAlloc = { branch: { id: extra.branchId, name: extra.branchName }, items: [] };
                                    allocs.push(branchAlloc);
                                }
                                const alreadyExists = branchAlloc.items.some(i => i.productId === extra.productId);
                                if (!alreadyExists) {
                                    const uPrice = extra.unitPrice || 0;
                                    const dPct = extra.discountPercent || 0;
                                    const dAmt = Number((uPrice * (dPct / 100)).toFixed(2));
                                    branchAlloc.items = [...branchAlloc.items, {
                                        id: `${extra.productId}-${extra.branchId}`,
                                        productId: String(extra.productId),
                                        name: extra.name,
                                        barcode: extra.sku || extra.barcode,
                                        uom: extra.uom || "BOX",
                                        expectedQty: 0,
                                        receivedQty: 0,
                                        requiresRfid: true,
                                        taggedQty: 0,
                                        rfids: [],
                                        isReceived: false,
                                        unitPrice: uPrice,
                                        discountType: extra.discountType || "Standard",
                                        discountAmount: dAmt,
                                        netAmount: 0,
                                        isExtra: true
                                    }];
                                }
                            }
                            restored.allocations = allocs;
                            setSelectedPO(restored);
                        }
                        setLocalScannedRfids(draft.localScannedRfids);
                        setActivity(draft.activity);
                        setScannedCountByPorId(draft.scannedCountByPorId);
                        setVerifiedPorIds(draft.verifiedPorIds || []);
                        setMetaDataByPorId(draft.metaDataByPorId || {});
                        setReceiptNo(draft.receiptNo || "");
                        setReceiptType(draft.receiptType || "");
                        setReceiptDate(draft.receiptDate || todayYMD());
                        toast.info("Draft restored from previous session.");
                    } else {
                        setReceiptDate(todayYMD());
                        setReceiptNo("");
                        setReceiptType("");
                    }
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.trim().toLowerCase() !== "fetch failed") {
                    setVerifyError(msg);
                    toast.error(`Open failed: ${msg}`);
                }
            }
        },
        [resetSession]
    );

    const openPOByBarcode = React.useCallback(
        async (barcode: string, options?: { silent?: boolean }) => {
            const silent = !!options?.silent;

            if (!silent) {
                setVerifyError("");
                setListError("");
                resetSession();
                setReceiptSaved(null);
                // ✅ avoid stale PO if server blocks or errors
                setSelectedPO(null);
            }

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

                if (!silent) {
                    setPoBarcode(code);
                    // ✅ PERSISTENCE: Restore draft if available
                    const draft = detail?.id ? loadDraft(detail.id) : null;
                    const hasDraftData = draft ? (
                        draft.localScannedRfids.length > 0 ||
                        Object.keys(draft.scannedCountByPorId || {}).length > 0 ||
                        (draft.verifiedPorIds && draft.verifiedPorIds.length > 0) ||
                        Object.keys(draft.metaDataByPorId || {}).length > 0 ||
                        (draft.extraItems && draft.extraItems.length > 0)
                    ) : false;

                    if (hasDraftData && draft) {
                        // Restore extra items into PO allocations
                        if (draft.extraItems && draft.extraItems.length > 0 && detail) {
                            const restored = { ...detail };
                            const allocs = [...restored.allocations];
                            for (const extra of draft.extraItems) {
                                let branchAlloc = allocs.find(a => a.branch.id === extra.branchId);
                                if (!branchAlloc) {
                                    branchAlloc = { branch: { id: extra.branchId, name: extra.branchName }, items: [] };
                                    allocs.push(branchAlloc);
                                }
                                const alreadyExists = branchAlloc.items.some(i => i.productId === extra.productId);
                                if (!alreadyExists) {
                                    const uPrice = extra.unitPrice || 0;
                                    const dPct = extra.discountPercent || 0;
                                    const dAmt = Number((uPrice * (dPct / 100)).toFixed(2));
                                    branchAlloc.items = [...branchAlloc.items, {
                                        id: `${extra.productId}-${extra.branchId}`,
                                        productId: String(extra.productId),
                                        name: extra.name,
                                        barcode: extra.sku || extra.barcode,
                                        uom: extra.uom || "BOX",
                                        expectedQty: 0,
                                        receivedQty: 0,
                                        requiresRfid: true,
                                        taggedQty: 0,
                                        rfids: [],
                                        isReceived: false,
                                        unitPrice: uPrice,
                                        discountType: extra.discountType || "Standard",
                                        discountAmount: dAmt,
                                        netAmount: 0,
                                        isExtra: true
                                    }];
                                }
                            }
                            restored.allocations = allocs;
                            setSelectedPO(restored);
                        }
                        setLocalScannedRfids(draft.localScannedRfids);
                        setActivity(draft.activity);
                        setScannedCountByPorId(draft.scannedCountByPorId);
                        setVerifiedPorIds(draft.verifiedPorIds || []);
                        setMetaDataByPorId(draft.metaDataByPorId || {});
                        setReceiptNo(draft.receiptNo || "");
                        setReceiptType(draft.receiptType || "");
                        setReceiptDate(draft.receiptDate || todayYMD());
                        toast.info("Draft restored from previous session.");
                    } else {
                        setReceiptDate(todayYMD());
                        setReceiptNo("");
                        setReceiptType("");
                    }
                }
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg.trim().toLowerCase() !== "fetch failed") {
                    setVerifyError(msg);
                    toast.error(`Verify failed: ${msg}`);
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
                setListError(e instanceof Error ? e.message : String(e));
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
                setVerifyError(e instanceof Error ? e.message : String(e));
            }
        },
        [list, openPOByBarcode, openPOById]
    );

    const verifyPO = React.useCallback(async () => {
        try {
            await openPOByBarcode(poBarcode);
        } catch (e: unknown) {
            setVerifyError(e instanceof Error ? e.message : String(e));
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

            // Also remove from local buffer if it exists
            setLocalScannedRfids((buffer) => buffer.filter(b => b.rfid !== row.rfid));

            return prev.filter((a) => a.id !== id);
        });
    }, []);

    const scanRFID = React.useCallback(async (rfidOverride?: string) => {
        setScanError("");
        setLastMatched(null);

        const poId = selectedPO?.id;
        if (!poId) {
            playBeep("error");
            return setScanError("Select a PO first.");
        }

        const value = (rfidOverride ?? rfid).trim();
        if (!value) {
            playBeep("error");
            toast.error("Scan error");
            return setScanError("Scan RFID first.");
        }

        if (!activeProductId || !activePorId) {
            playBeep("error");
            return setScanError("Please select a target product from the list above before scanning.");
        }

        // Find the active product from allocations
        const activeItem = selectedPO.allocations
            .flatMap(a => a.items.map(it => ({ ...it, branchId: a.branch.id })))
            .find(it => it.porId === activePorId || it.id === activePorId);

        if (!activeItem) {
            playBeep("error");
            return setScanError("Active product is invalid.");
        }

        const targetPorId = String(activeItem.porId || activeItem.id);

        try {
            // ✅ 1. Session Duplicate Check (Client-side)
            const alreadyVerifiedInSession = activity.some((a) => a.rfid === value && a.status === "ok");
            const alreadyBuffered = localScannedRfids.some(r => r.rfid === value);
            if (alreadyVerifiedInSession || alreadyBuffered) {
                playBeep("error");
                setScanError(`Already scanned RFID (${value.slice(-6).toUpperCase()}) cannot be duplicated.`);
                return;
            }

            // ✅ 2. Database Check (Server-side)
            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "scan_rfid", poId: selectedPO.id, rfid: value }),
            });
            const j = await asJson(r);
            const data = j?.data as ScanRFIDResult | null;
            if (!data) {
                playBeep("error");
                setScanError("Failed to fetch scan data.");
                setRfid("");
                return;
            }

            // ✅ 3. Logic based on Backend Status
            if (data.status === "unknown" || data.status === "tagged") {
                const isTagged = data.status === "tagged";
                const realPorId = String(data.porId || "");
                const porIdToUse = realPorId ? realPorId : targetPorId;
                
                // Mismatch Check for tagged items (only if the tag belongs to a completely different product, not just resolving a temporary ID)
                if (isTagged && realPorId && targetPorId && realPorId !== targetPorId && !targetPorId.includes("-")) {
                    playBeep("error");
                    setScanError(`RFID Mismatch: This tag is already assigned to different product. Please use a fresh tag.`);
                    setRfid("");
                    return;
                }

                // If it's an Extra Product (has a temporary ID like '123-456'), update selectedPO with the REAL porId
                if (realPorId && targetPorId !== realPorId && targetPorId.includes("-")) {
                    setSelectedPO(prev => {
                        if (!prev) return prev;
                        const updated = { ...prev };
                        updated.allocations = updated.allocations.map(a => ({
                            ...a,
                            items: a.items.map(it => {
                                if (it.id === targetPorId || it.porId === targetPorId) {
                                    return { ...it, porId: realPorId, id: realPorId };
                                }
                                return it;
                            })
                        }));
                        return updated;
                    });

                    // ✅ Sync scannedCountByPorId
                    setScannedCountByPorId(prev => {
                        const next = { ...(prev ?? {}) };
                        if (next[targetPorId] !== undefined) {
                            next[realPorId] = (next[realPorId] || 0) + next[targetPorId];
                            delete next[targetPorId];
                        }
                        return next;
                    });

                    // ✅ Sync localScannedRfids
                    setLocalScannedRfids(prev => {
                        return (prev ?? []).map(t => {
                            if (String(t.porId) === String(targetPorId)) {
                                return { ...t, porId: realPorId };
                            }
                            return t;
                        });
                    });
                }

                // Buffer locally only for unknown tags
                if (!isTagged) {
                    const newBufferItem = {
                        rfid: data.rfid,
                        productId: activeProductId,
                        branchId: activeItem.branchId,
                        status: "unknown" as const,
                        productName: activeItem.name,
                        porId: porIdToUse
                    };
                    setLocalScannedRfids(prev => [newBufferItem, ...prev]);
                }

                // ✅ Check Over-Receiving AFTER confirmed success
                const currentScansTotal = (scannedCountByPorId[porIdToUse] || 0) + Number(activeItem.taggedQty || 0);
                const expected = Number(activeItem.expectedQty || 0);
                if (expected > 0 && currentScansTotal >= expected) {
                    toast.warning(`Over-Receiving: ${activeItem.name} now has ${currentScansTotal + 1} tags for ${expected} ordered.`);
                }

                setScannedCountByPorId(prev => ({
                    ...(prev ?? {}),
                    [porIdToUse]: (prev?.[porIdToUse] ?? 0) + 1,
                }));

                setActivity((prev) => [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        rfid: data.rfid,
                        productName: activeItem.name,
                        productId: activeProductId,
                        porId: porIdToUse,
                        time: new Date().toISOString(),
                        status: "ok",
                    },
                    ...prev,
                ]);

                playBeep("success");
                setRfid("");
                return;
            }

            // ✅ Already Received Check (status === "received")
            if (data?.alreadyReceived || data.status === "received") {
                setActivity((prev) => [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        rfid: data.rfid,
                        productName: data.productName || "Unknown Product",
                        productId: data.productId || "",
                        porId: String(data?.porId ?? ""),
                        time: data.time || new Date().toISOString(),
                        status: "warn",
                    },
                    ...prev,
                ]);
                playBeep("error");
                setScanError("Duplicate Scan: This tag has already been received and saved.");
                setRfid("");
                return;
            }

            playBeep("success");
            setRfid("");
        } catch (e: unknown) {
            playBeep("error");
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.trim().toLowerCase() !== "fetch failed") {
                setScanError(msg);
            }
        }
    }, [selectedPO, rfid, activity, localScannedRfids, activeProductId, activePorId, scannedCountByPorId]);
    const addExtraProductLocally = React.useCallback((item: { productId: string; name: string; barcode: string; branchId: string; branchName: string; unitPrice?: number; discountType?: string; discountPercent?: number; uom?: string; sku?: string; }) => {
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
                const uPrice = item.unitPrice || 0;
                const dPct = item.discountPercent || 0;
                const dAmt = Number((uPrice * (dPct / 100)).toFixed(2));

                branchAlloc.items = [...branchAlloc.items, {
                    id: `${item.productId}-${item.branchId}`,
                    productId: String(item.productId),
                    name: item.name,
                    barcode: item.sku || item.barcode,
                    uom: item.uom || "BOX",
                    expectedQty: 0,
                    receivedQty: 0,
                    requiresRfid: true,
                    taggedQty: 0,
                    rfids: [],
                    isReceived: false,
                    unitPrice: uPrice,
                    discountType: item.discountType || "Standard",
                    discountAmount: dAmt,
                    netAmount: 0,
                    isExtra: true
                }];
            }

            updated.allocations = allocs;
            return updated;
        });
    }, []);

    const removeExtraProductLocally = React.useCallback((porId: string) => {
        setSelectedPO(prev => {
            if (!prev) return prev;
            const updated = { ...prev };
            updated.allocations = updated.allocations.map(a => ({
                ...a,
                items: a.items.filter(i => (i.porId || i.id) !== porId || !i.isExtra)
            }));
            return updated;
        });
        setVerifiedPorIds(prev => prev.filter(id => id !== porId));
        setScannedCountByPorId(prev => {
            const next = { ...prev };
            delete next[porId];
            return next;
        });
        setLocalScannedRfids(prev => prev.filter(r => r.porId !== porId));
        setActivity(prev => prev.filter(a => a.porId !== porId));
    }, []);

    const toggleProductVerification = React.useCallback((porId: string) => {
        setVerifiedPorIds(prev => {
            if (prev.includes(porId)) return prev.filter(id => id !== porId);
            return [...prev, porId];
        });
    }, []);

    const getSupplierProducts = React.useCallback(async (supplierId: string) => {
        try {
            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "get_supplier_products", supplierId }),
            });
            const j = await asJson(r);
            return j?.data || [];
        } catch {
            return [];
        }
    }, []);



    const markProductAsVerified = React.useCallback((productId: string, porId: string) => {
        setVerifiedPorIds(prev => {
            if (prev.includes(porId)) return prev;
            return [...prev, porId];
        });
        setActiveProductId(productId);
        setActivePorId(porId);
    }, []);


    const saveReceipt = React.useCallback(async (porMetaData?: Record<string, { lotId: string; batchNo: string; expiryDate: string }>) => {
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

        const counts = scannedCountByPorId ?? {};
        if (!Object.keys(counts).length) return setSaveError("Scan at least 1 RFID before saving.");

        setSavingReceipt(true);
        try {
            const oldReceiptNo = receiptNo.trim();
            const newTags = (localScannedRfids ?? []).map(t => ({
                rfid: t.rfid,
                productId: t.productId,
                porId: t.porId,
            }));

            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "save_receipt",
                    receiverId,
                    poId,
                    receiptNo: oldReceiptNo,
                    receiptType: receiptType.trim(),
                    receiptDate: receiptDate.trim(),
                    porCounts: counts,
                    porMetaData: porMetaData ?? {},
                    newTags
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
            const allItems = allocs.flatMap((a: { items: ReceivingPOItem[] }) => Array.isArray(a?.items) ? a.items : []);

            // Calculate if fully received across all items
            const countsMap = counts || {};
            const isFullyReceivedNow = allItems.every((it: ReceivingPOItem) => {
                const scannedNow = Number(countsMap[it.porId || it.id] || 0);
                return (Number(it.receivedQty) + scannedNow) >= Number(it.expectedQty);
            });

            const savedItems: SavedItem[] = (allItems as ReceivingPOItem[]).map((it) => {
                const porId = String(it.porId || it.id);
                const scannedNow = Number(countsMap[porId] || 0);
                const itemRfids = activity
                    .filter((a: ActivityRow) => a.status === "ok" && String(a.porId) === porId)
                    .map((a: ActivityRow) => a.rfid);

                const meta = (porMetaData && typeof porMetaData === "object") ? porMetaData[porId] : null;

                return {
                    productId: it.productId,
                    name: it.name,
                    barcode: it.barcode,
                    expectedQty: Number(it.expectedQty),
                    receivedQtyAtStart: Number(it.receivedQty) - scannedNow, // already matched in detail
                    receivedQtyNow: scannedNow,
                    rfids: Array.from(new Set(itemRfids)),
                    lotId: meta?.lotId,
                    batchNo: meta?.batchNo,
                    expiryDate: meta?.expiryDate,
                    unitPrice: Number(it.unitPrice) || 0,
                    discountAmount: Number(it.discountAmount) || 0,
                    discountType: it.discountType || "Standard",
                    uom: it.uom || "BOX"
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
                savedAt: Date.now(),
                isInvoice: selectedPO?.isInvoice ?? false
            });

            refreshList();
            // ✅ PERSISTENCE: Clear draft on successful save
            clearDraft(String(poId));
            resetSession();

            // ✅ IMPORTANT: prepare a new receipt immediately (supports multiple receipts)
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
    }, [selectedPO, receiptNo, receiptType, receiptDate, scannedCountByPorId, refreshList, resetSession, localScannedRfids, activity, receiverId]);

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

        metaDataByPorId,
        setMetaDataByPorId,

        addExtraProductLocally,
        removeExtraProductLocally,

        // ✅ CHECKLIST
        verifiedPorIds,
        toggleProductVerification,
        getSupplierProducts,

        // ✅ LEGACY COMPAT (used by TagRFIDStep)
        markProductAsVerified,
        activeProductId,
        setActiveProductId,
        activePorId,
        setActivePorId,
        localScannedRfids,

        // ✅ LOTS
        lots,
        lotsLoading,

        // ✅ UNITS
        units,
        unitsLoading,
    };

    return <ReceivingProductsContext.Provider value={value}>{children}</ReceivingProductsContext.Provider>;
}

export function useReceivingProducts() {
    const ctx = React.useContext(ReceivingProductsContext);
    if (!ctx) throw new Error("useReceivingProducts must be used within ReceivingProductsProvider");
    return ctx;
}

function genReceiptNo() {
    return `REC-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}
