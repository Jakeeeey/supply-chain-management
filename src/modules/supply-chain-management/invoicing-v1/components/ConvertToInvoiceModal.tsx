"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SalesOrder, LogisticsData, ConversionData, ConversionItem } from "../types";
import { InvoicingService } from "../services/InvoicingService";
import { format } from "date-fns";
import {
    Hash,
    MapPin,
    User,
    Building2,
    Calendar,
    Truck,
    PackageSearch,
    Boxes,
    FileCheck,
    Lock,
    Eye,
    Plus,
    Trash2,
    FileText,
    ArrowRightCircle,
    CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Barcode from "react-barcode";

interface ConvertToInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SalesOrder;
}

interface ReceiptItem {
    product_id: number;
    product_name: string;
    order_no: string;
    ordered_qty: number;
    qty: number;
    unit_price: number;
    discount_type: number | null;
    discount_amount: number;
    net_amount: number;
    unit_shortcut: string;
}

interface Receipt {
    id: string;
    receipt_no: string;
    items: ReceiptItem[];
}

const PRINT_ITEM_ROW_COUNT = 12;
const THERMAL_LINE_WIDTH = 32; // Reverted back to 50mm width

export const ConvertToInvoiceModal: React.FC<ConvertToInvoiceModalProps> = ({
    isOpen,
    onClose,
    order
}) => {
    const [logistics, setLogistics] = useState<LogisticsData | null>(null);
    const [conversionData, setConversionData] = useState<ConversionData | null>(null);
    const [discountTypes, setDiscountTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [receipts, setReceipts] = useState<Receipt[]>([
        { id: "1", receipt_no: "", items: [] }
    ]);
    const [activeReceiptId, setActiveReceiptId] = useState<string>("1");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [receiptToPreview, setReceiptToPreview] = useState<Receipt | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && order) {
            setLoading(true);
            Promise.all([
                InvoicingService.getLogisticsData(order.order_id),
                InvoicingService.getConversionDetails(order.order_id),
                InvoicingService.getDiscountTypes()
            ])
                .then(([logisticsData, convData, discTypes]) => {
                    setLogistics(logisticsData);
                    setConversionData(convData);
                    setDiscountTypes(discTypes);
                    // Auto-distribute items across receipts
                    autoDistributeAllItems(convData);
                })
                .catch(err => {
                    console.error("Error fetching data:", err);
                    toast.error("Failed to load details");
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, order]);

    const autoDistributeAllItems = (data: ConversionData) => {
        const availableItems = data.items.filter(item => item.remaining_quantity > 0);
        if (availableItems.length === 0) {
            setReceipts([{ id: "1", receipt_no: "", items: [] }]);
            return;
        }

        const maxLen = data.max_receipt_length || 15;
        const newReceipts: Receipt[] = [];

        for (let i = 0; i < availableItems.length; i += maxLen) {
            const chunk = availableItems.slice(i, i + maxLen);
            const receiptItems: ReceiptItem[] = chunk.map(item => {
                const ordered = item.ordered_quantity || 0;
                const poolRemaining = item.remaining_quantity || 0;
                // Cap by both ordered amount and pool remaining
                const autoQty = Math.min(ordered, poolRemaining);
                return {
                    product_id: item.product_id,
                    product_name: item.product_name,
                    order_no: item.order_no,
                    ordered_qty: ordered,
                    qty: autoQty,
                    unit_price: item.unit_price,
                    discount_type: item.discount_type,
                    discount_amount: (item.discount_amount / ordered) * autoQty,
                    net_amount: (item.net_amount / ordered) * autoQty,
                    unit_shortcut: item.unit_shortcut
                };
            });

            newReceipts.push({
                id: (newReceipts.length + 1).toString(),
                receipt_no: "",
                items: receiptItems
            });
        }

        setReceipts(newReceipts);
        setActiveReceiptId(newReceipts[0].id);
    };

    const addReceipt = () => {
        const newId = (Math.max(0, ...receipts.map(r => parseInt(r.id))) + 1).toString();
        setReceipts([...receipts, { id: newId, receipt_no: "", items: [] }]);
        setActiveReceiptId(newId);
    };

    const removeReceipt = (id: string) => {
        if (receipts.length === 1) return;
        const filtered = receipts.filter(r => r.id !== id);
        setReceipts(filtered);
        if (activeReceiptId === id) {
            setActiveReceiptId(filtered[0].id);
        }
    };

    const updateReceiptNo = (id: string, no: string) => {
        setReceipts(receipts.map(r => r.id === id ? { ...r, receipt_no: no } : r));
    };

    const updateItemQty = (receiptId: string, productId: number, newQty: number) => {
        const data = conversionData;
        if (!data) return;

        const maxLen = data.max_receipt_length || 15;
        const convItem = data.items.find(i => i.product_id === productId);
        if (!convItem) return;

        const ordered = convItem.ordered_quantity || 0;
        const poolRemaining = convItem.remaining_quantity || 0;

        // Use total drafts across ALL receipts EXCEPT potentially the one being edited 
        // to see what's actually left for the order
        const totalOtherApplied = receipts
            .filter(r => r.id !== receiptId)
            .reduce((sum, r) => {
                const item = r.items.find(i => i.product_id === productId);
                return sum + (item?.qty || 0);
            }, 0);

        // Check if there's any pool available at all across all drafts
        const orderNeeded = Math.max(0, ordered - totalOtherApplied);
        const totalUsedAcrossAll = receipts.reduce((sum, r) => {
            const item = r.items.find(i => i.product_id === productId);
            return sum + (item?.qty || 0);
        }, 0);

        const currentPoolRemaining = Math.max(0, poolRemaining - totalUsedAcrossAll);

        // If trying to add NEW quantity but pool is already empty
        if (newQty > 0 && currentPoolRemaining <= 0) {
            const isAlreadyInSomeReceipt = receipts.some(r => r.items.some(i => i.product_id === productId));
            if (!isAlreadyInSomeReceipt) {
                toast.error("Cannot add item: Out of stock / No remaining items available in pool.", {
                    duration: 4000,
                    style: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }
                });
                return;
            }
        }

        const poolAvail = Math.max(0, poolRemaining - totalOtherApplied);

        // Final qty is capped by what the order actually requires and what the pool has
        const cappedQty = Math.min(newQty, orderNeeded, poolAvail);
        const finalQty = Math.max(0, cappedQty);

        if (finalQty === 0) {
            setReceipts(receipts.map(r => r.id === receiptId ? {
                ...r,
                items: r.items.filter(i => i.product_id !== productId)
            } : r));
            return;
        }

        const targetR = receipts.find(r => r.id === receiptId);
        const isExistingInTarget = targetR?.items.find(i => i.product_id === productId);

        if (isExistingInTarget) {
            setReceipts(receipts.map(r => r.id === receiptId ? {
                ...r,
                items: r.items.map(i => i.product_id === productId ? {
                    ...i,
                    qty: finalQty,
                    ordered_qty: ordered,
                    discount_amount: (convItem.discount_amount / ordered) * finalQty,
                    net_amount: (convItem.net_amount / ordered) * finalQty,
                    unit_shortcut: convItem.unit_shortcut
                } : i)
            } : r));
            return;
        }

        // New item addition - Logic: Auto overflow if target full
        const itemToAdd: ReceiptItem = {
            product_id: productId,
            product_name: convItem.product_name,
            order_no: convItem.order_no,
            ordered_qty: ordered,
            qty: finalQty,
            unit_price: convItem.unit_price,
            discount_type: convItem.discount_type,
            discount_amount: (convItem.discount_amount / ordered) * finalQty,
            net_amount: (convItem.net_amount / ordered) * finalQty,
            unit_shortcut: convItem.unit_shortcut
        };

        if (targetR && targetR.items.length < maxLen) {
            setReceipts(receipts.map(r => r.id === receiptId ? {
                ...r,
                items: [...r.items, itemToAdd]
            } : r));
        } else {
            // Find any receipt with space
            const firstWithSpace = receipts.find(r => r.items.length < maxLen);
            if (firstWithSpace) {
                setReceipts(receipts.map(r => r.id === firstWithSpace.id ? {
                    ...r,
                    items: [...r.items, itemToAdd]
                } : r));
                setActiveReceiptId(firstWithSpace.id);
                toast.success(`Item added to Receipt ${receipts.findIndex(r => r.id === firstWithSpace.id) + 1} (Full Limit reached)`);
            } else {
                // Create new
                const nextId = (Math.max(0, ...receipts.map(r => parseInt(r.id))) + 1).toString();
                setReceipts([...receipts, { id: nextId, receipt_no: "", items: [itemToAdd] }]);
                setActiveReceiptId(nextId);
                toast.success("New receipt created for overflowing items");
            }
        }
    };

    const removeItemFromReceipt = (receiptId: string, productId: number) => {
        setReceipts(receipts.map(r => r.id === receiptId ? {
            ...r,
            items: r.items.filter(i => i.product_id !== productId)
        } : r));
    };

    const handlePreviewReceipt = async () => {
        const activeR = receipts.find(r => r.id === activeReceiptId);
        if (!activeR) return;

        if (!activeR.receipt_no.trim()) {
            toast.error("Receipt Number is required for Preview");
            return;
        }

        if (activeR.items.length === 0) {
            toast.error("Receipt must have at least one item");
            return;
        }

        setIsValidating(true);
        try {
            const exists = await InvoicingService.validateReceiptNo(activeR.receipt_no);
            if (exists) {
                toast.error(`Receipt Number "${activeR.receipt_no}" already exists!`, {
                    description: `Check Receipt ${receipts.indexOf(activeR) + 1}`,
                    duration: 5000
                });
                return;
            }

            setReceiptToPreview(activeR);
            setIsPreviewOpen(true);
        } catch (err) {
            toast.error("Error validating receipt number");
        } finally {
            setIsValidating(false);
        }
    };

    const handleGenerateInvoices = async () => {
        const invalid = receipts.some(r => !r.receipt_no.trim() || r.items.length === 0);
        if (invalid) {
            toast.error("Please provide receipt numbers and ensure all receipts have items");
            return;
        }

        setIsValidating(true);
        try {
            // Check uniqueness for all receipts
            for (const r of receipts) {
                const exists = await InvoicingService.validateReceiptNo(r.receipt_no);
                if (exists) {
                    toast.error(`Receipt Number "${r.receipt_no}" already exists!`, {
                        description: `Check Receipt ${receipts.indexOf(r) + 1}`,
                        duration: 5000
                    });
                    return;
                }
            }

            toast.success("Invoices generated successfully!");
            onClose();
        } catch (err) {
            toast.error("Error generating invoices");
        } finally {
            setIsValidating(false);
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Receipt-${receiptToPreview?.receipt_no || "preview"}`,
    });

    // Derived: Remaining quantities per product after considering current receipt drafts
    const currentRemaining = useMemo(() => {
        if (!conversionData) return [];
        return conversionData.items.map(item => {
            const totalAppliedInDrafts = receipts.reduce((sum, r) => {
                const rItem = r.items.find(i => i.product_id === item.product_id);
                return sum + (rItem?.qty || 0);
            }, 0);

            // pool_remaining = actual warehouse picked items minus those already in official receipts (applied_quantity)
            const pool_rem = item.picked_quantity - item.applied_quantity;

            return {
                ...item,
                pool_remaining: Math.max(0, pool_rem - totalAppliedInDrafts),
                order_needed: Math.max(0, item.ordered_quantity - totalAppliedInDrafts)
            };
        });
    }, [conversionData, receipts]);

    const activeReceipt = receipts.find(r => r.id === activeReceiptId);

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "MMM dd, yyyy");
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount).replace('PHP', '₱').trim();
    };

    const isOfficialReceipt = String(conversionData?.is_official ?? order.receipt_type?.isOfficial ?? 1) === "1";
    const previewPaperWidth = isOfficialReceipt ? "210mm" : "58mm";
    const thermalPaperWidth = "58mm";
    const thermalContentWidth = "50mm"; // Reverted to 50mm width
    const previewPaperHeight = isOfficialReceipt ? "265mm" : "auto";
    const previewDialogWidthClass = isOfficialReceipt
        ? "!w-[min(calc(210mm+3rem),calc(100vw-1rem))] !max-w-[min(calc(210mm+3rem),calc(100vw-1rem))] sm:!max-w-[min(calc(210mm+3rem),calc(100vw-1rem))]"
        : "!w-[min(calc(58mm+2rem),calc(100vw-1rem))] !max-w-[min(calc(58mm+2rem),calc(100vw-1rem))] sm:!max-w-[min(calc(58mm+2rem),calc(100vw-1rem))]";

    const getReceiptTotals = (receipt: Receipt | null) => {
        const items = receipt?.items || [];
        const grossTotal = items.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
        const discountTotal = items.reduce((sum, item) => sum + item.discount_amount, 0);
        const netTotal = grossTotal - discountTotal;
        const vatableSales = netTotal / 1.12;
        const vatAmount = netTotal - vatableSales;

        return { grossTotal, discountTotal, netTotal, vatableSales, vatAmount };
    };

    const previewTotals = getReceiptTotals(receiptToPreview);

    const formatThermalAmount = (amount: number) =>
        new Intl.NumberFormat("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);

    const wrapThermalText = (value: string, width: number) => {
        const normalized = (value || "").replace(/\s+/g, " ").trim();
        if (!normalized) return ["N/A"];

        const words = normalized.split(" ");
        const lines: string[] = [];
        let current = "";

        for (const word of words) {
            if (!current) {
                current = word;
                continue;
            }

            if (`${current} ${word}`.length <= width) {
                current = `${current} ${word}`;
                continue;
            }

            lines.push(current);
            current = word;
        }

        if (current) lines.push(current);
        return lines;
    };

    const thermalKeyValue = (label: string, value: string, width = THERMAL_LINE_WIDTH) => {
        const cleanLabel = label.trim();
        const cleanValue = value.trim();
        const space = Math.max(1, width - cleanLabel.length - cleanValue.length);
        return `${cleanLabel}${" ".repeat(space)}${cleanValue}`.slice(0, width);
    };

    const thermalCenterText = (text: string, width = THERMAL_LINE_WIDTH) => {
        const clean = text.trim();
        if (clean.length >= width) return clean.slice(0, width);
        const left = Math.floor((width - clean.length) / 2);
        return " ".repeat(left) + clean;
    };

    // Group items by discount_type for grouped receipt layout
    const thermalItemBlocks: string[] = (() => {
        const items = receiptToPreview?.items || [];
        if (items.length === 0) return [];

        // Group by discount_type ID
        const groups = new Map<string, typeof items>();
        for (const item of items) {
            const key = item.discount_type !== null && item.discount_type !== undefined
                ? String(item.discount_type)
                : "NONE";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(item);
        }

        const result: string[] = [];
        const groupKeys = [...groups.keys()];

        groupKeys.forEach((key, idx) => {
            const groupItems = groups.get(key)!;
            const dtName = key === "NONE"
                ? "NO DISCOUNT"
                : (discountTypes.find((d: { id: number; discount_type: string }) => d.id === Number(key))?.discount_type || key);

            // Group label
            result.push(thermalCenterText(`Discount: ${dtName}`));

            // Items in this group
            for (const item of groupItems) {
                const nameLines = wrapThermalText(item.product_name.toUpperCase(), THERMAL_LINE_WIDTH);
                const qtyPart = `${item.qty}${item.unit_shortcut} @${formatThermalAmount(item.unit_price)}`;
                const amtPart = formatThermalAmount(item.net_amount);
                const spaceCount = Math.max(1, THERMAL_LINE_WIDTH - qtyPart.length - amtPart.length);
                const detailLine = `${qtyPart}${" ".repeat(spaceCount)}${amtPart}`;
                result.push(...nameLines, detailLine, "");
            }

            // Add a dash-divider between groups (not after the last one)
            if (idx < groupKeys.length - 1) {
                result.push("-".repeat(THERMAL_LINE_WIDTH));
            }
        });

        return result;
    })();

    const thermalDividerLine = "-".repeat(THERMAL_LINE_WIDTH);
    const thermalCheckerDivider = "=".repeat(THERMAL_LINE_WIDTH);
    const thermalTextLines = [
        thermalCheckerDivider,
        ...wrapThermalText(`Receipt#: ${receiptToPreview?.receipt_no || "N/A"}`, THERMAL_LINE_WIDTH),
        ...wrapThermalText(`PO#: ${order.po_no || "N/A"}`, THERMAL_LINE_WIDTH),
        ...wrapThermalText(`Salesman: ${order.salesman_id?.salesman_name || "N/A"}`, THERMAL_LINE_WIDTH),
        ...wrapThermalText(
            `Customer: ${order.customer_code?.customer_name || "N/A"}`,
            THERMAL_LINE_WIDTH
        ),
        ...wrapThermalText(
            `Address: ${conversionData?.customer?.province || "N/A"}, ${conversionData?.customer?.city || "N/A"}`,
            THERMAL_LINE_WIDTH
        ),

        thermalCheckerDivider,
        ...thermalItemBlocks,
        thermalCheckerDivider,
        thermalKeyValue("GROSS AMOUNT:", formatThermalAmount(previewTotals.grossTotal)),
        thermalKeyValue("DISCOUNT AMOUNT:", formatThermalAmount(previewTotals.discountTotal)),
        thermalKeyValue("NET AMOUNT:", formatThermalAmount(previewTotals.netTotal)),
        thermalCheckerDivider,
        "",
        thermalCenterText("--- THANK YOU ---"),
        thermalCenterText(format(new Date(), "yyyy-MM-dd HH:mm:ss")),
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] md:max-w-6xl p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl flex flex-col h-[90vh]">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-background to-transparent border-b flex-shrink-0">
                    <DialogTitle className="sr-only">Convert to Invoice - {order.order_no}</DialogTitle>
                    <div className="space-y-4">
                        {/* Consolidated Header Row */}
                        <div className="flex items-center justify-between gap-6">
                            {/* Order Info */}
                            <div className="space-y-0.5 min-w-[120px]">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 opacity-70">
                                    <Hash size={10} /> Order No
                                </p>
                                <p className="font-black text-xs text-primary">{order.order_no}</p>
                            </div>

                            {/* Center: Logistics Info */}
                            <div className="flex-1 flex justify-center">
                                <div className="flex items-center gap-6 px-4 py-1.5 bg-muted/30 rounded-full border border-primary/5">
                                    <div className="flex items-center gap-1.5">
                                        <Truck size={12} className="text-primary/70" />
                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-tighter">DISPATCH:</span>
                                        <span className="text-[10px] font-black">{logistics?.pdp_no || "..."}</span>
                                    </div>
                                    <div className="w-px h-3 bg-primary/10" />
                                    <div className="flex items-center gap-1.5">
                                        <PackageSearch size={12} className="text-primary/70" />
                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-tighter">CONSOL:</span>
                                        <span className="text-[10px] font-black">{logistics?.consolidation_no || "..."}</span>
                                    </div>
                                    <div className="w-px h-3 bg-primary/10" />
                                    <div className="flex items-center gap-1.5">
                                        <Boxes size={12} className="text-primary/70" />
                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-tighter">PDP:</span>
                                        <span className="text-[10px] font-black">{logistics?.dispatch_no || "..."}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Date Info */}
                            <div className="space-y-0.5 text-right min-w-[120px] pr-8">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center justify-end gap-1.5 opacity-70">
                                    <Calendar size={10} /> Order Date
                                </p>
                                <p className="font-bold text-xs">{order.order_date ? formatDate(order.order_date) : "N/A"}</p>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 min-h-0 flex overflow-hidden bg-muted/5">
                    {/* LEFT COLUMN: SOURCE DATA */}
                    <div className="w-80 flex-shrink-0 border-r flex flex-col min-h-0">
                        <div className="p-4 bg-background/50 border-b flex justify-between items-center">
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <ArrowRightCircle size={14} /> Available Items
                            </h4>
                            <Badge variant="outline" className="text-[10px] font-mono">
                                {currentRemaining.filter(item => {
                                    const isInDraft = receipts.some(r => r.items.some(i => i.product_id === item.product_id));
                                    return !isInDraft && item.order_needed > 0;
                                }).length} Products
                            </Badge>
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-4 space-y-3">
                                {currentRemaining.filter(item => {
                                    // Rule 1: Remove from left column if already added to ANY receipt (regardless of QTY)
                                    const isInDraft = receipts.some(r => r.items.some(i => i.product_id === item.product_id));
                                    if (isInDraft) return false;

                                    // Rule 2: Also hide if no more order needed (standard logic)
                                    return item.order_needed > 0;
                                }).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                        <CheckCircle size={48} className="mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">All items allocated</p>
                                    </div>
                                ) : (
                                    currentRemaining
                                        .filter(item => {
                                            const isInDraft = receipts.some(r => r.items.some(i => i.product_id === item.product_id));
                                            return !isInDraft && item.order_needed > 0;
                                        })
                                        .map((item) => (
                                            <div
                                                key={item.product_id}
                                                className="group relative p-4 rounded-2xl border border-primary/10 shadow-sm bg-card hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden"
                                            >
                                                {/* Card Background Accent */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />

                                                <div className="relative z-10 flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                            <p className="text-[11px] font-black text-primary uppercase tracking-wider">{item.product_name}</p>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                            Price: <span className="text-foreground font-bold">{formatCurrency(item.unit_price)}</span>
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        className="h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all duration-200"
                                                        onClick={() => updateItemQty(activeReceiptId, item.product_id, item.order_needed)}
                                                    >
                                                        <Plus size={16} strokeWidth={3} />
                                                    </Button>
                                                </div>

                                                <div className="relative z-10 grid grid-cols-3 gap-3">
                                                    {/* KPI: ORDER */}
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/30 border border-transparent group-hover:bg-background group-hover:border-primary/5 transition-colors">
                                                        <p className="text-[8px] uppercase font-black text-muted-foreground mb-1">Order</p>
                                                        <p className="text-sm font-black text-foreground">{item.ordered_quantity}</p>
                                                    </div>

                                                    {/* KPI: PICKED (Prominent) */}
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 border border-blue-100 group-hover:shadow-sm transition-all">
                                                        <p className="text-[8px] uppercase font-black text-blue-600 mb-1">Picked</p>
                                                        <p className="text-sm font-black text-blue-700">{item.picked_quantity}</p>
                                                    </div>

                                                    {/* KPI: REMAINING (Prominent) */}
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-primary/10 border border-primary/20 group-hover:shadow-sm transition-all">
                                                        <p className="text-[8px] uppercase font-black text-primary mb-1">Remaining</p>
                                                        <p className="text-sm font-black text-primary">{item.pool_remaining}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* RIGHT COLUMN: RECEIPTS/TABS */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <Tabs value={activeReceiptId} onValueChange={setActiveReceiptId} className="flex flex-col flex-1 min-h-0">
                            <div className="bg-background/80 border-b p-1 flex items-center gap-1 flex-shrink-0">
                                <ScrollArea className="flex-1 whitespace-nowrap">
                                    <TabsList className="bg-transparent h-9 p-0 gap-1">
                                        {receipts.map((r, idx) => (
                                            <TabsTrigger
                                                key={r.id}
                                                value={r.id}
                                                className="rounded-lg h-8 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md border border-primary/10 text-[10px] font-black px-4 group flex items-center gap-2"
                                            >
                                                <FileText size={12} />
                                                RECEIPT {idx + 1}
                                                {receipts.length > 1 && (
                                                    <div
                                                        className="ml-2 p-1 rounded-md hover:bg-white/20 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeReceipt(r.id);
                                                        }}
                                                    >
                                                        <Trash2 size={12} className="text-white/70 hover:text-white" />
                                                    </div>
                                                )}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </ScrollArea>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary"
                                    onClick={addReceipt}
                                >
                                    <Plus size={16} />
                                </Button>
                            </div>

                            {receipts.map((r) => (
                                <TabsContent key={r.id} value={r.id} className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
                                    <div className="p-4 bg-muted/30 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-grow space-y-1 w-full md:w-auto">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Receipt No (Required)</p>
                                            <Input
                                                placeholder="Enter Receipt Number..."
                                                value={r.receipt_no}
                                                onChange={(e) => updateReceiptNo(r.id, e.target.value)}
                                                className="h-9 rounded-xl border-primary/20 focus-visible:ring-primary/40 bg-white shadow-sm font-black text-sm"
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground">Items</p>
                                                <p className="text-sm font-black text-foreground">
                                                    {r.items.length} / {conversionData?.max_receipt_length || "—"}
                                                </p>
                                            </div>
                                            <div className="text-right border-l pl-4">
                                                <p className="text-[10px] font-black uppercase text-primary">Total Amount</p>
                                                <p className="text-sm font-black text-primary">
                                                    {formatCurrency(r.items.reduce((sum, item) => sum + item.net_amount, 0))}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-grow overflow-hidden flex flex-col">
                                        <div className="grid grid-cols-12 gap-2 p-3 bg-muted/10 border-b text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            <div className="col-span-2">Product</div>
                                            <div className="col-span-2 text-center">Ordered</div>
                                            <div className="col-span-2 text-center">Qty</div>
                                            <div className="col-span-2 text-right">Price</div>
                                            <div className="col-span-2 text-right">Discount</div>
                                            <div className="col-span-1 text-right">Total</div>
                                            <div className="col-span-1"></div>
                                        </div>
                                        <ScrollArea className="flex-1 min-h-0">
                                            <div className="p-2 space-y-1">
                                                {r.items.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                                                        <Boxes size={40} className="mb-2" />
                                                        <p className="text-xs font-bold uppercase italic">Receipt is empty</p>
                                                    </div>
                                                ) : (
                                                    r.items.map((item) => (
                                                        <div key={item.product_id} className="grid grid-cols-12 gap-2 p-2 items-center rounded-lg hover:bg-muted/50 border border-transparent transition-colors">
                                                            <div className="col-span-2">
                                                                <p className="text-xs font-black text-foreground">{item.product_name}</p>
                                                            </div>
                                                            <div className="col-span-2 text-center">
                                                                <p className="text-[10px] font-bold text-muted-foreground">{item.ordered_qty}</p>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <Input
                                                                    type="number"
                                                                    value={item.qty}
                                                                    onChange={(e) => updateItemQty(r.id, item.product_id, parseInt(e.target.value) || 0)}
                                                                    className="h-7 rounded-md text-center font-bold text-xs p-1"
                                                                />
                                                            </div>
                                                            <div className="col-span-2 text-right">
                                                                <p className="text-xs font-medium">{formatCurrency(item.unit_price)}</p>
                                                            </div>
                                                            <div className="col-span-2 text-right text-destructive">
                                                                <p className="text-xs font-medium">-{formatCurrency(item.discount_amount)}</p>
                                                            </div>
                                                            <div className="col-span-1 text-right">
                                                                <p className="text-[10px] font-black text-primary">{formatCurrency(item.net_amount)}</p>
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => removeItemFromReceipt(r.id, item.product_id)}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/30 border-t flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            className="flex-1 sm:flex-none h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-amber-500/5 border-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white transition-all duration-300"
                            onClick={() => toast.warning("Order placed on hold")}
                        >
                            <Lock className="h-3.5 w-3.5 mr-2" /> Hold Order
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 sm:flex-none h-11 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all duration-300"
                            onClick={handlePreviewReceipt}
                            disabled={isValidating}
                        >
                            {isValidating ? (
                                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                                <Eye className="h-3.5 w-3.5 mr-2" />
                            )}
                            Preview Receipt
                        </Button>
                        <Button
                            className="w-full sm:w-auto h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300"
                            onClick={handleGenerateInvoices}
                            disabled={isValidating}
                        >
                            {isValidating ? "Validating..." : "Generate"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>

            {/* RECEIPT PREVIEW MODAL */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className={`${previewDialogWidthClass} bg-white p-0 border-none shadow-2xl overflow-hidden flex flex-col h-[96vh]`}>
                    <DialogHeader className="p-4 bg-muted/20 border-b flex flex-row items-center justify-between flex-shrink-0">
                        <DialogTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Eye size={14} className="text-primary" /> Receipt Preview
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea className="flex-1 min-h-0 bg-zinc-100/80 overflow-y-auto overflow-x-hidden">
                        <style>
                            {`
                                @page { size: ${isOfficialReceipt ? "210mm 265mm" : "58mm auto"}; margin: 0; }
                                @media print {
                                    .receipt-print-area { 
                                        padding: 0.2in !important; 
                                        width: ${previewPaperWidth} !important; 
                                        ${isOfficialReceipt ? `height: ${previewPaperHeight} !important;` : "height: auto !important;"}
                                        font-family: 'Courier New', Courier, monospace !important;
                                        color: #000 !important;
                                        background: #fff !important;
                                        line-height: 1.2 !important;
                                        -webkit-print-color-adjust: exact;
                                    }
                                    .header-container { position: relative; width: 100%; height: 4.3in; margin-bottom: 0in; overflow: hidden; }
                                    .header-row { position: absolute; width: 100%; font-weight: bold; font-size: 11pt; white-space: nowrap; overflow: hidden; }
                                    .row-1 { top: 2.45in; }
                                    .row-2 { top: 2.78in; }
                                    .row-3 { top: 3.13in; }
                                    .row-4 { top: 3.48in; }
                                    .indent-left-sm { padding-left: 0.8in; }
                                    .indent-left-md { padding-left: 1.3in; }
                                    .indent-left-lg { padding-left: 1.8in; }
                                    .text-right-aligned { float: right; padding-right: 0.3in; text-align: right; }
                                    .barcode-pos { position: absolute; top: 0; right: 0.2in; }
                                    .totals-table td, .totals-table th, table, tr, th, td { 
                                        border: none !important; 
                                        outline: none !important;
                                        box-shadow: none !important;
                                    }
                                    th { border: none !important; }
                                    .table-container { padding-top: 0 !important; margin-top: -0.16in !important; }
                                    .totals-section { margin-top: 0.2in !important; }
                                    
                                    /* Force Left Alignment for Thermal to avoid clipping on driver mismatch */
                                    @media print {
                                        @page { 
                                            margin: 0 !important; 
                                            size: 58mm auto; /* Explicit width to counter driver, auto height to prevent extra feed at bottom */
                                        }
                                        html, body { 
                                            margin: 0 !important; 
                                            padding: 0 !important; 
                                            /* Let the driver width be whatever it is (e.g. 72mm), we just stay on the extreme left */
                                            width: 100% !important; 
                                            text-align: left !important;
                                        }
                                        #receipt-print-area, .thermal-paper-sheet { 
                                            float: left !important;
                                            margin: 0 !important; /* Strip auto-centering that causes the huge left shift */
                                        }
                                        .thermal-receipt-area {
                                            float: left !important;
                                            margin: 0 !important;
                                        }
                                    }

                                    .thermal-paper-sheet {
                                        width: 58mm !important;
                                        height: auto !important;
                                        padding: 0 !important;
                                        margin: 0 auto !important;
                                        background: #fff !important;
                                    }
                                    .thermal-receipt-area {
                                        width: 50mm !important;
                                        height: auto !important;
                                        padding: 0 !important; /* Removed bottom padding as requested (0mm) */
                                        font-family: 'Consolas', 'Courier New', Courier, monospace !important;
                                        font-size: 9.5pt !important;
                                        font-weight: 500 !important;
                                        line-height: 1.15 !important;
                                        margin: 0 !important; /* Strict Left to avoid driver centering */
                                        letter-spacing: -0.2px !important;
                                        text-align: left !important;
                                    }
                                    .thermal-divider {
                                        border-top: 1px dashed #000 !important;
                                        margin: 2mm 0 !important;
                                    }
                                }

                                /* Preview Styles - Strict Border Free */
                                .header-container { position: relative; width: 100%; height: 3.7in; margin-bottom: 0in; overflow: hidden; }
                                .header-row { position: absolute; width: 100%; font-weight: bold; font-size: 11pt; white-space: nowrap; overflow: hidden; }
                                .row-1 { top: 2.15in; }
                                .row-2 { top: 2.43in; }
                                .row-3 { top: 2.71in; }
                                .row-4 { top: 2.99in; }
                                .indent-left-sm { padding-left: 0.8in; }
                                .indent-left-md { padding-left: 1.3in; }
                                .indent-left-lg { padding-left: 1.8in; }
                                .text-right-aligned { float: right; padding-right: 0.3in; text-align: right; }
                                .barcode-pos { position: absolute; top: 0in; right: 0.3in; }
                                .table-right-col { padding-right: 0.3in !important; text-align: right !important; }
                                .totals-table td, .totals-table th, .table-container table, .table-container td, .table-container th { 
                                    border: none !important; 
                                    padding: 4px 10px; 
                                    font-size: 10pt; 
                                    font-weight: bold; 
                                }
                                .table-container { padding-top: 0; margin-top: -0.16in; }
                                .totals-table { width: 100%; border-collapse: collapse; }
                                .totals-section { margin-top: 0.2in; }
                                .preview-shell { display: flex; justify-content: center; align-items: flex-start; padding: 48px 24px; width: 100%; min-height: 100%; box-sizing: border-box; }
                                .preview-sheet { box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18); }
                                .thermal-preview-sheet { width: 58mm; box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18); }
                                .thermal-divider { border-top: 1px dashed #000; margin: 3mm 0; }
                                .thermal-pre {
                                    white-space: pre-wrap;
                                    word-break: break-word;
                                    margin: 0;
                                    font-size: 10px; /* Safe POS font size to fit 31 chars in 48mm */
                                    line-height: 1.15;
                                    letter-spacing: -0.2px;
                                    font-weight: 500;
                                }
                            `}
                        </style>
                        <div className="preview-shell">
                            {isOfficialReceipt ? (
                                <div ref={componentRef} id="receipt-print-area" className="receipt-print-area preview-sheet px-6 py-4 text-zinc-900 font-mono tracking-tight bg-white" style={{ width: previewPaperWidth, height: previewPaperHeight, boxSizing: 'border-box', flexShrink: 0 }}>
                                    {/* Refined Header - Image 3 Indentation & Alignment */}
                                    <div className="header-container">
                                        {/* Barcode (Top Right) */}
                                        <div className="barcode-pos">
                                            <div className="bg-white p-1 inline-block">
                                                <Barcode
                                                    value={receiptToPreview?.receipt_no || "N/A"}
                                                    height={40}
                                                    width={1.5}
                                                    fontSize={12}
                                                    margin={0}
                                                    background="transparent"
                                                />
                                            </div>
                                        </div>

                                        {(() => {
                                            const fullName = conversionData?.customer?.customer_name || 'N/A';
                                            const storeName = conversionData?.customer?.store_name || fullName;
                                            let line1 = fullName;
                                            let line2 = "";

                                            // Smart split if too long (approx 25-30 chars for monospace at 11pt)
                                            if (fullName.length > 25) {
                                                const lastSpace = fullName.lastIndexOf(" ", 25);
                                                if (lastSpace > 10) {
                                                    line1 = fullName.substring(0, lastSpace);
                                                    line2 = fullName.substring(lastSpace + 1);
                                                }
                                            }

                                            return (
                                                <>
                                                    {/* Row 1: Name 1 + Date */}
                                                    <div className="header-row row-1">
                                                        <span className="indent-left-md" style={{ textTransform: 'uppercase' }}>
                                                            {line1}
                                                        </span>
                                                        <span className="text-right-aligned" style={{ textTransform: 'uppercase' }}>
                                                            {format(new Date(), "MMM dd, yyyy")}
                                                        </span>
                                                    </div>

                                                    {/* Row 2: Name 2 + Terms */}
                                                    <div className="header-row row-2">
                                                        <span className="indent-left-lg" style={{ textTransform: 'uppercase' }}>
                                                            {storeName}
                                                        </span>
                                                        <span className="text-right-aligned" style={{ textTransform: 'uppercase' }}>
                                                            {conversionData?.payment_name || "N/A"}
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        })()}

                                        {/* Row 3: TIN */}
                                        <div className="header-row row-3">
                                            <span className="indent-left-sm">
                                                {conversionData?.customer?.customer_tin || 'N/A'}
                                            </span>
                                        </div>

                                        {/* Row 4: Address */}
                                        <div className="header-row row-4">
                                            <span className="indent-left-md" style={{ textTransform: 'uppercase' }}>
                                                {conversionData?.customer?.province || 'N/A'}, {conversionData?.customer?.city || 'N/A'}, {conversionData?.customer?.brgy || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items Table - Headerless & Border Free */}
                                    {(() => {
                                        const receiptItems = receiptToPreview?.items || [];
                                        const blankRows = Math.max(0, PRINT_ITEM_ROW_COUNT - receiptItems.length);

                                        return (
                                            <div className="table-container">
                                                <table className="w-full text-left border-collapse">
                                                    <tbody className="italic">
                                                        {receiptItems.map((item, idx) => (
                                                            <tr key={idx} className="border-none">
                                                                <td className="py-[0.24in] text-[11px] font-bold uppercase w-[45%]">{item.product_name}</td>
                                                                <td className="py-[0.24in] text-[11px] font-bold text-center w-[10%]">{item.qty} {item.unit_shortcut}</td>
                                                                <td className="py-[0.24in] text-[11px] font-bold text-right w-[15%]">{formatCurrency(item.unit_price)}</td>
                                                                <td className="py-[0.24in] text-[11px] font-bold text-right uppercase w-[15%]">
                                                                    {(() => {
                                                                        const dt = discountTypes.find(d => d.id === item.discount_type);
                                                                        return dt ? dt.discount_type : "NONE";
                                                                    })()}
                                                                </td>
                                                                <td className="py-[0.24in] text-[11px] font-bold table-right-col w-[15%]">{formatCurrency(item.net_amount)}</td>
                                                            </tr>
                                                        ))}
                                                        {Array.from({ length: blankRows }).map((_, idx) => (
                                                            <tr key={`blank-row-${idx}`} className="border-none">
                                                                <td className="py-[0.24in] text-[11px] w-[45%]">&nbsp;</td>
                                                                <td className="py-[0.24in] text-[11px] text-center w-[10%]">&nbsp;</td>
                                                                <td className="py-[0.24in] text-[11px] text-right w-[15%]">&nbsp;</td>
                                                                <td className="py-[0.24in] text-[11px] text-right w-[15%]">&nbsp;</td>
                                                                <td className="py-[0.24in] text-[11px] table-right-col w-[15%]">&nbsp;</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}

                                    {/* Totals Section */}
                                    {(() => {
                                        const grossTotal = receiptToPreview?.items.reduce((s, i) => s + (i.unit_price * i.qty), 0) || 0;
                                        const discountTotal = receiptToPreview?.items.reduce((s, i) => s + i.discount_amount, 0) || 0;
                                        const netTotal = grossTotal - discountTotal;
                                        const vatableSales = netTotal / 1.12;
                                        const vatAmount = netTotal - vatableSales;

                                        return (
                                            <div className="totals-section">
                                                <table className="totals-table w-full">
                                                    <tbody>
                                                        <tr>
                                                            <td className="w-[60%]" style={{ paddingLeft: '2.05in' }}>{formatCurrency(vatableSales)}</td>
                                                            <td className="table-right-col w-[40%]">{formatCurrency(grossTotal)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ paddingLeft: '2.05in' }}>{formatCurrency(vatAmount)}</td>
                                                            <td className="table-right-col">{formatCurrency(discountTotal)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ paddingLeft: '2.05in' }}>0.00</td>
                                                            <td className="table-right-col">0.00</td>
                                                        </tr>
                                                        <tr>
                                                            <td></td>
                                                            <td className="table-right-col font-black text-[12px]">{formatCurrency(netTotal)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td></td>
                                                            <td className="table-right-col">0.00</td>
                                                        </tr>
                                                        <tr>
                                                            <td>PO No. : {order.po_no || ""}</td>
                                                            <td className="table-right-col"></td>
                                                        </tr>
                                                        <tr>
                                                            <td>Salesman : {order.salesman_id?.salesman_name || "N/A"}</td>
                                                            <td className="table-right-col font-black text-[12px]">{formatCurrency(netTotal)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div
                                    ref={componentRef}
                                    id="receipt-print-area"
                                    className="receipt-print-area thermal-paper-sheet thermal-preview-sheet bg-white text-zinc-900 font-mono"
                                    style={{ boxSizing: "border-box", flexShrink: 0, width: thermalPaperWidth }}
                                >
                                    <div
                                        className="thermal-receipt-area"
                                        style={{ boxSizing: "border-box", width: thermalContentWidth }}
                                    >
                                        <div className="flex justify-start py-2">
                                            <img 
                                                src="/men2.png" 
                                                alt="MEN2 Logo" 
                                                className="w-[45mm] max-w-full h-auto object-contain grayscale" 
                                            />
                                        </div>

                                        <pre className="thermal-pre">{thermalTextLines.join("\n")}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-4 bg-muted/10 border-t flex gap-3 flex-shrink-0">
                        <Button variant="outline" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={() => setIsPreviewOpen(false)}>
                            Close
                        </Button>
                        <Button className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20" onClick={handlePrint}>
                            Print Receipt
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};
