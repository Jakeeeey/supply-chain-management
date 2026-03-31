"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SalesOrder } from "../types";
import { format } from "date-fns";
import { InvoicingService } from "../services/InvoicingService";
import { 
    Loader2, 
    Save, 
    Calendar, 
    User, 
    MapPin, 
    Briefcase, 
    Truck, 
    DollarSign, 
    Clock, 
    ClipboardList,
    CheckCircle2,
    Circle,
    Building2,
    CreditCard,
    FileText
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConvertToInvoiceModal } from "./ConvertToInvoiceModal";
import { useDebouncedCallback } from "use-debounce";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SalesOrderModalProps {
    order: SalesOrder | null;
    open: boolean;
    onClose: () => void;
    onUpdateRemarks: (orderId: number, newRemarks: string) => void;
    onUpdateReceiptType?: (orderId: number, typeId: number, receiptTypes: any[]) => void;
}

export const SalesOrderModal: React.FC<SalesOrderModalProps> = ({ order, open, onClose, onUpdateRemarks, onUpdateReceiptType }) => {
    const [remarks, setRemarks] = useState(order?.remarks || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [receiptTypes, setReceiptTypes] = useState<any[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    const [isUpdatingType, setIsUpdatingType] = useState(false);

    const lastSavedRemarksRef = useRef(order?.remarks || "");
    const prevOrderIdRef = useRef(order?.order_id);
    const isUserChangeRef = useRef(false);

    // Initialize selection
    useEffect(() => {
        if (order?.receipt_type?.id) {
            setSelectedTypeId(order.receipt_type.id.toString());
        }
    }, [order]);

    // Fetch receipt types
    useEffect(() => {
        if (open) {
            InvoicingService.getReceiptTypes()
                .then(setReceiptTypes)
                .catch(err => {
                    console.error("Failed to fetch receipt types", err);
                });
        }
    }, [open]);

    const handleTypeChange = async (newId: string) => {
        if (!order) return;
        setSelectedTypeId(newId);
        setIsUpdatingType(true);
        try {
            await InvoicingService.updateSalesOrderReceiptType(order.order_id, parseInt(newId));
            if (onUpdateReceiptType) {
                onUpdateReceiptType(order.order_id, parseInt(newId), receiptTypes);
            }
            toast.success("Receipt type updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update receipt type");
            if (order.receipt_type?.id) {
                setSelectedTypeId(order.receipt_type.id.toString());
            }
        } finally {
            setIsUpdatingType(false);
        }
    };

    useEffect(() => {
        if (order) {
            // Only reset remarks if the Order ID actually changed (switching to a different order)
            if (prevOrderIdRef.current !== order.order_id) {
                setRemarks(order.remarks || "");
                lastSavedRemarksRef.current = order.remarks || "";
                prevOrderIdRef.current = order.order_id;
                isUserChangeRef.current = false; // Reset flag on order switch
            }
        }
    }, [order]);

    const debouncedSave = useDebouncedCallback(async (newRemarks: string) => {
        const normalizedNew = (newRemarks || "").trim();
        const normalizedLast = (lastSavedRemarksRef.current || "").trim();
        
        if (!order || normalizedNew === normalizedLast) {
            isUserChangeRef.current = false;
            return;
        }
        
        setIsSaving(true);
        try {
            await InvoicingService.updateSalesOrderRemarks(order.order_id, normalizedNew);
            lastSavedRemarksRef.current = normalizedNew; // Update baseline immediately on success
            isUserChangeRef.current = false; // Reset flag after successful save
            onUpdateRemarks(order.order_id, normalizedNew);
            toast.success("Remarks auto-saved");
        } catch (error) {
            console.error(error);
            toast.error("Failed to auto-save remarks");
        } finally {
            setIsSaving(false);
        }
    }, 1500);

    useEffect(() => {
        // ONLY trigger auto-save if this change originated from the user typing
        if (order && isUserChangeRef.current) {
            const normalizedCurrent = (remarks || "").trim();
            const normalizedLast = (lastSavedRemarksRef.current || "").trim();

            if (normalizedCurrent !== normalizedLast) {
                debouncedSave(remarks);
            } else {
                // If text was reverted to original, reset the flag
                isUserChangeRef.current = false;
            }
        }
    }, [remarks, order?.order_id, debouncedSave]);

    if (!order) return null;

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return "Not Available";
        try {
            return format(new Date(dateString), "MMM dd, yyyy h:mm a");
        } catch {
            return dateString;
        }
    };

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === undefined) return "—";
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount);
    };


    const timelineData = [
        { label: "Created", date: order.created_date, icon: Clock },
        { label: "Approval", date: order.for_approval_at, icon: ClipboardList },
        { label: "Consolidation", date: order.for_consolidation_at, icon: Building2 },
        { label: "Picking", date: order.for_picking_at, icon: Briefcase },
        { label: "Invoicing", date: order.for_invoicing_at, icon: Calendar },
        { label: "Loading", date: order.for_loading_at, icon: Truck },
        { label: "Shipping", date: order.for_shipping_at, icon: Truck },
        { label: "Delivered", date: order.delivered_at, icon: CheckCircle2 },
    ];

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl ring-1 ring-border/50 flex flex-col">
                <DialogHeader className="p-4 md:p-6 pb-2 md:pb-4 bg-gradient-to-r from-primary/10 via-background to-transparent border-b relative overflow-hidden flex-shrink-0">
                    <DialogTitle className="sr-only">Sales Order Details - {order.order_no}</DialogTitle>
                    <div className="relative z-10 flex flex-col gap-2">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1.5 w-full">
                                <div className="flex justify-between items-start pr-8">
                                    <div className="flex gap-6 md:gap-12 items-start">
                                        <div className="space-y-4">
                                            {/* Sales Order Detail */}
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-primary/70">Sales Order Detail</p>
                                                <div className="text-[11px] font-black text-foreground leading-tight">
                                                    {order.order_no}
                                                </div>
                                            </div>

                                            {/* PO Ref */}
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-primary/70">PO Ref</p>
                                                <div className="text-[11px] font-black text-foreground leading-tight uppercase">
                                                    {order.po_no || "—"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle Information Section */}
                                        <div className="hidden lg:grid grid-cols-2 gap-x-10 gap-y-3 pt-1 border-l border-primary/10 pl-10">
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Customer</p>
                                                <p className="text-[11px] font-black text-foreground leading-tight">{order.customer_code?.customer_name || "—"}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Supplier</p>
                                                <p className="text-[11px] font-black text-foreground leading-tight">{order.supplier_id?.supplier_name || "—"}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Salesman</p>
                                                <p className="text-[11px] font-black text-foreground leading-tight">{order.salesman_id?.salesman_name || "—"}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Branch</p>
                                                <p className="text-[11px] font-black text-foreground leading-tight">{order.branch_id?.branch_name || "—"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex flex-col items-end gap-1.5 text-muted-foreground mt-1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-primary/30" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                                                Order Date: <span className="text-foreground ml-1">{order.order_date ? format(new Date(order.order_date), "MMMM dd, yyyy") : "—"}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Select 
                                                value={selectedTypeId} 
                                                onValueChange={handleTypeChange}
                                                disabled={isUpdatingType}
                                            >
                                                <SelectTrigger className="h-7 text-[10px] py-0 px-3 bg-primary/5 hover:bg-primary/10 border-primary/20 hover:border-primary/40 text-primary uppercase font-black tracking-widest rounded-full transition-all duration-200 shadow-sm hover:shadow-md focus:ring-0 focus:ring-offset-0 ring-0 w-auto min-w-[140px] gap-2 group">
                                                    <div className="flex items-center gap-2">
                                                        {isUpdatingType ? (
                                                            <Loader2 className="h-3 w-3 animate-spin text-primary/70" />
                                                        ) : (
                                                            <FileText className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" />
                                                        )}
                                                        <SelectValue placeholder="Receipt Type" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent position="popper" sideOffset={4} className="bg-background/98 backdrop-blur-xl border-primary/20 p-1.5 shadow-2xl rounded-xl min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                                                    {receiptTypes.map(t => (
                                                        <SelectItem 
                                                            key={t.id} 
                                                            value={t.id.toString()}
                                                            className="text-[10px] uppercase font-black tracking-widest rounded-lg focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors py-2 px-3"
                                                        >
                                                            {t.type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="md:hidden flex flex-col gap-2 mt-2 pt-2 border-t border-primary/5">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Date: <span className="text-foreground ml-1">{order.order_date ? format(new Date(order.order_date), "MMMM dd, yyyy") : "—"}</span>
                                        </p>
                                        <Select 
                                            value={selectedTypeId} 
                                            onValueChange={handleTypeChange}
                                            disabled={isUpdatingType}
                                        >
                                            <SelectTrigger className="h-7 text-[9px] py-0 px-3 bg-primary/5 border-primary/20 text-primary uppercase font-black tracking-widest rounded-full w-auto gap-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent position="popper" sideOffset={4} className="bg-background/98 backdrop-blur-xl border-primary/20 p-1 shadow-xl rounded-xl">
                                                {receiptTypes.map(t => (
                                                    <SelectItem key={t.id} value={t.id.toString()} className="text-[10px] uppercase font-black tracking-widest py-2">
                                                        {t.type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
                
                {/* Background Decorative Element */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 blur-3xl opacity-20 bg-primary h-32 w-32 rounded-full hidden md:block" />
            </DialogHeader>

                <div className="p-2 md:p-3 overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4 lg:h-[400px]">
                        {/* LEFT COLUMN: REMARKS & CASH */}
                        <div className="flex flex-col gap-4 h-[380px] lg:h-full overflow-y-auto lg:overflow-visible pr-1 custom-scrollbar">
                            {/* REMARKS & NOTES */}
                            <div className="space-y-2 flex-1 flex flex-col">
                                <div className="flex justify-between items-center px-1">
                                    <Label htmlFor="remarks" className="font-black text-primary uppercase text-[9px] md:text-[10px] tracking-widest">Remarks & Notes</Label>
                                    <AnimatePresence mode="wait">
                                        {isSaving ? (
                                            <motion.span 
                                                key="saving"
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                className="text-[8px] md:text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20 font-bold flex items-center gap-1"
                                            >
                                                <Loader2 className="h-2 w-2 animate-spin" /> saving...
                                            </motion.span>
                                        ) : (remarks || "").trim() !== (lastSavedRemarksRef.current || "").trim() ? (
                                            <motion.span 
                                                key="unsaved"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="text-[8px] md:text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-500/20 font-bold flex items-center gap-1"
                                            >
                                                <div className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" /> unsaved
                                            </motion.span>
                                        ) : (
                                            <motion.span 
                                                key="saved"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="text-[8px] md:text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1"
                                            >
                                                <CheckCircle2 className="h-2 w-2" /> saved
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="relative group flex-1">
                                    <Textarea
                                        id="remarks"
                                        placeholder="Add special instructions or order notes here..."
                                        value={remarks}
                                        onChange={(e) => {
                                            isUserChangeRef.current = true;
                                            setRemarks(e.target.value);
                                        }}
                                        className="h-full min-h-[80px] md:min-h-[100px] resize-none bg-muted/10 border-primary/10 focus-visible:ring-primary/40 focus:bg-background transition-all duration-500 rounded-xl text-xs md:text-sm p-3 md:p-4 shadow-sm border-none ring-1 ring-primary/5 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            {/* FINANCIALS (CASH) */}
                            <div className="space-y-2">
                                <Label className="font-black text-primary uppercase text-[10px] md:text-xs tracking-widest px-1">Financials Overview</Label>
                                <Card className="bg-primary/5 border-none ring-1 ring-primary/10 overflow-hidden relative rounded-xl group hover:shadow-lg transition-all duration-500">
                                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                                        <CreditCard size={56} className="rotate-12" />
                                    </div>
                                    <CardContent className="p-4 md:p-5 text-center flex flex-col justify-center">
                                        <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.3em] mb-1">ALLOCATED</p>
                                        <h2 className="text-2xl md:text-3xl font-black text-primary tracking-tighter antialiased break-words">
                                            {formatCurrency(order.allocated_amount)}
                                        </h2>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                                    <div className="bg-muted/20 border-none ring-1 ring-border/50 rounded-lg p-2.5 md:p-3 text-center hover:bg-muted/30 transition-colors">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Gross</p>
                                        <p className="text-xs md:text-sm font-bold text-foreground">{formatCurrency((order.net_amount || 0) + (order.discount_amount || 0))}</p>
                                    </div>
                                    <div className="bg-muted/20 border-none ring-1 ring-border/50 rounded-lg p-2.5 md:p-3 text-center hover:bg-muted/30 transition-colors">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1 tracking-wider">Discount</p>
                                        <p className="text-xs md:text-sm font-bold text-destructive">-{formatCurrency(order.discount_amount)}</p>
                                    </div>
                                    <div className="bg-primary/10 border-none ring-1 ring-primary/20 rounded-lg p-2.5 md:p-3 text-center hover:bg-primary/15 transition-colors">
                                        <p className="text-[9px] font-bold text-primary uppercase mb-1 tracking-wider">Net Amount</p>
                                        <p className="text-xs md:text-sm font-black text-primary">{formatCurrency(order.net_amount)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: STEPS (TIMELINE) */}
                        <div className="bg-muted/10 rounded-2xl border-none ring-1 ring-primary/5 flex flex-col shadow-sm h-[380px] lg:h-full overflow-hidden">
                            <div className="p-3 md:p-4 pb-0 mb-3">
                                <h3 className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                    <div className="h-5 w-5 md:h-6 md:w-6 rounded-md bg-primary/10 flex items-center justify-center">
                                        <Clock className="h-3 w-3 text-primary" />
                                    </div>
                                    Order Journey
                                </h3>
                            </div>
                            <div className="flex-1 overflow-hidden min-h-0">
                                <ScrollArea className="h-full w-full">
                                    <div className="pl-[38px] md:pl-[44px] pr-3 md:pr-4 pb-3 md:pb-4">
                                    <div className="relative pl-6 md:pl-7 space-y-2.5 md:space-y-3 before:absolute before:left-[11px] md:before:left-[13px] before:top-1.5 before:h-[calc(100%-12px)] before:w-[2px] before:bg-gradient-to-b before:from-primary/40 before:via-primary/20 before:to-transparent pt-1">
                                {timelineData.map((item, idx) => {
                                    const hasDate = !!item.date;
                                    const Icon = item.icon;
                                    return (
                                        <div key={idx} className="relative group">
                                            <div className={`absolute -left-[30px] md:-left-[34px] p-1 md:p-1.5 rounded-lg border-2 transition-all duration-700 z-10 ${
                                                hasDate 
                                                ? "bg-primary border-primary shadow-[0_0_15px_rgba(var(--primary),0.15)] scale-110" 
                                                : "bg-background border-muted/50 scale-90"
                                            }`}>
                                                {hasDate ? (
                                                    <Icon className="h-2.5 w-2.5 text-primary-foreground" />
                                                ) : (
                                                    <Circle className="h-2.5 w-2.5 text-muted/30" />
                                                )}
                                            </div>
                                            <div className={`p-2 md:p-2.5 rounded-xl border-none ring-1 transition-all duration-500 group-hover:translate-x-1 ${
                                                hasDate 
                                                ? "bg-card ring-primary/10 shadow-sm" 
                                                : "bg-muted/5 ring-transparent opacity-40"
                                            }`}>
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h4 className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${hasDate ? "text-foreground" : "text-muted-foreground"}`}>
                                                        {item.label}
                                                    </h4>
                                                    {hasDate && (
                                                        <Badge variant="ghost" className="text-[7px] font-mono bg-primary/5 text-primary px-1 py-0 rounded-sm">
                                                            SUCCESS
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className={`text-[9px] md:text-[10px] font-bold font-mono tracking-tight ${hasDate ? "text-primary/70" : "text-muted-foreground/40"}`}>
                                                    {hasDate ? formatDate(item.date) : "Status: Pending"}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                    </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Styled Footer */}
                <DialogFooter className="bg-muted/30 border-t p-4 flex flex-col-reverse sm:flex-row sm:justify-end items-center gap-3 md:gap-0 flex-shrink-0">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                            className="w-full sm:w-auto rounded-xl font-black uppercase text-[10px] md:text-xs tracking-[0.1em] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all h-9 md:h-10"
                            onClick={() => setIsConvertModalOpen(true)}
                        >
                            Convert to Invoice
                        </Button>
                    </div>
                </DialogFooter>

                <ConvertToInvoiceModal 
                    isOpen={isConvertModalOpen} 
                    onClose={() => setIsConvertModalOpen(false)} 
                    order={order} 
                />
            </DialogContent>
        </Dialog>
    );
};
