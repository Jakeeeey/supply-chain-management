"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SalesOrder, LogisticsData, ConversionData, ConversionItem } from "../types";
import { InvoicingService } from "../services/InvoicingService";
import { generateInvoicingPDF, ReceiptData } from "../utils/generateInvoicingPDF";
import { format } from "date-fns";
import { ReceiptTemplateEditor } from "./ReceiptTemplateEditor";
import { ORTemplate } from "../types";
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
    CheckCircle,
    Printer,
    Settings2
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
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [orTemplate, setOrTemplate] = useState<ORTemplate | undefined>(undefined);
    const [isHoldConfirmOpen, setIsHoldConfirmOpen] = useState(false);
    const [isHolding, setIsHolding] = useState(false);

    const componentRef = useRef<HTMLDivElement>(null);
    const barcodeRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen && order) {
            setLoading(true);
            const typeId = order.receipt_type?.id;
            
            Promise.all([
                InvoicingService.getLogisticsData(order.order_id),
                InvoicingService.getConversionDetails(order.order_id),
                InvoicingService.getDiscountTypes(),
                typeId ? InvoicingService.getTemplate(typeId).catch(() => null) : Promise.resolve(null)
            ])
                .then(([logisticsData, convData, discTypes, fetchedTemplate]) => {
                    setLogistics(logisticsData);
                    setConversionData(convData);
                    setDiscountTypes(discTypes);
                    if (fetchedTemplate) {
                        setOrTemplate(fetchedTemplate);
                    }
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
        // Validate ALL receipts before opening preview
        for (const r of receipts) {
            if (!r.receipt_no.trim()) {
                toast.error(`Receipt ${receipts.indexOf(r) + 1}: Receipt Number is required`, { duration: 4000 });
                setActiveReceiptId(r.id); // Switch to the problematic tab
                return;
            }
            if (r.items.length === 0) {
                toast.error(`Receipt ${receipts.indexOf(r) + 1}: Must have at least one item`, { duration: 4000 });
                setActiveReceiptId(r.id);
                return;
            }
        }

        setIsValidating(true);
        try {
            // Validate uniqueness of ALL receipt numbers
            for (const r of receipts) {
                const exists = await InvoicingService.validateReceiptNo(r.receipt_no);
                if (exists) {
                    toast.error(`Receipt Number "${r.receipt_no}" already exists!`, {
                        description: `Check Receipt ${receipts.indexOf(r) + 1}`,
                        duration: 5000
                    });
                    setActiveReceiptId(r.id);
                    return;
                }
            }

            // All valid — open preview showing ALL receipts
            setReceiptToPreview(receipts[0]); // Keep for backwards compat
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
            // Bulk Backend Update: Create Invoices, Update Order and Details
            const updateRes = await fetch(`/api/scm/invoicing/generate-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order: order,
                    receipts: receipts
                })
            });
            
            if (!updateRes.ok) {
                const errText = await updateRes.text();
                console.error("Failed to generate invoices", errText);
                toast.error("Database update failed. Check logs.");
                return;
            }

            const result = await updateRes.json();
            if (result.warning) {
                toast.warning("Invoices generated with warnings: " + result.warning, { duration: 6000 });
            } else {
                toast.success("Invoices generated successfully!");
            }
            
            onClose();
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast.error("Error generating invoices");
        } finally {
            setIsValidating(false);
        }
    };

    const handleHoldOrder = async () => {
        if (!order) return;
        setIsHolding(true);
        try {
            const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/items/sales_order/${order.order_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.DIRECTUS_STATIC_TOKEN || ""}`
                },
                body: JSON.stringify({
                    order_status: "On Hold",
                    on_hold_at: new Date().toISOString()
                })
            });

            if (!updateRes.ok) {
                const errText = await updateRes.text();
                console.error("Failed to hold order", errText);
                toast.error("Failed to place order on hold");
                return;
            }

            toast.warning("Order placed on hold successfully!");
            onClose();
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast.error("Error holding order");
        } finally {
            setIsHolding(false);
            setIsHoldConfirmOpen(false);
        }
    };

    const handlePrint = async () => {
        if (!order || receipts.length === 0) return;

        // Validate ALL receipts before printing
        for (const r of receipts) {
            if (!r.receipt_no.trim()) {
                toast.error(`Receipt ${receipts.indexOf(r) + 1}: Receipt Number is required`, { duration: 4000 });
                setActiveReceiptId(r.id); // Switch to the problematic tab
                return;
            }
            if (r.items.length === 0) {
                toast.error(`Receipt ${receipts.indexOf(r) + 1}: Must have at least one item`, { duration: 4000 });
                setActiveReceiptId(r.id);
                return;
            }
        }

        setIsValidating(true);
        try {
            // Validate uniqueness of ALL receipt numbers
            for (const r of receipts) {
                const exists = await InvoicingService.validateReceiptNo(r.receipt_no);
                if (exists) {
                    toast.error(`Receipt Number "${r.receipt_no}" already exists!`, {
                        description: `Check Receipt ${receipts.indexOf(r) + 1}`,
                        duration: 5000
                    });
                    setActiveReceiptId(r.id);
                    setIsValidating(false);
                    return;
                }
            }
        } catch (err) {
            toast.error("Error validating receipt number");
            setIsValidating(false);
            return;
        }

        const fullName = conversionData?.customer?.customer_name || 'N/A';
        const storeName = conversionData?.customer?.store_name || fullName;
        const address = `${conversionData?.customer?.province || 'N/A'}, ${conversionData?.customer?.city || 'N/A'}, ${conversionData?.customer?.brgy || 'N/A'}`;

        // Generate barcode programmatically using JsBarcode on an offscreen canvas
        let barcodeDataUrl;
        if (isOfficialReceipt && receipts[0]?.receipt_no) {
            try {
                const JsBarcode = (await import('jsbarcode')).default;
                const offscreenCanvas = document.createElement('canvas');
                JsBarcode(offscreenCanvas, receipts[0].receipt_no, {
                    format: 'CODE128',
                    height: 35,
                    width: 1.2,
                    fontSize: 10,
                    margin: 0,
                    background: 'transparent',
                    displayValue: true,
                });
                barcodeDataUrl = offscreenCanvas.toDataURL('image/png');
            } catch (err) {
                console.warn("Failed to generate barcode:", err);
            }
        }

        try {
            // Generate a multi-page PDF covering ALL receipts
            let combinedDoc: any = null;
            for (let i = 0; i < receipts.length; i++) {
                const r = receipts[i];
                const data: ReceiptData = {
                    receipt_no: r.receipt_no,
                    items: r.items,
                    customer_name: fullName,
                    store_name: storeName,
                    customer_tin: conversionData?.customer?.customer_tin || "N/A",
                    address: address,
                    payment_name: conversionData?.payment_name || "N/A",
                    po_no: order.po_no || "",
                    salesman_name: order.salesman_id?.salesman_name || "N/A",
                    is_official: isOfficialReceipt,
                    discountTypes: discountTypes,
                    barcodeDataUrl: i === 0 ? barcodeDataUrl : undefined,
                    template: orTemplate
                };

                const doc = await generateInvoicingPDF(data);

                if (i === 0) {
                    combinedDoc = doc;
                } else {
                    // Add new page to first doc and copy content
                    const pageCount = doc.getNumberOfPages();
                    for (let p = 1; p <= pageCount; p++) {
                        combinedDoc.addPage([orTemplate?.width || 210, orTemplate?.height || 265]);
                        // Copy page internal data using jsPDF's internal method
                        // (jsPDF doesn't have native merge, so we re-render data on new page)
                        const pageData = (doc.internal as any).pages[p];
                        if (pageData) {
                            (combinedDoc.internal as any).pages.push(pageData);
                            // Remove the blank page we just added
                            const pages = (combinedDoc.internal as any).pages;
                            pages.splice(pages.length - 2, 1);
                        }
                    }
                }
            }

            if (!combinedDoc) return;

            // New filename format: [Order Number]-[Receipt Number(s)]
            const receiptString = receipts.map(r => r.receipt_no).join('-');
            const filename = `${order.order_no}-${receiptString}.pdf`;

            combinedDoc.save(filename);

            toast.success(`PDF downloaded (${receipts.length} receipt${receipts.length > 1 ? 's' : ''})`);

            // Backend Update: Submit ALL receipts to generate-invoice API
            try {
                const updateRes = await fetch(`/api/scm/invoicing/generate-invoice`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        order: order,
                        receipts: receipts // All receipts
                    })
                });

                if (!updateRes.ok) {
                    const errText = await updateRes.text();
                    console.error("Failed to update DB on print", errText);
                    toast.warning("PDF downloaded, but database update failed.", { duration: 5000 });
                } else {
                    const result = await updateRes.json();
                    if (result.warning) {
                        toast.warning("DB Update had warnings: " + result.warning, { duration: 6000 });
                    } else {
                        toast.success("Order status updated to For Loading", { duration: 4000 });
                    }

                    onClose();
                    window.location.reload();
                }
            } catch (patchErr) {
                console.error("Error updating status:", patchErr);
                toast.warning("PDF downloaded, but network error on DB update.");
            }

        } catch (err) {
            console.error("Error generating PDF:", err);
            toast.error("Failed to generate PDF");
            setIsValidating(false);
        }
    };

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
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] md:max-w-6xl p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl flex flex-col h-[90vh]">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-background to-transparent border-b flex-shrink-0">
                    <DialogTitle className="sr-only">Convert to Invoice - {order.order_no}</DialogTitle>
                    <div className="space-y-4">
                        {/* Consolidated Header Row */}
                        <div className="flex items-center justify-between gap-6">
                            {/* Order Info */}
                            <div className="flex items-center gap-6">
                                <div className="space-y-0.5 min-w-[120px]">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 opacity-70">
                                        <Hash size={10} /> Order No
                                    </p>
                                    <p className="font-black text-xs text-primary">{order.order_no}</p>
                                </div>
                                <div className="space-y-0.5 min-w-[120px]">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 opacity-70">
                                        <FileText size={10} /> PO Ref
                                    </p>
                                    <p className="font-black text-xs text-foreground/80">{order.po_no || "—"}</p>
                                </div>
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
                                            <div className="col-span-5">Product</div>
                                            <div className="col-span-1 text-center">Unit</div>
                                            <div className="col-span-1 text-center">Qty</div>
                                            <div className="col-span-1 text-right">Price</div>
                                            <div className="col-span-2 text-center">Discount Type</div>
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
                                                            <div className="col-span-5">
                                                                <p className="text-xs font-black text-foreground line-clamp-2">{item.product_name}</p>
                                                            </div>
                                                            <div className="col-span-1 text-center">
                                                                <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 h-4 min-w-[30px] justify-center bg-primary/5 text-primary border-primary/20">
                                                                    {item.unit_shortcut}
                                                                </Badge>
                                                            </div>
                                                            <div className="col-span-1 px-1">
                                                                <Input
                                                                    type="number"
                                                                    value={item.qty}
                                                                    onChange={(e) => updateItemQty(r.id, item.product_id, parseInt(e.target.value) || 0)}
                                                                    className="h-7 w-full rounded-md text-center font-bold text-[10px] p-0"
                                                                />
                                                            </div>
                                                            <div className="col-span-1 text-right">
                                                                <p className="text-[10px] font-medium whitespace-nowrap">{formatCurrency(item.unit_price)}</p>
                                                            </div>
                                                            <div className="col-span-2 text-center">
                                                                <p className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                                                                    {(() => {
                                                                        const dt = discountTypes.find(d => d.id === item.discount_type);
                                                                        return dt ? dt.discount_type : "NONE";
                                                                    })()}
                                                                </p>
                                                            </div>
                                                            <div className="col-span-1 text-right">
                                                                <p className="text-[10px] font-black text-primary whitespace-nowrap">{formatCurrency(item.net_amount)}</p>
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
                            onClick={() => setIsHoldConfirmOpen(true)}
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
                            className="w-full sm:w-auto h-11 px-10 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 bg-gradient-to-r from-primary to-primary/80"
                            onClick={handlePrint}
                            disabled={isValidating}
                        >
                            {isValidating ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : (
                                <Printer className="h-3.5 w-3.5 mr-2" />
                            )}
                            Print Receipt
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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
                                .preview-sheet { box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18); position: relative; }
                                .template-field { position: absolute; border: 1px dashed transparent; white-space: nowrap; pointer-events: none; }
                                .thermal-preview-sheet { width: 58mm; box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18); }
                                .thermal-divider { border-top: 1px dashed #000; margin: 3mm 0; }
                                .thermal-pre {
                                    white-space: pre-wrap;
                                    word-break: break-word;
                                    margin: 0;
                                    font-size: 10px;
                                    line-height: 1.15;
                                    letter-spacing: -0.2px;
                                    font-weight: 500;
                                }
                            `}
                        </style>
                        <div className="preview-shell flex-col gap-8">
                            {isOfficialReceipt ? (
                                receipts.map((currentReceipt, receiptIdx) => (
                                <div
                                    key={currentReceipt.id}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}
                                >
                                    {receipts.length > 1 && (
                                        <div className="mb-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
                                            Receipt {receiptIdx + 1} of {receipts.length} &mdash; {currentReceipt.receipt_no}
                                        </div>
                                    )}
                                <div 
                                    ref={receiptIdx === 0 ? componentRef : undefined} 
                                    id={receiptIdx === 0 ? "receipt-print-area" : `receipt-print-area-${receiptIdx}`}
                                    className="receipt-print-area preview-sheet px-0 py-0 text-zinc-900 font-mono tracking-tight bg-white overflow-hidden" 
                                    style={{ 
                                        width: `${orTemplate?.width || 210}mm`, 
                                        height: `${orTemplate?.height || 265}mm`, 
                                        boxSizing: 'border-box', 
                                        flexShrink: 0 
                                    }}
                                >
                                    {orTemplate?.backgroundImage && (
                                        <img 
                                            src={InvoicingService.getImageUrl(orTemplate.backgroundImage)} 
                                            className="absolute inset-0 w-full h-full object-fill opacity-70 pointer-events-none" 
                                            alt="Template Background" 
                                        />
                                    )}

                                    {/* Dynamic Fields Rendering */}
                                    {(() => {
                                        const fullName = conversionData?.customer?.customer_name || 'N/A';
                                        const storeName = conversionData?.customer?.store_name || fullName;
                                        const grossTotal = currentReceipt.items.reduce((s, i) => s + (i.unit_price * i.qty), 0) || 0;
                                        const discountTotal = currentReceipt.items.reduce((s, i) => s + i.discount_amount, 0) || 0;
                                        const netTotal = grossTotal - discountTotal;
                                        const vatableSales = netTotal / 1.12;
                                        const vatAmount = netTotal - vatableSales;

                                        const fieldValues: Record<string, string> = {
                                            customer_name: fullName.toUpperCase(),
                                            date: format(new Date(), "MMM dd, yyyy").toUpperCase(),
                                            store_name: storeName.toUpperCase(),
                                            payment_name: (conversionData?.payment_name || "N/A").toUpperCase(),
                                            customer_tin: conversionData?.customer?.customer_tin || 'N/A',
                                            address: `${conversionData?.customer?.province || 'N/A'}, ${conversionData?.customer?.city || 'N/A'}, ${conversionData?.customer?.brgy || 'N/A'}`.toUpperCase(),
                                            vatable_sales: formatCurrency(vatableSales),
                                            vat_amount: formatCurrency(vatAmount),
                                            gross_total: formatCurrency(grossTotal),
                                            discount_total: formatCurrency(discountTotal),
                                            net_total: formatCurrency(netTotal),
                                            po_no: `PO NO. : ${order.po_no || ""}`,
                                            salesman: `SALESMAN : ${order.salesman_id?.salesman_name || "N/A"}`,
                                            total_amount_due: formatCurrency(netTotal),
                                            net_total_footer: formatCurrency(netTotal),
                                            zero_rated: "0.00",
                                            exempt: "0.00",
                                            withholding_tax: "0.00"
                                        };

                                        return (
                                            <>
                                                {/* Specialized Barcode rendering */}
                                                <div className="template-field" style={{ 
                                                    left: orTemplate?.fields?.barcode ? `${orTemplate.fields.barcode.x}mm` : 'auto',
                                                    right: orTemplate?.fields?.barcode ? 'auto' : '0.3in', 
                                                    top: orTemplate?.fields?.barcode ? `${orTemplate.fields.barcode.y}mm` : '0.1in',
                                                    display: 'flex',
                                                    justifyContent: 'flex-start',
                                                    width: 'auto',
                                                    pointerEvents: 'none'
                                                }}>
                                                    <div className="inline-block">
                                                        <Barcode
                                                            ref={receiptIdx === 0 ? barcodeRef : null}
                                                            value={currentReceipt.receipt_no || "N/A"}
                                                            height={35}
                                                            width={1.2}
                                                            fontSize={10}
                                                            margin={0}
                                                            background="transparent"
                                                            renderer="canvas"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Render template defined fields */}
                                                {orTemplate ? (
                                                    Object.entries(orTemplate.fields).map(([key, config]) => {
                                                        const val = fieldValues[key];
                                                        if (!val) return null;
                                                        return (
                                                            <div 
                                                                key={key} 
                                                                className="template-field"
                                                                style={{
                                                                    left: `${config.x}mm`,
                                                                    top: `${config.y}mm`,
                                                                    fontSize: `${config.fontSize}pt`,
                                                                    fontFamily: config.fontFamily === 'courier' ? 'monospace' : config.fontFamily,
                                                                    fontWeight: config.fontWeight,
                                                                    letterSpacing: `${config.charSpacing ?? 0}pt`,
                                                                    transform: `scaleX(${config.scaleX ?? 1})`,
                                                                    transformOrigin: 'left center'
                                                                }}
                                                            >
                                                                {val}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    /* Fallback for no template */
                                                    <div className="p-8 text-center text-muted-foreground italic">
                                                        No template layout configured.
                                                    </div>
                                                )}

                                                {/* Table Rendering */}
                                                <div 
                                                    className="template-field w-full" 
                                                    style={{ 
                                                        left: 0, 
                                                        top: `${orTemplate?.tableSettings?.startY || 65}mm` 
                                                    }}
                                                >
                                                    <div className="w-full">
                                                        {(currentReceipt.items || []).map((item, idx) => {
                                                            const tableSet = orTemplate?.tableSettings;
                                                            const rowHeight = tableSet?.rowHeight || 12.2;
                                                            const fontSize = tableSet?.fontSize || 10;
                                                            const cols = tableSet?.columns;
                                                            
                                                            // Standardized widths to match designer assumptions
                                                            const w = {
                                                                product_name: 85,
                                                                quantity: 22,
                                                                unit_price: 28,
                                                                discount: 25,
                                                                net_amount: 30
                                                            };

                                                            return (
                                                                <div 
                                                                    key={idx} 
                                                                    className="relative w-full" 
                                                                    style={{ 
                                                                        height: `${rowHeight}mm`,
                                                                        fontFamily: 'monospace',
                                                                        fontSize: `${fontSize}pt`
                                                                    }}
                                                                >
                                                                    {/* Left Aligned */}
                                                                    <div 
                                                                        className="absolute font-bold uppercase whitespace-normal leading-[1.1]" 
                                                                        style={{ 
                                                                            left: `${cols?.product_name?.x || 10}mm`, 
                                                                            width: `${orTemplate?.tableSettings?.product_name_width || w.product_name}mm` 
                                                                        }}
                                                                    >
                                                                        {item.product_name}
                                                                    </div>
                                                                    
                                                                    {/* Center Aligned Anchor: left = x - (width/2) */}
                                                                    <div 
                                                                        className="absolute font-bold text-center" 
                                                                        style={{ left: `${(cols?.quantity?.x || 105) - (w.quantity / 2)}mm`, width: `${w.quantity}mm` }}
                                                                    >
                                                                        {item.qty} {item.unit_shortcut}
                                                                    </div>
                                                                    
                                                                    {/* Right Aligned Anchor: left = x - width */}
                                                                    <div 
                                                                        className="absolute font-bold text-right" 
                                                                        style={{ left: `${(cols?.unit_price?.x || 126) - w.unit_price}mm`, width: `${w.unit_price}mm` }}
                                                                    >
                                                                        {formatCurrency(item.unit_price)}
                                                                    </div>
                                                                    
                                                                    <div 
                                                                        className="absolute font-bold text-right uppercase" 
                                                                        style={{ left: `${(cols?.discount?.x || 153) - w.discount}mm`, width: `${w.discount}mm` }}
                                                                    >
                                                                        {(() => {
                                                                            const dt = discountTypes.find(d => d.id === item.discount_type);
                                                                            return dt ? dt.discount_type : "NONE";
                                                                        })()}
                                                                    </div>
                                                                    
                                                                    <div 
                                                                        className="absolute font-bold text-right" 
                                                                        style={{ left: `${(cols?.net_amount?.x || 184) - w.net_amount}mm`, width: `${w.net_amount}mm` }}
                                                                    >
                                                                        {formatCurrency(item.net_amount)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                </div>
                                ))
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

                    <DialogFooter className="p-4 bg-muted/10 border-t flex flex-col sm:flex-row gap-3 flex-shrink-0">
                        {isOfficialReceipt && (
                            <Button 
                                variant="outline" 
                                className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5" 
                                onClick={() => setIsTemplateEditorOpen(true)}
                            >
                                <Settings2 className="w-4 h-4 mr-2" />
                                Configure Layout
                            </Button>
                        )}
                        <div className="flex flex-1 gap-3">
                            <Button variant="outline" className="w-full rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={() => setIsPreviewOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReceiptTemplateEditor 
                isOpen={isTemplateEditorOpen}
                initialTemplate={orTemplate}
                onClose={() => setIsTemplateEditorOpen(false)}
                onSave={async (newTemplate) => {
                    try {
                        const typeId = order?.receipt_type?.id;
                        if (!typeId) {
                            toast.error("Cannot save template: Receipt Type ID is missing.");
                            return;
                        }
                        await InvoicingService.saveTemplate(typeId, newTemplate);
                        setOrTemplate(newTemplate);
                        setIsTemplateEditorOpen(false);
                        toast.success("Template saved successfully to database");
                    } catch (err) {
                        console.error("Failed to save template:", err);
                        toast.error("Failed to save template to database");
                    }
                }}
            />

            {/* HOLD ORDER CONFIRMATION DIALOG */}
            <Dialog open={isHoldConfirmOpen} onOpenChange={setIsHoldConfirmOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-amber-500 p-6 flex flex-col items-center text-white">
                        <div className="bg-white/20 p-4 rounded-full mb-4">
                            <Lock size={32} className="text-white" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-widest">Hold Order?</h3>
                        <p className="text-amber-50 text-center text-xs mt-2 font-medium">Are you sure you want to place this order on hold? This will move it out of the invoicing list.</p>
                    </div>
                    <div className="p-6 bg-white flex flex-col gap-3">
                        <Button 
                            className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                            onClick={handleHoldOrder}
                            disabled={isHolding}
                        >
                            {isHolding ? (
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            ) : null}
                            Confirm Hold
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest text-muted-foreground hover:bg-muted"
                            onClick={() => setIsHoldConfirmOpen(false)}
                            disabled={isHolding}
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
