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
};

type ScanRFIDResult = {
    porId: string;
    rfid: string;
    productId: string;
    productName: string;
    sku: string;
    time: string;
    alreadyReceived?: boolean;
    status?: "unknown" | "known" | "error";
};

export type ActivityRow = {
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
    lotId?: string;
    batchNo?: string;
    expiryDate?: string;
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

    // ✅ LOCAL BUFFER: Unsaved tags in memory
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



    // ✅ EXTRA: Add Product via Barcode
    lookupProduct: (barcode: string) => Promise<{ productId: string; name: string; barcode: string; unitPrice: number } | null>;
    addExtraProductLocally: (item: { productId: string; name: string; barcode: string; branchId: string; branchName: string; unitPrice?: number }) => void;

    // ✅ NEW FLOW: Product Barcode Verification
    verifiedBarcodes: string[];
    verifyBarcode: (barcode: string) => Promise<boolean>;
    markProductAsVerified: (productId: string) => void;
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

function genReceiptNo() {
    return `REC-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

const API_URL = "/api/scm/supplier-management/purchase-order-receiving-rfid";

// ✅ PERSISTENCE: localStorage helpers
const DRAFT_KEY_PREFIX = "scm_rfid_draft_";
function getDraftKey(poId: string) { return `${DRAFT_KEY_PREFIX}${poId}`; }

type DraftState = {
    localScannedRfids: Ctx["localScannedRfids"];
    activity: ActivityRow[];
    scannedCountByPorId: Record<string, number>;
    verifiedBarcodes: string[];
    receiptNo: string;
    receiptType: string;
    receiptDate: string;
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
    const [verifiedBarcodes, setVerifiedBarcodes] = React.useState<string[]>([]);
    const [activeProductId, setActiveProductId] = React.useState<string | null>(null);

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
        setVerifiedBarcodes([]);
        setActiveProductId(null);
        if (opts?.clearStorage && opts?.poId) {
            clearDraft(opts.poId);
        }
    }, []);

    // ✅ PERSISTENCE: Auto-save draft to localStorage whenever tagging state changes
    React.useEffect(() => {
        const poId = selectedPO?.id;
        if (!poId) return;
        // Only save if there's meaningful data
        if (localScannedRfids.length === 0 && activity.length === 0 && verifiedBarcodes.length === 0) return;
        saveDraft(poId, {
            localScannedRfids,
            activity,
            scannedCountByPorId,
            verifiedBarcodes,
            receiptNo,
            receiptType,
            receiptDate,
            savedAt: Date.now(),
        });
    }, [selectedPO?.id, localScannedRfids, activity, scannedCountByPorId, verifiedBarcodes, receiptNo, receiptType, receiptDate]);

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
                        (draft.verifiedBarcodes && draft.verifiedBarcodes.length > 0)
                    ) : false;

                    if (hasDraftData && draft) {
                        setLocalScannedRfids(draft.localScannedRfids);
                        setActivity(draft.activity);
                        setScannedCountByPorId(draft.scannedCountByPorId);
                        setVerifiedBarcodes(draft.verifiedBarcodes);
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
                        (draft.verifiedBarcodes && draft.verifiedBarcodes.length > 0)
                    ) : false;

                    if (hasDraftData && draft) {
                        setLocalScannedRfids(draft.localScannedRfids);
                        setActivity(draft.activity);
                        setScannedCountByPorId(draft.scannedCountByPorId);
                        setVerifiedBarcodes(draft.verifiedBarcodes);
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

        if (!activeProductId) {
            playBeep("error");
            return setScanError("Please select a target product from the list above before scanning.");
        }

        // Find the active product from allocations
        const activeItem = selectedPO.allocations
            .flatMap(a => a.items.map(it => ({ ...it, branchId: a.branch.id })))
            .find(it => it.productId === activeProductId);

        if (!activeItem) {
            playBeep("error");
            return setScanError("Active product is invalid.");
        }

        const targetPorId = String(activeItem.porId || activeItem.id);
        const currentScansInSession = (scannedCountByPorId[targetPorId] || 0);
        const alreadyTaggedOnServer = Number(activeItem.taggedQty || 0);
        const currentScansTotal = currentScansInSession + alreadyTaggedOnServer;

        const expected = Number(activeItem.expectedQty || 0);
        const isExtra = !activeItem.expectedQty;
        // Limit applies if it's NOT an extra product and expected > 0
        const limit = expected > 0 ? expected : Infinity; 

        if (!isExtra && currentScansTotal >= limit) {
            playBeep("error");
            return setScanError(`Quantity limit reached (${limit}) for ${activeItem.name}.`);
        }

        try {
            // ✅ Block duplicate session check (both activity and local buffers)
            const alreadyVerifiedInSession = activity.some((a) => a.rfid === value && a.status === "ok");
            const alreadyBuffered = localScannedRfids.some(r => r.rfid === value);
            if (alreadyVerifiedInSession || alreadyBuffered) {
                playBeep("error");
                setScanError(`Already scanned RFID (${value.slice(-6).toUpperCase()}) cannot be duplicated.`);
                return;
            }

            const r = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "scan_rfid", poId, rfid: value }),
            });
            const j = await asJson(r);
            const data = j?.data as ScanRFIDResult | null;
            if (!data) {
                playBeep("error");
                setScanError("Failed to fetch scan data.");
                setRfid("");
                return;
            }

            if (data.status === "unknown") {
                // Buffer locally, do not hit tagAndReceive yet
                const newBufferItem = {
                    rfid: data.rfid,
                    productId: activeItem.productId,
                    branchId: activeItem.branchId,
                    status: "unknown" as const,
                    productName: activeItem.name,
                    porId: targetPorId // Temporarily map to UI porId
                };
                
                setLocalScannedRfids(prev => [newBufferItem, ...prev]);

                setScannedCountByPorId(prev => ({
                    ...(prev ?? {}),
                    [targetPorId]: (prev?.[targetPorId] ?? 0) + 1,
                }));

                setActivity((prev) => [
                    {
                        id: `${Date.now()}-${Math.random()}`,
                        rfid: data.rfid,
                        productName: activeItem.name,
                        productId: activeItem.productId,
                        porId: targetPorId,
                        time: new Date().toISOString(),
                        status: "ok",
                    },
                    ...prev,
                ]);

                playBeep("success");
                setRfid("");
                return;
            }

            // Known tag
            const porId = String(data?.porId ?? "");
            if (!porId) {
                playBeep("error");
                setScanError("Invalid scan result (missing porId).");
                setRfid("");
                return;
            }

            // Must match the currently active product!
            if (porId !== targetPorId) {
                 playBeep("error");
                 setScanError(`This RFID belongs to a different product on this PO. Please select the correct product.`);
                 setRfid("");
                 return;
            }

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
                playBeep("error");
                setScanError("This RFID is already received. It was not counted again.");
                setRfid("");
                return;
            }

            // Store as purely locally verified
            const newBufferItem = {
                rfid: data.rfid,
                productId: activeItem.productId,
                branchId: activeItem.branchId,
                status: "known" as const,
                productName: activeItem.name,
                porId
            };
            setLocalScannedRfids(prev => [newBufferItem, ...prev]);

            setScannedCountByPorId((prev) => ({
                ...(prev ?? {}),
                [porId]: (prev?.[porId] ?? 0) + 1,
            }));

            setActivity((prev) => [
                {
                    id: `${Date.now()}-${Math.random()}`,
                    rfid: data.rfid,
                    productName: data.productName ?? "Tagged Item",
                    productId: data.productId ?? "",
                    porId,
                    time: data.time || new Date().toISOString(),
                    status: "ok",
                },
                ...prev,
            ]);

            playBeep("success");
            setLastMatched(data);
            setRfid("");
        } catch (e: unknown) {
            playBeep("error");
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.trim().toLowerCase() !== "fetch failed") {
                setScanError(msg);
            }
        }
    }, [selectedPO, rfid, activity, localScannedRfids, activeProductId, scannedCountByPorId]);



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
                    id: String(item.productId),
                    productId: String(item.productId),
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

    // ✅ NEW FLOW: Product Barcode Verify Function
    const verifyBarcode = React.useCallback(async (barcode: string) => {
        if (!selectedPO) return false;
        
        const code = String(barcode).trim().toLowerCase();
        if (!code) return false;
        
        const allocs = Array.isArray(selectedPO.allocations) ? selectedPO.allocations : [];
        let matchingItem = null;
        
        // Find matching item in PO
        for (const alloc of allocs) {
            for (const item of alloc.items) {
                if (
                    String(item.barcode).toLowerCase() === code || 
                    String(item.productId) === code || 
                    String(item.uom).toLowerCase() === code
                ) {
                    // ✅ Enforce "BOX" UOM rule (unit_id_val === 11 or shortcut "BOX")
                    const uomTrimmed = String(item.uom || "").trim().toUpperCase();
                    if (uomTrimmed === "BOX") {
                        matchingItem = item;
                        break;
                    }
                }
            }
            if (matchingItem) break;
        }
        
        if (!matchingItem) {
            // ✅ EXTRA PRODUCT LOGIC
            setScanError(""); // clear previous
            playBeep("success"); // just checking DB
            const extraMatch = await lookupProduct(code);
            if (!extraMatch) {
                playBeep("error");
                setScanError(`Product not found in this Purchase Order, and not found in Master Catalog.`);
                return false;
            }
            
            // Note: Currently, backend doesn't check UOM of Extra Products. Assuming they are acceptable as box/unit depending on what was looked up.
            // Add extra product to local PO state first
            // Take the first branch of the PO if it exists, or just a dummy branch.
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
            
            matchingItem = { productId: extraMatch.productId };
        }
        
        // Ensure not already verified
        if (verifiedBarcodes.includes(matchingItem.productId)) {
            playBeep("error");
            setScanError("Product already verified for this session.");
            return false;
        }
        
        // Add to verified list
        setVerifiedBarcodes(prev => [...prev, matchingItem!.productId]);
        
        playBeep("success");
        setScanError("");
        return true;
    }, [selectedPO, verifiedBarcodes, lookupProduct, addExtraProductLocally]);

    const markProductAsVerified = React.useCallback((productId: string) => {
        setVerifiedBarcodes(prev => {
            if (prev.includes(productId)) return prev;
            return [...prev, productId];
        });
        setActiveProductId(productId);
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
                    newTags: localScannedRfids.filter(r => r.status === "unknown").map(r => ({ rfid: r.rfid, productId: r.productId, branchId: r.branchId }))
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
                    expiryDate: meta?.expiryDate
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
            // ✅ PERSISTENCE: Clear draft on successful save
            clearDraft(String(poId));
            resetSession();

            // ✅ IMPORTANT: prepare a new receipt immediately (supports multiple receipts)
            setReceiptDate(todayYMD());
            setReceiptNo(genReceiptNo());
            setReceiptType("");
        } catch (e: unknown) {
            const msg = (e as Error)?.message ?? String(e);
            setSaveError(msg);
            toast.error(`Save failed: ${msg}`);
        } finally {
            setSavingReceipt(false);
        }
    }, [selectedPO, receiptNo, receiptType, receiptDate, scannedCountByPorId, refreshList, resetSession, localScannedRfids, activity]);

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



        lookupProduct,
        addExtraProductLocally,

        verifiedBarcodes,
        verifyBarcode,
        markProductAsVerified,
        activeProductId,
        setActiveProductId,
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
