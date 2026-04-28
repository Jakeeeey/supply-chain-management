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
    isInvoice?: boolean;
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

    // ✅ NEW: Verification/Checklist
    verifiedProductIds: string[];
    toggleProductVerification: (productId: string) => void;
    
    // ✅ NEW: Extra Product
    getSupplierProducts: (supplierId: string) => Promise<{ productId: string; name: string; sku: string; barcode: string; unitPrice: number; uom: string; discountType: string; discountPercent: number; }[]>;
    addExtraProductLocally: (item: { productId: string; name: string; barcode: string; branchId: string; branchName: string; unitPrice?: number; discountType?: string; discountPercent?: number; uom?: string; sku?: string; }) => boolean;
    removeExtraProductLocally: (productId: string) => void;

    // ✅ METADATA (Batch, Lot, Expiry)
    metaDataByPorId: Record<string, { batchNo?: string; lotNo?: string; lotId?: string; expiryDate?: string }>;
    setMetaDataByPorId: React.Dispatch<React.SetStateAction<Record<string, { batchNo?: string; lotNo?: string; lotId?: string; expiryDate?: string }>>>;

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

// ✅ PERSISTENCE: localStorage helpers
const DRAFT_KEY_PREFIX = "scm_manual_draft_";
function getDraftKey(poId: string) { return `${DRAFT_KEY_PREFIX}${poId}`; }

type DraftState = {
    manualCounts: Record<string, number>;
    verifiedProductIds: string[];
    receiptNo: string;
    receiptType: string;
    receiptDate: string;
    metaDataByPorId?: Record<string, { batchNo?: string; lotNo?: string; lotId?: string; expiryDate?: string }>;
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
        // Ignored
    }
};

export function ReceivingProductsManualProvider({ children, receiverId }: { children: React.ReactNode, receiverId?: number }) {
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
    const [verifiedProductIds, setVerifiedProductIds] = React.useState<string[]>([]);

    // ✅ METADATA
    const [metaDataByPorId, setMetaDataByPorId] = React.useState<Record<string, { batchNo?: string; lotNo?: string; lotId?: string; expiryDate?: string }>>({});

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

    const resetSession = React.useCallback((opts?: { clearStorage?: boolean; poId?: string }) => {
        setSaveError("");
        setManualCounts({});
        setVerifiedProductIds([]);
        if (opts?.clearStorage && opts?.poId) {
            clearDraft(opts.poId);
        }
    }, []);

    // ✅ PERSISTENCE: Auto-save draft to localStorage whenever count/state changes
    React.useEffect(() => {
        const poId = selectedPO?.id;
        if (!poId) return;
        // Only save if there's meaningful data
        if (Object.keys(manualCounts).length === 0) return;
        saveDraft(poId, {
            manualCounts,
            verifiedProductIds,
            receiptNo,
            receiptType,
            receiptDate,
            metaDataByPorId,
            savedAt: Date.now(),
        });
    }, [selectedPO?.id, manualCounts, verifiedProductIds, receiptNo, receiptType, receiptDate, metaDataByPorId]);

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

                // ✅ PERSISTENCE: Restore draft if available
                const draft = detail?.id ? loadDraft(detail.id) : null;
                const hasDraftData = draft ? (
                    Object.keys(draft.manualCounts || {}).length > 0 ||
                    (draft.verifiedProductIds && draft.verifiedProductIds.length > 0) ||
                    Object.keys(draft.metaDataByPorId || {}).length > 0
                ) : false;

                if (hasDraftData && draft) {
                    setManualCounts(draft.manualCounts || {});
                    setVerifiedProductIds(draft.verifiedProductIds || []);
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

                // ✅ PERSISTENCE: Restore draft if available
                const draft = detail?.id ? loadDraft(detail.id) : null;
                const hasDraftData = draft ? (
                    Object.keys(draft.manualCounts || {}).length > 0 ||
                    (draft.verifiedProductIds && draft.verifiedProductIds.length > 0)
                ) : false;

                if (hasDraftData && draft) {
                    setManualCounts(draft.manualCounts || {});
                    setVerifiedProductIds(draft.verifiedProductIds || []);
                    setReceiptNo(draft.receiptNo || "");
                    setReceiptType(draft.receiptType || "");
                    setReceiptDate(draft.receiptDate || todayYMD());
                    toast.info("Draft restored from previous session.");
                } else {
                    setReceiptDate(todayYMD());
                    setReceiptNo("");
                    setReceiptType("");
                }

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
            const sid = selectedPO?.supplier?.id;
            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "lookup_product", barcode, supplierId: sid }),
            });
            const j = await asJson(r);
            return j?.data || null;
        } catch {
            return null;
        }
    }, [selectedPO?.supplier?.id]);

    // ✅ NEW: Add extra product locally with duplicate check
    const addExtraProductLocally = React.useCallback((item: { productId: string; name: string; barcode: string; branchId: string; branchName: string; unitPrice?: number; discountType?: string; discountPercent?: number; uom?: string; sku?: string; }) => {
        let added = false;
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
                    porId: "",
                    productId: String(item.productId),
                    branchId: String(item.branchId),
                    name: item.name,
                    barcode: item.sku || item.barcode,
                    uom: item.uom || "—",
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
                added = true;
            }

            updated.allocations = allocs;
            return updated;
        });
        
        // Auto-verify if added
        if (added) {
            setVerifiedProductIds(prev => [...new Set([...prev, item.productId])]);
        }
        return added;
    }, []);

    const removeExtraProductLocally = React.useCallback((productId: string) => {
        setSelectedPO(prev => {
            if (!prev) return prev;
            const updated = { ...prev };
            updated.allocations = updated.allocations.map(a => ({
                ...a,
                items: a.items.filter(i => i.productId !== productId || !i.isExtra)
            }));
            return updated;
        });
        setVerifiedProductIds(prev => prev.filter(id => id !== productId));
        setManualCounts(prev => {
            const next = { ...prev };
            // Find all instances across branches (unlikely for extra but safe)
            delete next[productId]; 
            // In manual receiving, IDs in manualCounts are often productId or productId-branchId
            // Let's just clear anything matching
            Object.keys(next).forEach(k => {
                if (k.startsWith(`${productId}-`)) delete next[k];
            });
            return next;
        });
    }, []);

    const toggleProductVerification = React.useCallback((productId: string) => {
        setVerifiedProductIds(prev => {
            if (prev.includes(productId)) return prev.filter(id => id !== productId);
            return [...prev, productId];
        });
    }, []);

    // ✅ NEW: Supplier Products Fetching
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

        // ✅ SNAPSHOT items and counts BEFORE the API call so they survive state resets
        const snapshotAllocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const snapshotItems = snapshotAllocs.flatMap((a: { items: ReceivingPOItem[] }) =>
            Array.isArray(a?.items) ? a.items : []
        );
        const snapshotCounts = { ...counts };

        setSavingReceipt(true);
        try {
            const oldReceiptNo = receiptNo.trim();

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
                }),
            });
            const j = await asJson(r);

            const detail = j?.data?.detail ?? null;
            if (detail) {
                setSelectedPO(detail);
                setPoBarcode(detail?.poNumber ?? "");
            }

            // ✅ Build saved items from API detail if available, else fallback to snapshot
            const sourceAllocs = detail?.allocations ?? snapshotAllocs;
            const sourceItems = (Array.isArray(sourceAllocs) ? sourceAllocs : []).flatMap(
                (a: { items: ReceivingPOItem[] }) => Array.isArray(a?.items) ? a.items : []
            );
            const itemsToUse = sourceItems.length > 0 ? sourceItems : snapshotItems;

            // Calculate if fully received
            const isFullyReceivedNow = itemsToUse.every((it: ReceivingPOItem) => {
                const scannedNow = Number(snapshotCounts[it.id] || 0);
                return (Number(it.receivedQty) + scannedNow) >= Number(it.expectedQty);
            });

            const savedItems: SavedItem[] = itemsToUse.map((it: ReceivingPOItem) => {
                // ✅ Try literal ID first, then fallback to productId-branchId key
                const scannedNow = Number(snapshotCounts[it.id] || snapshotCounts[`${it.productId}-${it.branchId}`] || 0);

                return {
                    productId: String(it.productId),
                    name: String(it.name),
                    barcode: String(it.barcode),
                    expectedQty: Number(it.expectedQty),
                    receivedQtyAtStart: Number(it.receivedQty || 0),
                    receivedQtyNow: scannedNow,
                    unitPrice: Number(it.unitPrice) || 0,
                    discountAmount: Number(it.discountAmount) || 0,
                    uom: String(it.uom || ""),
                    batchNo: porMetaData?.[it.id]?.batchNo || porMetaData?.[`${it.productId}-${it.branchId}`]?.batchNo || "",
                    lotId: porMetaData?.[it.id]?.lotNo || porMetaData?.[`${it.productId}-${it.branchId}`]?.lotNo || "",
                    expiryDate: porMetaData?.[it.id]?.expiryDate || porMetaData?.[`${it.productId}-${it.branchId}`]?.expiryDate || "",
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
                savedAt: Date.now(),
                isInvoice: detail?.isInvoice ?? selectedPO?.isInvoice
            });

            refreshList();
            resetSession({ clearStorage: true, poId: String(poId) });

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
    }, [selectedPO, receiptNo, receiptType, receiptDate, manualCounts, refreshList, resetSession, receiverId]);

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

        metaDataByPorId,
        setMetaDataByPorId,

        // ✅ NEW
        verifiedProductIds,
        toggleProductVerification,
        getSupplierProducts,
        addExtraProductLocally,
        removeExtraProductLocally,

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
