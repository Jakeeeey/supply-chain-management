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

// ✅ shadcn only
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// icons
import { ChevronRight, Loader2, Plus, ScanLine, X } from "lucide-react";

type Ctx = {
    loadingList: boolean;
    list: POListItem[];
    selectedListId: string | null;

    // ✅ ADDITIVE (needed for UI selection)
    setSelectedListId: (v: string | null) => void;

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

export function ReceivingProductsProvider({ children }: { children: React.ReactNode }) {
    const [loadingList, setLoadingList] = React.useState(true);
    const [list, setList] = React.useState<POListItem[]>([]);
    const [selectedListId, setSelectedListId] = React.useState<string | null>(null);

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

    const setReceipt = (patch: Partial<ReceiptForm>) => setReceiptState((prev) => ({ ...prev, ...patch }));

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
                const res = await fetch("/api/scm/supplier-management/receiving-products", { method: "GET" });
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

        const item = alloc.items.find((x) => x.barcode.toLowerCase() === b.toLowerCase());

        // If not found in branch, allow searching across all allocations (still show error via no-op)
        const fallback = item ?? po.allocations.flatMap((a) => a.items).find((x) => x.barcode === b);

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
        setSelectedListId,

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

    return <ReceivingProductsContext.Provider value={value}>{children}</ReceivingProductsContext.Provider>;
}

export function useReceivingProducts() {
    const ctx = React.useContext(ReceivingProductsContext);
    if (!ctx) throw new Error("useReceivingProducts must be used within provider");
    return ctx;
}

/* =========================
   ✅ UI (Wireframe Shell)
   ========================= */

function asAny<T>(v: T) {
    return v as any;
}

function fmtMoney(n: any) {
    const num = typeof n === "number" ? n : Number(n ?? 0);
    if (Number.isNaN(num)) return "₱0.00";
    return `₱${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Stepper({ step }: { step: ReceivingStep }) {
    const steps = [
        { n: 1, label: "Scan PO" },
        { n: 2, label: "Receipt Details" },
        { n: 3, label: "Scan Products" },
    ] as const;

    return (
        <div className="flex items-center gap-2">
            {steps.map((s, idx) => {
                const active = step === (s.n as ReceivingStep);
                const done = step > (s.n as ReceivingStep);
                return (
                    <React.Fragment key={s.n}>
                        <div className="flex items-center gap-2">
                            <div
                                className={[
                                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                                    active ? "border-primary text-primary" : done ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                                ].join(" ")}
                            >
                                {s.n}
                            </div>
                            <div className={["text-sm", active ? "text-primary" : "text-muted-foreground"].join(" ")}>{s.label}</div>
                        </div>
                        {idx < steps.length - 1 ? <div className="mx-1 h-px flex-1 bg-border" /> : null}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function LeftPOList() {
    const { loadingList, list, selectedListId, setSelectedListId, setPoBarcode, goStep, po } = useReceivingProducts();

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Available for Receiving ({list?.length ?? 0})</CardTitle>
                <CardDescription className="text-sm">
                    Select a PO then scan/enter barcode to verify.
                </CardDescription>
            </CardHeader>

            <Separator />

            <CardContent className="p-0">
                <ScrollArea className="h-[420px] lg:h-[calc(100vh-260px)]">
                    <div className="p-2">
                        {loadingList ? (
                            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading purchase orders...
                            </div>
                        ) : list.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">No purchase orders available for receiving.</div>
                        ) : (
                            <div className="space-y-2">
                                {list.map((row) => {
                                    const r = asAny(row);
                                    const id = String(r.id ?? "");
                                    const poNo = String(r.poNumber ?? r.po_no ?? r.code ?? r.number ?? id);
                                    const supplier = String(r.supplierName ?? r.supplier ?? r.supplier_name ?? "—");
                                    const branches = Number(r.branchesCount ?? r.branches ?? 0);
                                    const items = Number(r.itemsCount ?? r.items ?? 0);
                                    const total = r.total ?? r.totalAmount ?? r.grandTotal ?? 0;
                                    const status = String(r.status ?? "");
                                    const active = selectedListId === id;

                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedListId(id);
                                                // convenience: fill input with PO number (still needs verify scan)
                                                setPoBarcode(poNo);
                                                if (!po) goStep(1);
                                            }}
                                            className={[
                                                "w-full rounded-lg border p-3 text-left transition",
                                                active ? "border-primary/60 bg-primary/5" : "hover:bg-muted/50",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="text-sm font-semibold">{poNo}</div>
                                                    <div className="text-sm text-muted-foreground">{supplier}</div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {status ? (
                                                        <Badge variant={status.toLowerCase() === "partial" ? "secondary" : "outline"} className="capitalize">
                                                            {status}
                                                        </Badge>
                                                    ) : null}
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <div>Branches: {branches}</div>
                                                <div className="text-right">Items: {items}</div>
                                                <div className="col-span-2">Total: {fmtMoney(total)}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function ScanPOStep() {
    const { poBarcode, setPoBarcode, verifyError, verifyPO, step, goStep, po, list, selectedListId } = useReceivingProducts();
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const selected = React.useMemo(() => {
        const row = list.find((x) => String(asAny(x).id) === String(selectedListId ?? ""));
        return row ? asAny(row) : null;
    }, [list, selectedListId]);

    React.useEffect(() => {
        if (step === 1) inputRef.current?.focus();
    }, [step]);

    const poNo = String(asAny(po)?.poNumber ?? asAny(po)?.po_no ?? asAny(po)?.code ?? asAny(selected)?.poNumber ?? asAny(selected)?.po_no ?? asAny(selected)?.code ?? "—");
    const supplier = String(asAny(po)?.supplier?.name ?? asAny(po)?.supplierName ?? asAny(selected)?.supplierName ?? asAny(selected)?.supplier ?? "—");

    return (
        <div className="space-y-5">
            <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium">Selected PO Details</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="text-muted-foreground">PO Number</div>
                    <div className="text-right font-medium">{poNo}</div>
                    <div className="text-muted-foreground">Supplier</div>
                    <div className="text-right font-medium">{supplier}</div>
                </div>
            </div>

            <div className="grid gap-2">
                <Label>PO Barcode</Label>
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={poBarcode}
                        onChange={(e) => setPoBarcode(e.target.value)}
                        placeholder="Scan or type PO barcode..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter") verifyPO();
                        }}
                    />
                    <Button type="button" variant="secondary" onClick={() => inputRef.current?.focus()}>
                        <ScanLine className="h-4 w-4" />
                    </Button>
                </div>
                {verifyError ? <div className="text-sm text-destructive">{verifyError}</div> : null}
            </div>

            <Button
                type="button"
                className="w-full"
                onClick={verifyPO}
            >
                Verify &amp; Continue
            </Button>

            <div className="text-xs text-muted-foreground">
                Note: most barcode scanners work as a keyboard — it will type into this field and press Enter.
            </div>
        </div>
    );
}

function ReceiptDetailsStep() {
    const { receipt, setReceipt, receiptTypes, goStep, po } = useReceivingProducts();

    const branchSummary = React.useMemo(() => {
        const allocations = asAny(po)?.allocations ?? [];
        return allocations.map((a: any) => ({
            id: String(a?.branch?.id ?? ""),
            name: String(a?.branch?.name ?? "Unassigned"),
            count: Number(a?.items?.length ?? 0),
        }));
    }, [po]);

    const canContinue =
        receipt.receiptNumber.trim() &&
        receipt.receiptTypeCode.trim() &&
        receipt.receiptDate.trim() &&
        receipt.lotNumber.trim() &&
        receipt.lotExpiration.trim();

    return (
        <div className="space-y-5">
            <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium">Products by Branch</div>
                <div className="mt-2 space-y-2">
                    {branchSummary.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No branch allocations found.</div>
                    ) : (
                        branchSummary.map((b) => (
                            <div key={b.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="inline-block h-4 w-1 rounded bg-emerald-500" />
                                    <div className="font-medium">{b.name}</div>
                                </div>
                                <div className="text-muted-foreground">{b.count} product(s)</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Receipt Number *</Label>
                <Input
                    value={receipt.receiptNumber}
                    onChange={(e) => setReceipt({ receiptNumber: e.target.value })}
                    placeholder="REC-0001"
                />
            </div>

            <div className="grid gap-2">
                <Label>Receipt Type *</Label>
                <Select value={receipt.receiptTypeCode} onValueChange={(v) => setReceipt({ receiptTypeCode: v })}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                        {receiptTypes.map((t) => (
                            <SelectItem key={t.code} value={t.code}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label>Receipt Date *</Label>
                <Input
                    type="date"
                    value={receipt.receiptDate}
                    onChange={(e) => setReceipt({ receiptDate: e.target.value })}
                />
            </div>

            <div className="grid gap-2">
                <Label>Lot Number *</Label>
                <Input value={receipt.lotNumber} onChange={(e) => setReceipt({ lotNumber: e.target.value })} placeholder="LOT-2025-001" />
            </div>

            <div className="grid gap-2">
                <Label>Lot Expiration *</Label>
                <Input
                    type="date"
                    value={receipt.lotExpiration}
                    onChange={(e) => setReceipt({ lotExpiration: e.target.value })}
                />
            </div>

            <Button type="button" className="w-full" onClick={() => goStep(3)} disabled={!canContinue}>
                Continue to Product Scanning
            </Button>
        </div>
    );
}

function ScanProductsStep() {
    const {
        po,
        selectedBranchId,
        setSelectedBranchId,
        scannedProductBarcode,
        setScannedProductBarcode,
        addByBarcode,
        selectedScannedItem,
        clearCurrentScanned,
        rfidValue,
        setRfidValue,
        attachRfidToCurrent,
        receivedLines,
        saveLoading,
        saveReceipt,
    } = useReceivingProducts();

    const productInputRef = React.useRef<HTMLInputElement | null>(null);
    const rfidInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        productInputRef.current?.focus();
    }, []);

    const branches = React.useMemo(() => {
        const allocations = asAny(po)?.allocations ?? [];
        return allocations.map((a: any) => ({
            id: String(a?.branch?.id ?? ""),
            name: String(a?.branch?.name ?? "Unassigned"),
            items: (a?.items ?? []) as POItem[],
        }));
    }, [po]);

    const currentAlloc = React.useMemo(() => branches.find((b) => b.id === selectedBranchId) ?? null, [branches, selectedBranchId]);

    const items = currentAlloc?.items ?? [];

    const totalReceivedThisSession = React.useMemo(
        () => receivedLines.reduce((sum, l) => sum + (l.receivedNowQty ?? 0), 0),
        [receivedLines]
    );

    const canSave = Boolean(selectedBranchId) && receivedLines.length > 0 && !saveLoading;

    return (
        <div className="space-y-5">
            <div className="grid gap-2">
                <Label>Select Branch for Receiving *</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select branch..." />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                                {b.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
                <div className="text-sm font-medium">Products in {currentAlloc?.name ?? "—"}</div>
                <div className="mt-3 space-y-2">
                    {selectedBranchId ? (
                        items.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No products in this branch.</div>
                        ) : (
                            items.map((it: any) => (
                                <div key={it.id} className="flex items-center justify-between text-sm">
                                    <div className="truncate pr-2">{it.name}</div>
                                    <div className="shrink-0 text-muted-foreground">
                                        {it.receivedQty ?? 0} / {it.expectedQty ?? 0}
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        <div className="text-sm text-muted-foreground">Select a branch to view products.</div>
                    )}
                </div>
            </div>

            {/* Scan Product & RFID */}
            <div className="rounded-lg border border-dashed p-4">
                <div className="text-sm font-semibold">Scan Product &amp; RFID</div>

                <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                        <div className="text-sm font-medium">1. Scan Product Barcode</div>
                        <div className="flex gap-2">
                            <Input
                                ref={productInputRef}
                                value={scannedProductBarcode}
                                onChange={(e) => setScannedProductBarcode(e.target.value)}
                                placeholder="Scan product barcode..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        addByBarcode(scannedProductBarcode);
                                        // keep cursor ready for next scan
                                        setTimeout(() => productInputRef.current?.select(), 0);
                                    }
                                }}
                                disabled={!selectedBranchId}
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => productInputRef.current?.focus()}
                                disabled={!selectedBranchId}
                            >
                                <ScanLine className="h-4 w-4" />
                            </Button>
                        </div>

                        {selectedScannedItem ? (
                            <div className="rounded-lg border bg-primary/5 p-3 text-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="font-semibold">{selectedScannedItem.name}</div>
                                        <div className="text-xs text-muted-foreground">Barcode: {selectedScannedItem.barcode}</div>
                                        {selectedScannedItem.requiresRfid ? (
                                            <Badge variant="outline" className="mt-1">Requires RFID</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="mt-1">Non-RFID</Badge>
                                        )}
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={clearCurrentScanned}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : scannedProductBarcode.trim() ? (
                            <div className="text-sm text-destructive">
                                Barcode not found in this PO / branch.
                            </div>
                        ) : null}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="text-sm font-medium">2. Attach RFID Sticker &amp; Scan RFID</div>
                        <div className="flex gap-2">
                            <Input
                                ref={rfidInputRef}
                                value={rfidValue}
                                onChange={(e) => setRfidValue(e.target.value)}
                                placeholder="Scan RFID tag..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        attachRfidToCurrent(rfidValue);
                                        setTimeout(() => rfidInputRef.current?.select(), 0);
                                    }
                                }}
                                disabled={!selectedScannedItem?.requiresRfid}
                            />
                            <Button
                                type="button"
                                onClick={() => attachRfidToCurrent(rfidValue)}
                                disabled={!selectedScannedItem?.requiresRfid}
                                className="shrink-0"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Place RFID sticker on the product, then scan the RFID to add to receipt.
                            (If your RFID reader acts like a keyboard, it will work here.)
                        </div>
                    </div>
                </div>
            </div>

            <Button type="button" className="w-full" onClick={saveReceipt} disabled={!canSave}>
                {saveLoading ? (
                    <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </span>
                ) : (
                    `Save Receipt (${totalReceivedThisSession} item${totalReceivedThisSession === 1 ? "" : "s"})`
                )}
            </Button>
        </div>
    );
}

function RightPanel() {
    const { step, po, goStep } = useReceivingProducts();

    const headerPoNo = String(asAny(po)?.poNumber ?? asAny(po)?.po_no ?? asAny(po)?.code ?? "—");
    const headerSupplier = String(asAny(po)?.supplier?.name ?? asAny(po)?.supplierName ?? "—");

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">
                    Receive: {headerPoNo}
                </CardTitle>
                <CardDescription>{headerSupplier}</CardDescription>

                <div className="mt-3">
                    <Stepper step={step} />
                </div>
            </CardHeader>

            <Separator />

            <CardContent className="p-4">
                <ScrollArea className="h-[420px] lg:h-[calc(100vh-260px)] pr-3">
                    {step === 1 ? <ScanPOStep /> : null}
                    {step === 2 ? <ReceiptDetailsStep /> : null}
                    {step === 3 ? <ScanProductsStep /> : null}

                    {/* small back control (wireframe-like flow, optional) */}
                    {step > 1 ? (
                        <div className="mt-6">
                            <Button type="button" variant="ghost" onClick={() => goStep(((step - 1) as any) as ReceivingStep)}>
                                Back
                            </Button>
                        </div>
                    ) : null}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function ReceivingProductsShell() {
    return (
        <div className="space-y-4">
            <div>
                <div className="text-2xl font-semibold tracking-tight">Receiving of Products</div>
                <div className="text-sm text-muted-foreground">
                    Scan and receive products from approved purchase orders (organized by delivery branch)
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
                <LeftPOList />
                <RightPanel />
            </div>
        </div>
    );
}

/* =========================
   ✅ DEFAULT EXPORT (FIXES ERROR)
   ========================= */

export default function ReceivingProductsModule() {
    return (
        <ReceivingProductsProvider>
            <ReceivingProductsShell />
        </ReceivingProductsProvider>
    );
}
