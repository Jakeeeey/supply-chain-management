"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, AlertCircle, XCircle, Pencil } from "lucide-react";
import { useReceivingProducts, ReceivingPOItem } from "../../providers/ReceivingProductsProvider";
import { toast } from "sonner";
import { ReceiptPreviewModal } from "../ReceiptPreviewModal";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatPHP = (val: number) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(val || 0);

const RECEIPT_TYPES = [
    { value: "SI-CHARGE", label: "Charge Sales Invoice [SI-CHARGE]" },
    { value: "SI-CASH", label: "Cash Sales Invoice [SI-CASH]" },
    { value: "DR", label: "Delivery Receipt [DR]" },
];

const API_URL = "/api/scm/supplier-management/purchase-order-receiving-rfid";

export function ReviewReceiptStep({ receiverName, onBack }: { receiverName?: string; onBack?: () => void }) {
    const {
        selectedPO,
        scannedCountByPorId,
        saveReceipt,
        savingReceipt,
        saveError,
        receiptSaved,
        lots,
        setMetaDataByPorId,
        receiptNo,
        setReceiptNo,
        receiptType,
        setReceiptType,
        receiptDate,
        setReceiptDate,
        editingReceiptId,
        clearEditingReceiptId,
        loadReceipt,
    } = useReceivingProducts();

    const [clientSaveError, setClientSaveError] = React.useState("");
    const [customCounts, setCustomCounts] = React.useState<Record<string, number>>({});
    const [selectedRows, setSelectedRows] = React.useState<Record<string, boolean>>({});
    const [currentPhase, setCurrentPhase] = React.useState<"select_products" | "enter_details">("select_products");

    React.useEffect(() => {
        setReviewPage(1);
    }, [currentPhase]);

    const physicalCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        if (selectedPO?.allocations) {
            selectedPO.allocations.forEach(a => {
                a.items.forEach(it => {
                    const porId = String(it.porId || it.id);
                    counts[porId] = Math.max(0, Number(it.taggedQty || 0) - Number(it.receivedQty || 0));
                });
            });
        }
        return counts;
    }, [selectedPO]);

    const lastInitializedRef = React.useRef<{ poId: string | null; editingReceiptId: string | null }>({ poId: null, editingReceiptId: null });

    React.useEffect(() => {
        if (!selectedPO) return;
        const poId = selectedPO.id;

        const isNewPO = lastInitializedRef.current.poId !== poId;
        const isNewEdit = editingReceiptId && lastInitializedRef.current.editingReceiptId !== editingReceiptId;
        // ✅ Detect cancel edit: editingReceiptId went from non-null to null
        const isCancelledEdit = !editingReceiptId && lastInitializedRef.current.editingReceiptId !== null;

        if (isNewPO || isNewEdit || isCancelledEdit) {
            if (editingReceiptId) {
                if (scannedCountByPorId && Object.keys(scannedCountByPorId).length > 0) {
                    lastInitializedRef.current = { poId, editingReceiptId };
                    setCustomCounts(scannedCountByPorId);
                    const initialSelected: Record<string, boolean> = {};
                    Object.entries(scannedCountByPorId).forEach(([porId, val]) => {
                        if (val > 0) {
                            initialSelected[porId] = true;
                        }
                    });
                    setSelectedRows(initialSelected);
                }
            } else if (selectedPO?.allocations) {
                lastInitializedRef.current = { poId, editingReceiptId: null };
                const counts: Record<string, number> = {};
                const initialSelected: Record<string, boolean> = {};
                selectedPO.allocations.forEach(a => {
                    a.items.forEach(it => {
                        const porId = String(it.porId || it.id);
                        counts[porId] = 0;
                        initialSelected[porId] = false;
                    });
                });
                setCustomCounts(counts);
                setSelectedRows(initialSelected);
                // ✅ Reset metadata fields when cancelling edit to clear stale reverted data
                if (isCancelledEdit) {
                    setLotIds({});
                    setBatchNos({});
                    setExpiryDates({});
                }
            }
        }
    }, [selectedPO, editingReceiptId, scannedCountByPorId]);
    const [lotIds, setLotIds] = React.useState<Record<string, string>>({});
    const [batchNos, setBatchNos] = React.useState<Record<string, string>>({});
    const [expiryDates, setExpiryDates] = React.useState<Record<string, string>>({});
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [isPartialModalOpen, setIsPartialModalOpen] = React.useState(false);
    const [reviewPage, setReviewPage] = React.useState(1);
    const [showErrors, setShowErrors] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const [receiptNoDupError, setReceiptNoDupError] = React.useState<string | null>(null);
    const [checkingDup, setCheckingDup] = React.useState(false);
    const dupCheckTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const { metaDataByPorId: draftMetaData } = useReceivingProducts();

    // Debounced Receipt Number duplicate check
    const checkReceiptNoDuplicate = React.useCallback((value: string) => {
        if (dupCheckTimer.current) clearTimeout(dupCheckTimer.current);
        const trimmed = value.trim();
        if (!trimmed || !selectedPO?.id) {
            setReceiptNoDupError(null);
            return;
        }
        dupCheckTimer.current = setTimeout(async () => {
            try {
                setCheckingDup(true);
                const r = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "check_receipt_no", receiptNo: trimmed, poId: selectedPO.id }),
                });
                const j = await r.json().catch(() => ({}));
                if (j?.data?.isDuplicate) {
                    setReceiptNoDupError(`This receipt number is already in use on PO #${j.data.existingPoId}.`);
                } else {
                    setReceiptNoDupError(null);
                }
            } catch {
                setReceiptNoDupError(null);
            } finally {
                setCheckingDup(false);
            }
        }, 400);
    }, [selectedPO?.id]);

    React.useEffect(() => {
        if (editingReceiptId) setReceiptNoDupError(null);
    }, [editingReceiptId]);

    // Initial Sync
    React.useEffect(() => {
        const newLots: Record<string, string> = {};
        const newBatches: Record<string, string> = {};
        const newExpiries: Record<string, string> = {};
        const syncReady = true;

        if (selectedPO?.allocations) {
            selectedPO.allocations.forEach(a => {
                a.items.forEach((it: ReceivingPOItem) => {
                    const porId = String(it.porId || it.id);
                    if (it.lot_id) newLots[porId] = String(it.lot_id);
                    if (it.batch_no) newBatches[porId] = it.batch_no;
                    if (it.expiry_date) newExpiries[porId] = it.expiry_date;
                });
            });
        }

        // Overlay draft data (crucial for reloading page)
        if (draftMetaData) {
            Object.entries(draftMetaData).forEach(([porId, meta]) => {
                if (meta.lotId) newLots[porId] = meta.lotId;
                if (meta.batchNo) newBatches[porId] = meta.batchNo;
                if (meta.expiryDate) newExpiries[porId] = meta.expiryDate;
            });
        }

        if (syncReady) {
            setLotIds(prev => ({ ...newLots, ...prev }));
            setBatchNos(prev => ({ ...newBatches, ...prev }));
            setExpiryDates(prev => ({ ...newExpiries, ...prev }));
        }

    }, [selectedPO?.id, selectedPO?.allocations, draftMetaData]);

    React.useEffect(() => {
        if (draftMetaData && Object.keys(draftMetaData).length > 0) {
            const newLots: Record<string, string> = {};
            const newBatches: Record<string, string> = {};
            const newExpiries: Record<string, string> = {};
            
            Object.entries(draftMetaData).forEach(([porId, meta]) => {
                if (meta.lotId) newLots[porId] = String(meta.lotId);
                if (meta.batchNo) newBatches[porId] = meta.batchNo;
                if (meta.expiryDate) {
                    newExpiries[porId] = meta.expiryDate.split("T")[0];
                }
            });

            setLotIds(prev => ({ ...prev, ...newLots }));
            setBatchNos(prev => ({ ...prev, ...newBatches }));
            setExpiryDates(prev => ({ ...prev, ...newExpiries }));
        }
    }, [draftMetaData]);

    React.useEffect(() => {
        const metaData: Record<string, { lotId: string; batchNo: string; expiryDate: string }> = {};
        let hasData = false;

        Object.keys(lotIds).forEach(id => {
            metaData[id] = { lotId: lotIds[id] || "", batchNo: batchNos[id] || "", expiryDate: expiryDates[id] || "" };
            hasData = true;
        });

        if (hasData) {
            const isDifferent = Object.keys(metaData).some(id => {
                const existing = draftMetaData?.[id];
                return !existing ||
                    existing.lotId !== metaData[id].lotId ||
                    existing.batchNo !== metaData[id].batchNo ||
                    existing.expiryDate !== metaData[id].expiryDate;
            }) || Object.keys(draftMetaData || {}).length !== Object.keys(metaData).length;

            if (isDifferent) {
                setMetaDataByPorId(metaData);
            }
        }
    }, [lotIds, batchNos, expiryDates, setMetaDataByPorId, draftMetaData]);

    React.useEffect(() => {
        if (!receiptSaved) return;
        toast.success(`Receipt ${receiptSaved.receiptNo} saved successfully.`);
        setClientSaveError("");
    }, [receiptSaved]);

    const safeCounts = customCounts;

    // All active products (the ones checked/verified)
    const allItems = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        return allocs.flatMap((a) => {
            const items = Array.isArray(a?.items) ? a.items : [];
            return items
                .map((it: ReceivingPOItem) => ({
                    ...it,
                    porId: String(it.porId || it.id),
                    branchName: a?.branch?.name ?? "Unassigned",
                }))
                .filter((it) => {
                    const hasPhysical = (physicalCounts[it.porId] || 0) > 0;
                    const hasCustom = (customCounts[it.porId] || 0) > 0;
                    return hasPhysical || hasCustom;
                }) as Array<ReceivingPOItem & { branchName: string }>;
        });
    }, [selectedPO, physicalCounts, customCounts]);

    const filteredItems = React.useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return allItems;
        return allItems.filter(
            (it) =>
                String(it.name || "").toLowerCase().includes(query) ||
                String(it.barcode || "").toLowerCase().includes(query)
        );
    }, [allItems, searchQuery]);

    const activeStep2Items = React.useMemo(() => {
        return allItems.filter((it) => {
            const porId = String(it.porId || it.id);
            const scanned = safeCounts[porId] ?? 0;
            return selectedRows[porId] && scanned > 0;
        });
    }, [allItems, selectedRows, safeCounts]);

    const filteredStep2Items = React.useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return activeStep2Items;
        return activeStep2Items.filter(
            (it) =>
                String(it.name || "").toLowerCase().includes(query) ||
                String(it.barcode || "").toLowerCase().includes(query)
        );
    }, [activeStep2Items, searchQuery]);

    const branchesLabel = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const names = allocs
            .map((a) => String(a?.branch?.name || "").trim())
            .filter(Boolean);
        if (!names.length) return "—";
        return Array.from(new Set(names)).join(", ");
    }, [selectedPO]);

    const progress = React.useMemo(() => {
        const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];
        const items = allocs.flatMap((a) => (Array.isArray(a?.items) ? a.items : []));
        const totalTagged = items.reduce((acc, it: ReceivingPOItem) => acc + (Number(it?.taggedQty) || 0), 0);
        const totalReceived = items.reduce((acc, it: ReceivingPOItem) => acc + (Number(it?.receivedQty) || 0), 0);
        return { totalTagged, totalReceived };
    }, [selectedPO]);

    const executeSave = async () => {
        const metaData: Record<string, { lotId: string; batchNo: string; expiryDate: string }> = {};
        Object.keys(lotIds).forEach(id => {
            metaData[id] = { lotId: lotIds[id] || "", batchNo: batchNos[id] || "", expiryDate: expiryDates[id] || "" };
        });
        await saveReceipt(metaData, customCounts);
        setIsPartialModalOpen(false);
    };

    const handleSaveReceipt = React.useCallback(async () => {
        const status = (selectedPO?.status || "").toUpperCase();
        if (status === "CLOSED" || status === "RECEIVED") {
            setClientSaveError("PO is already completed.");
            return;
        }

        // Validate Receipt details
        const errs: string[] = [];
        if (!receiptNo.trim()) errs.push("Receipt Number is required.");
        if (!receiptType.trim()) errs.push("Receipt Type is required.");
        if (!receiptDate.trim()) errs.push("Receipt Date is required.");

        if (receiptDate.trim()) {
            const parsedYear = new Date(receiptDate.trim()).getFullYear();
            if (isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 3000) {
                errs.push("Invalid year. Must be between 2000 and 3000.");
            }
        }

        if (receiptNoDupError) {
            errs.push(receiptNoDupError);
        }

        if (errs.length > 0) {
            setShowErrors(true);
            setClientSaveError(errs.join(" "));
            toast.error("Receipt Details Invalid", {
                description: errs.join(" ")
            });
            return;
        }

        const missingLotOrExpiry: string[] = [];
        allItems.forEach((it: ReceivingPOItem) => {
            const porId = String(it.porId || it.id);
            const scanned = safeCounts[porId] ?? 0;
            if (scanned > 0) {
                const batch = batchNos[porId] || "";
                const lot = lotIds[porId] || "";
                const exp = expiryDates[porId] || "";
                if (!batch.trim() || !lot.trim() || !exp.trim()) missingLotOrExpiry.push(it.name);
            }
        });

        if (missingLotOrExpiry.length > 0) {
            setShowErrors(true);
            toast.error("Required Fields Missing", {
                description: "Batch, Lot and Expiry Date are required for all tagged items."
            });
            return;
        }

        setClientSaveError("");

        // Check if Incomplete
        const isPartial = allItems.some((it: ReceivingPOItem) => {
            const porId = String(it.porId || it.id);
            const scanned = safeCounts[porId] ?? 0;
            const expected = Number(it.expectedQty || 0);
            return scanned < expected;
        });

        if (isPartial) {
            setIsPartialModalOpen(true);
            return;
        }

        const metaData: Record<string, { lotId: string; batchNo: string; expiryDate: string }> = {};
        Object.keys(lotIds).forEach(id => {
            metaData[id] = { lotId: lotIds[id] || "", batchNo: batchNos[id] || "", expiryDate: expiryDates[id] || "" };
        });

        await saveReceipt(metaData, customCounts);
    }, [saveReceipt, selectedPO?.status, allItems, safeCounts, customCounts, lotIds, batchNos, expiryDates, receiptNo, receiptType, receiptDate, receiptNoDupError]);

    const totalScanned = Object.values(safeCounts).reduce((a, b) => a + Number(b), 0);
    const totalPhysicalScanned = Object.values(physicalCounts).reduce((a, b) => a + Number(b), 0);
    const totalExpected = allItems.reduce((a, b) => a + Number(b.expectedQty || 0), 0);

    const financials = React.useMemo(() => {
        let gross = 0;
        let discount = 0;

        allItems.forEach((it: ReceivingPOItem) => {
            const porId = String(it.porId ?? it.id);
            const scanned = safeCounts[porId] ?? 0;
            const price = Number(it.unitPrice || 0);
            const discAmt = Number(it.discountAmount || 0);

            gross += (scanned * price);
            discount += (scanned * discAmt);
        });

        const net = Math.max(0, gross - discount);
        const priceType = selectedPO?.priceType || "VAT Inclusive";
        const isExclusive = priceType.toUpperCase() === "VAT EXCLUSIVE";

        let vatAmount = 0;
        let whtAmount = 0;
        let grandTotal = 0;

        if (isExclusive) {
            vatAmount = net * 0.12;
            whtAmount = net * 0.01;
            grandTotal = net;
        } else {
            // VAT Inclusive
            const vatableAmount = net / 1.12;
            vatAmount = net - vatableAmount;
            whtAmount = vatableAmount * 0.01;
            grandTotal = net;
        }

        return { gross, discount, net, vatAmount, whtAmount, grandTotal, isExclusive };
    }, [allItems, safeCounts, selectedPO?.priceType]);

    return (
        <div className="space-y-4">
            {/* ✅ Receipt History Section */}
            {!receiptSaved && selectedPO?.history && selectedPO.history.length > 0 && (
                <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Previous Receipts History
                    </div>
                    <div className="mt-3 space-y-2">
                        {selectedPO.history.map((h: { receiptNo: string; receiptDate?: string; itemsCount?: number; isPosted: boolean; isReverted?: boolean;[key: string]: unknown }) => (
                            <div
                                key={h.receiptNo}
                                className="flex items-center justify-between gap-3 text-xs border-b border-amber-500/10 pb-2 last:border-0 last:pb-0"
                            >
                                <div className="flex flex-col">
                                    <span className="font-mono font-medium text-amber-900 dark:text-amber-100">
                                        {h.receiptNo}
                                    </span>
                                    <span className="text-[10px] text-amber-700/70 dark:text-amber-400/60 font-mono mt-0.5">
                                        {h.receiptDate ? h.receiptDate.split("T")[0] : "—"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                        {h.itemsCount} {h.itemsCount === 1 ? "item" : "items"}
                                    </span>
                                    {h.isReverted ? (
                                        <>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] uppercase h-4 px-1 leading-none border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                            >
                                                Reverted
                                            </Badge>
                                            {editingReceiptId !== h.receiptNo && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 px-1.5 text-[10px] text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 gap-1"
                                                    onClick={() => loadReceipt(h.receiptNo)}
                                                    disabled={!!editingReceiptId}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                    Edit
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] uppercase h-4 px-1 leading-none font-bold",
                                                h.isPosted
                                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                                    : "bg-muted text-muted-foreground border-border"
                                            )}
                                        >
                                            {h.isPosted ? "Posted" : "Unposted"}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {receiptSaved ? (
                <Card className="p-6 border-green-500 shadow-md">
                    <h3 className="text-xl font-bold mb-2">Receipt Saved!</h3>
                    <p className="text-sm mb-4">You have successfully received items for {selectedPO?.poNumber}.</p>
                    <div className="flex gap-4">
                        <Button onClick={() => window.location.reload()} variant="outline">Start New Session</Button>
                        <Button onClick={() => setPreviewOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Print Receipt</Button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="p-4 border-primary/20 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-semibold">Receipt Header Details</div>
                                {editingReceiptId && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-orange-700 hover:bg-orange-100 font-bold uppercase gap-1"
                                        onClick={clearEditingReceiptId}
                                    >
                                        <XCircle className="h-4 w-4" /> Cancel Edit
                                    </Button>
                                )}
                            </div>

                            {editingReceiptId && (
                                <div className="mb-3 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded px-2.5 py-1 uppercase tracking-wider">
                                    Editing reverted receipt: {editingReceiptId}
                                </div>
                            )}

                            <div className="grid gap-3">
                                <div className="grid gap-1">
                                    <Label className="text-xs font-bold text-muted-foreground">Receipt Number *</Label>
                                    <Input
                                        value={receiptNo}
                                        onChange={(e) => {
                                            setReceiptNo(e.target.value);
                                            setReceiptNoDupError(null);
                                        }}
                                        onBlur={() => {
                                            if (!editingReceiptId) checkReceiptNoDuplicate(receiptNo);
                                        }}
                                        placeholder="Enter Receipt Number..."
                                        className={cn(
                                            "h-9 text-xs bg-background",
                                            (receiptNoDupError || (showErrors && !receiptNo.trim())) ? "border-destructive ring-1 ring-destructive focus-visible:ring-destructive" : ""
                                        )}
                                    />
                                    {receiptNoDupError && (
                                        <div className="flex items-center gap-1 text-[10px] text-destructive mt-0.5 font-bold">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>{receiptNoDupError}</span>
                                        </div>
                                    )}
                                    {checkingDup && (
                                        <div className="text-[10px] text-muted-foreground mt-0.5">Checking availability...</div>
                                    )}
                                </div>

                                <div className="grid gap-1">
                                    <Label className="text-xs font-bold text-muted-foreground">Receipt Type *</Label>
                                    <Select value={receiptType} onValueChange={setReceiptType}>
                                        <SelectTrigger className={cn("h-9 text-xs bg-background", showErrors && !receiptType.trim() && "border-destructive ring-1 ring-destructive")}>
                                            <SelectValue placeholder="Select type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RECEIPT_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value} className="text-xs">
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-1">
                                    <Label className="text-xs font-bold text-muted-foreground">Receipt Date *</Label>
                                    <Input
                                        type="date"
                                        value={receiptDate}
                                        max="3000-12-31"
                                        min="2000-01-01"
                                        onChange={(e) => setReceiptDate(e.target.value)}
                                        className={cn(
                                            "h-9 text-xs bg-background",
                                            showErrors && !receiptDate.trim() && "border-destructive ring-1 ring-destructive"
                                        )}
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4 bg-muted/30 shadow-sm border">
                            <div className="flex items-start justify-between gap-3 border-b pb-2 mb-3">
                                <div>
                                    <div className="text-sm font-semibold">Selected PO Details</div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">Reference specs for receipt validation</div>
                                </div>
                                {selectedPO?.status && (
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border font-black uppercase text-[9px] tracking-wider">
                                        {selectedPO.status}
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">PO Number:</span>
                                    <span className="font-bold text-foreground">{selectedPO?.poNumber ?? "—"}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Supplier:</span>
                                    <span className="font-bold text-foreground">{selectedPO?.supplier?.name ?? "—"}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Delivery Branches:</span>
                                    <span className="font-bold text-foreground truncate max-w-[220px]" title={branchesLabel}>{branchesLabel}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Receiving Progress:</span>
                                    <span className="font-bold text-foreground">
                                        {progress.totalReceived} / {progress.totalTagged} units
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Metadata items table card */}
                    <Card className="p-4 shadow-sm border">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                            <div>
                                <div className="text-sm font-semibold">
                                    {currentPhase === "select_products" ? "Step 1: Products Selection & Quantities" : "Step 2: Batch, Lot & Expiry Details"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {currentPhase === "select_products"
                                        ? "Select products and input the quantity to receive."
                                        : "Specify the Batch No, Lot selection and Expiry Date for each selected product."}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Input
                                    placeholder="Search product name or SKU..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 text-xs bg-background max-w-[400px] w-full sm:w-80"
                                />
                            </div>
                        </div>

                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Product Name</TableHead>
                                        {currentPhase === "enter_details" && (
                                            <>
                                                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground w-36">Batch</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground w-44">Lot</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground w-44">Expiry</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Unit Price</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-center w-24">Disc. Type</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Disc. Amt</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-right">Net Amt</TableHead>
                                            </>
                                        )}
                                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-center w-20">Expected</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-center w-24">Phys. Tagged</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground text-center w-24">Receive Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(() => {
                                        const activeItemsList = currentPhase === "select_products" ? filteredItems : filteredStep2Items;
                                        const PAGE_SIZE = 10;
                                        const paginatedItems = activeItemsList.slice((reviewPage - 1) * PAGE_SIZE, reviewPage * PAGE_SIZE);
                                        return paginatedItems.map((it: ReceivingPOItem) => {
                                            const porId = String(it.porId || it.id);
                                            const scanned = safeCounts[porId] ?? 0;
                                            const expected = Number(it.expectedQty || 0);
                                            const unitP = Number(it.unitPrice || 0);
                                            const discA = Number(it.discountAmount || 0);
                                            const effectivePrice = Math.max(0, unitP - discA);
                                            const lineTotal = scanned * effectivePrice;

                                            return (
                                                <TableRow key={porId}>
                                                    <TableCell>
                                                        <div className="font-bold text-xs">{it.name}</div>
                                                        <div className="text-[9px] text-muted-foreground font-mono">SKU: {it.barcode} | UOM: {it.uom}</div>
                                                    </TableCell>
                                                    {currentPhase === "enter_details" && (
                                                        <>
                                                            <TableCell>
                                                                <Input
                                                                    className={cn(
                                                                        "h-8 text-[11px] font-bold",
                                                                        showErrors && scanned > 0 && !(batchNos[porId] || "").trim() && "border-destructive ring-1 ring-destructive"
                                                                    )}
                                                                    placeholder="Batch #"
                                                                    value={batchNos[porId] || ""}
                                                                    onChange={(e) => setBatchNos(prev => ({ ...prev, [porId]: e.target.value }))}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <select
                                                                    className={cn(
                                                                        "h-8 w-full rounded-md border border-input bg-background px-2 text-[11px]",
                                                                        showErrors && scanned > 0 && !(lotIds[porId] || "").trim() && "border-destructive ring-1 ring-destructive"
                                                                    )}
                                                                    value={lotIds[porId] || ""}
                                                                    onChange={(e) => setLotIds(prev => ({ ...prev, [porId]: e.target.value }))}
                                                                >
                                                                    <option value="">Select Lot</option>
                                                                    {lots.map((l: { lot_id: string | number; lot_name: string }) => <option key={l.lot_id} value={String(l.lot_id)}>{l.lot_name}</option>)}
                                                                </select>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="date"
                                                                    className={cn(
                                                                        "h-8 text-[11px]",
                                                                        showErrors && scanned > 0 && !(expiryDates[porId] || "").trim() && "border-destructive ring-1 ring-destructive"
                                                                    )}
                                                                    value={expiryDates[porId] || ""}
                                                                    onChange={(e) => setExpiryDates(prev => ({ ...prev, [porId]: e.target.value }))}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs">{formatPHP(unitP)}</TableCell>
                                                            <TableCell className="text-center text-[10px] text-muted-foreground">{it.discountType}</TableCell>
                                                            <TableCell className="text-right text-xs text-destructive font-medium">{(discA || 0) > 0 ? `${formatPHP(discA * scanned)}` : "—"}</TableCell>
                                                            <TableCell className="text-right font-bold text-xs">{formatPHP(lineTotal)}</TableCell>
                                                        </>
                                                    )}
                                                    <TableCell className="text-center font-bold text-xs">{expected}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="h-5 border-primary/30 text-primary font-bold">
                                                            {physicalCounts[porId] ?? 0}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {currentPhase === "select_products" ? (
                                                            !selectedRows[porId] ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 w-24 text-xs font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 mx-auto flex items-center justify-center"
                                                                    onClick={() => {
                                                                        setSelectedRows(prev => ({ ...prev, [porId]: true }));
                                                                        setCustomCounts(prev => ({ ...prev, [porId]: 0 }));
                                                                    }}
                                                                >
                                                                    Select
                                                                </Button>
                                                            ) : (
                                                                <div className="flex items-center gap-1 justify-center">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        max={physicalCounts[porId] ?? 0}
                                                                        value={customCounts[porId] ?? 0}
                                                                        onChange={(e) => {
                                                                            const limit = physicalCounts[porId] ?? 0;
                                                                            const val = Math.max(0, Math.min(limit, Number(e.target.value)));
                                                                            setCustomCounts(prev => ({ ...prev, [porId]: val }));
                                                                        }}
                                                                        className="w-16 h-8 text-center text-xs font-bold bg-background"
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                                        onClick={() => {
                                                                            setSelectedRows(prev => ({ ...prev, [porId]: false }));
                                                                            setCustomCounts(prev => ({ ...prev, [porId]: 0 }));
                                                                        }}
                                                                        title="Deselect product"
                                                                    >
                                                                        <XCircle className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <Badge variant="secondary" className="h-6 px-3 bg-muted text-foreground font-black text-xs">
                                                                {scanned}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        });
                                    })()}
                                </TableBody>
                                <TableFooter className="bg-muted/10 border-t">
                                    <TableRow>
                                        <TableCell colSpan={currentPhase === "enter_details" ? 7 : 1} className="text-right text-[10px] font-bold uppercase">Subtotal</TableCell>
                                        {currentPhase === "enter_details" && (
                                            <TableCell className="text-right font-black text-foreground">{formatPHP(financials.gross)}</TableCell>
                                        )}
                                        <TableCell className="text-center font-bold">{totalExpected}</TableCell>
                                        <TableCell className="text-center font-bold">{totalPhysicalScanned}</TableCell>
                                        <TableCell className="text-center font-black">{totalScanned}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        {(() => {
                            const activeItemsList = currentPhase === "select_products" ? filteredItems : filteredStep2Items;
                            if (activeItemsList.length <= 10) return null;
                            return (
                                <div className="flex items-center justify-between px-4 py-3 border rounded-md bg-muted/10 mt-2">
                                    <span className="text-xs text-muted-foreground font-medium font-mono">
                                        Showing {(reviewPage - 1) * 10 + 1}–{Math.min(reviewPage * 10, activeItemsList.length)} of {activeItemsList.length} items
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setReviewPage(p => Math.max(1, p - 1))} disabled={reviewPage === 1}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-xs font-bold px-2">
                                            Page {reviewPage} of {Math.ceil(activeItemsList.length / 10)}
                                        </span>
                                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setReviewPage(p => Math.min(Math.ceil(activeItemsList.length / 10), p + 1))} disabled={reviewPage === Math.ceil(activeItemsList.length / 10)}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })()}

                        {currentPhase === "enter_details" && (
                            <div className="mt-4 flex flex-col md:flex-row justify-end gap-6 border-t pt-4">
                                <div className="flex-1 max-w-sm ml-auto space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Gross Amount:</span>
                                        <span className="font-bold text-foreground">{formatPHP(financials.gross)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-destructive">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Discount:</span>
                                        <span className="font-bold">{formatPHP(financials.discount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-muted-foreground pb-2 border-b">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Net Amount:</span>
                                        <span className="font-bold text-foreground">{formatPHP(financials.net)}</span>
                                    </div>
                                    {selectedPO?.isInvoice && (
                                        <>
                                            <div className="flex justify-between items-center text-muted-foreground">
                                                <span className="font-bold uppercase tracking-wider text-[10px]">VAT Details:</span>
                                                <span className="font-bold text-foreground">{financials.isExclusive ? "+" : ""}{formatPHP(financials.vatAmount)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-destructive pb-2 border-b">
                                                <span className="font-bold uppercase tracking-wider text-[10px]">EWT:</span>
                                                <span className="font-bold">{formatPHP(financials.whtAmount)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between items-center pt-4">
                                        <span className="font-black text-sm uppercase tracking-widest text-foreground underline decoration-primary underline-offset-4">Grand Total:</span>
                                        <span className="font-black text-xl text-primary drop-shadow-sm">{formatPHP(financials.grandTotal)}</span>
                                    </div>
                                    {selectedPO?.isInvoice && (
                                        <p className="text-[10px] text-muted-foreground mt-2 italic leading-tight text-right">
                                            Note: VAT and EWT figures are for reference and have not been deducted from the total.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {(clientSaveError || saveError) && (
                            <div className="mt-4 p-3 bg-destructive/15 text-destructive text-xs font-bold text-center border border-destructive/20 rounded-md">
                                {clientSaveError || saveError}
                            </div>
                        )}

                        <div className="mt-4 flex justify-end gap-3 border-t pt-4">
                            {currentPhase === "select_products" ? (
                                <>
                                    {onBack && (
                                        <Button
                                            variant="outline"
                                            className="border-primary/20 hover:border-primary hover:bg-primary/5 font-black uppercase text-xs tracking-wider h-11 px-8"
                                            onClick={onBack}
                                            type="button"
                                            disabled={savingReceipt}
                                        >
                                            Back
                                        </Button>
                                    )}
                                    <Button
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase text-xs tracking-wider h-11 px-8 shadow-md"
                                        onClick={() => setCurrentPhase("enter_details")}
                                        disabled={totalScanned === 0}
                                    >
                                        Next
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        className="border-primary/20 hover:border-primary hover:bg-primary/5 font-black uppercase text-xs tracking-wider h-11 px-8"
                                        onClick={() => setCurrentPhase("select_products")}
                                        disabled={savingReceipt}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase text-xs tracking-wider h-11 px-8 shadow-md"
                                        onClick={handleSaveReceipt}
                                        disabled={savingReceipt}
                                    >
                                        {savingReceipt ? "Saving..." : "Save Final Receipt"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {receiptSaved && (
                <ReceiptPreviewModal
                    isOpen={previewOpen}
                    onClose={() => setPreviewOpen(false)}
                    data={{ ...receiptSaved, receiverName }}
                    poNumber={selectedPO?.poNumber || "N/A"}
                    supplierName={selectedPO?.supplier?.name || "N/A"}
                    priceType={selectedPO?.priceType || "VAT Inclusive"}
                    isInvoice={receiptSaved?.isInvoice ?? selectedPO?.isInvoice ?? false}
                />
            )}

            {/* ✅ Partial Receipt Confirmation Modal */}
            <AlertDialog open={isPartialModalOpen} onOpenChange={setIsPartialModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Incomplete Receiving</AlertDialogTitle>
                        <AlertDialogDescription>
                            The receiving of this PO is incomplete. To proceed is to make this PO a partial receipt.
                            Do you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Proceed as Partial
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
