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
    CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConvertToInvoiceModal } from "./ConvertToInvoiceModal";
import { useDebouncedCallback } from "use-debounce";

interface SalesOrderModalProps {
    order: SalesOrder | null;
    open: boolean;
    onClose: () => void;
    onUpdateRemarks: (orderId: number, newRemarks: string) => void;
}

export const SalesOrderModal: React.FC<SalesOrderModalProps> = ({ order, open, onClose, onUpdateRemarks }) => {
    const [remarks, setRemarks] = useState(order?.remarks || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("details");

    const lastSavedRemarksRef = useRef(order?.remarks || "");
    const prevOrderIdRef = useRef(order?.order_id);
    const isUserChangeRef = useRef(false);

    useEffect(() => {
        if (order) {
            // Only reset remarks if the Order ID actually changed (switching to a different order)
            if (prevOrderIdRef.current !== order.order_id) {
                setRemarks(order.remarks || "");
                lastSavedRemarksRef.current = order.remarks || "";
                prevOrderIdRef.current = order.order_id;
                isUserChangeRef.current = false; // Reset flag on order switch
            }
            setActiveTab("details");
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
                                    <div className="space-y-1">
                                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary/70">Sales Order Detail</p>
                                        <div className="text-lg md:text-2xl font-black tracking-tight">
                                            <span className="text-foreground">{order.order_no}</span>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex flex-col items-center gap-1 text-muted-foreground mt-1">
                                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary/70">PO Ref</p>
                                        <p className="text-sm md:text-lg font-black tracking-tight text-foreground uppercase">
                                            {order.po_no || "—"}
                                        </p>
                                    </div>
                                    <div className="hidden md:flex flex-col items-end gap-1.5 text-muted-foreground mt-1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1 w-1 rounded-full bg-primary/30" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                                                Order Date: <span className="text-foreground ml-1">{order.order_date ? format(new Date(order.order_date), "MMMM dd, yyyy") : "—"}</span>
                                            </p>
                                        </div>
                                        <div className="flex">
                                            <Badge variant="outline" className="text-[9px] py-0 px-2 bg-primary/10 border-primary/50 text-primary uppercase font-bold tracking-wider">
                                                {order.receipt_type?.type || "Standard"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="md:hidden flex flex-col gap-2 mt-2 pt-2 border-t border-primary/5">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Date: <span className="text-foreground ml-1">{order.order_date ? format(new Date(order.order_date), "MMMM dd, yyyy") : "—"}</span>
                                        </p>
                                        <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-primary/10 border-primary/40 text-primary uppercase font-bold tracking-wider">
                                            {order.receipt_type?.type || "Standard"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
                
                {/* Background Decorative Element */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 blur-3xl opacity-20 bg-primary h-32 w-32 rounded-full hidden md:block" />
            </DialogHeader>

                <div className="p-4 md:p-6 overflow-y-auto flex-grow custom-scrollbar">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl mb-4 md:mb-6 ring-1 ring-border/50">
                            <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs md:text-sm">
                                <User className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                <span className="hidden xs:inline">Details</span>
                                <span className="xs:hidden">Info</span>
                            </TabsTrigger>
                            <TabsTrigger value="financials" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs md:text-sm">
                                <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                <span className="hidden xs:inline">Financials</span>
                                <span className="xs:hidden">Cash</span>
                            </TabsTrigger>
                            <TabsTrigger value="timeline" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs md:text-sm">
                                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                <span className="hidden xs:inline">Timeline</span>
                                <span className="xs:hidden">Step</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="min-h-[300px] md:min-h-[380px]">
                            <AnimatePresence mode="wait">
                                {/* DETAILS TAB */}
                                {activeTab === "details" && (
                                    <motion.div
                                        key="details"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
                                    >
                                        <Card className="bg-muted/10 border-primary/10 hover:bg-muted/20 transition-colors duration-300">
                                            <CardHeader className="pb-2 p-3 md:p-6 flex flex-col items-center">
                                                <CardTitle className="text-xs font-bold text-primary flex items-center gap-2">
                                                    <User className="h-4 w-4" /> Customer Information
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center text-center">
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Customer Name</p>
                                                <p className="font-bold text-sm md:text-base leading-tight mb-2 break-words max-w-[250px]">{order.customer_code?.customer_name || "—"}</p>
                                                <Badge variant="secondary" className="font-mono text-[9px] md:text-[10px]">{order.customer_code?.customer_code || "N/A"}</Badge>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-muted/10 border-primary/10 hover:bg-muted/20 transition-colors duration-300">
                                            <CardHeader className="pb-2 p-3 md:p-6 flex flex-col items-center">
                                                <CardTitle className="text-xs font-bold text-primary flex items-center gap-2">
                                                    <Briefcase className="h-4 w-4" /> Sales Personnel
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center text-center">
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Salesman</p>
                                                <p className="font-bold text-sm md:text-base leading-tight mb-2 break-words max-w-[250px]">{order.salesman_id?.salesman_name || "—"}</p>
                                                <Badge variant="secondary" className="font-mono text-[9px] md:text-[10px]">{order.salesman_id?.salesman_code || "N/A"}</Badge>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-muted/10 border-primary/10">
                                            <CardHeader className="pb-2 p-3 md:p-6 flex flex-col items-center">
                                                <CardTitle className="text-xs font-bold text-primary flex items-center gap-2">
                                                    <Building2 className="h-4 w-4" /> Supplier
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center text-center justify-center">
                                                <p className="font-bold text-xs md:text-sm break-words max-w-[200px]">{order.supplier_id?.supplier_name || "—"}</p>
                                                <p className="text-[10px] md:text-xs text-muted-foreground">Main Supplier</p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-muted/10 border-primary/10">
                                            <CardHeader className="pb-2 p-3 md:p-6 flex flex-col items-center">
                                                <CardTitle className="text-xs font-bold text-primary flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" /> Branch
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 md:p-6 pt-0 md:pt-0 flex flex-col items-center text-center justify-center">
                                                <p className="font-bold text-xs md:text-sm break-words max-w-[200px]">{order.branch_id?.branch_name || "—"}</p>
                                                <p className="text-[10px] md:text-xs text-muted-foreground">Allocation Branch</p>
                                            </CardContent>
                                        </Card>

                                        <div className="md:col-span-2 space-y-2 mt-4">
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor="remarks" className="font-black text-primary uppercase text-[10px] md:text-xs tracking-widest">Remarks & Notes</Label>
                                                <AnimatePresence mode="wait">
                                                    {isSaving ? (
                                                        <motion.span 
                                                            key="saving"
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -5 }}
                                                            className="text-[9px] md:text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 font-bold flex items-center gap-1"
                                                        >
                                                            <Loader2 className="h-2 w-2 animate-spin" /> saving...
                                                        </motion.span>
                                                    ) : (remarks || "").trim() !== (lastSavedRemarksRef.current || "").trim() ? (
                                                        <motion.span 
                                                            key="unsaved"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="text-[9px] md:text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold flex items-center gap-1"
                                                        >
                                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" /> unsaved
                                                        </motion.span>
                                                    ) : (
                                                        <motion.span 
                                                            key="saved"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            className="text-[9px] md:text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1"
                                                        >
                                                            <CheckCircle2 className="h-2.5 w-2.5" /> saved
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div className="relative group">
                                                <Textarea
                                                    id="remarks"
                                                    placeholder="Add special instructions or order notes here..."
                                                    value={remarks}
                                                    onChange={(e) => {
                                                        isUserChangeRef.current = true;
                                                        setRemarks(e.target.value);
                                                    }}
                                                    className="min-h-[80px] md:min-h-[100px] bg-muted/5 border-primary/10 focus-visible:ring-primary/40 focus:bg-background transition-all duration-300 rounded-xl text-xs pr-10"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* FINANCIALS TAB */}
                                {activeTab === "financials" && (
                                    <motion.div
                                        key="financials"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4 md:space-y-6"
                                    >
                                        <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
                                            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-5">
                                                <CreditCard size={80} className="rotate-12 md:w-[120px] md:h-[120px]" />
                                            </div>
                                            <CardContent className="p-4 md:p-8 text-center">
                                                <p className="text-[10px] font-black uppercase text-primary/70 tracking-[0.2em] mb-2">Grand Total Amount</p>
                                                <h2 className="text-xl md:text-3xl font-black text-primary tracking-tighter antialiased break-words">
                                                    {formatCurrency(order.total_amount)}
                                                </h2>
                                                <div className="flex items-center justify-center gap-2 mt-2 md:mt-4">
                                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] md:text-[10px]">
                                                        Allocated: {formatCurrency(order.allocated_amount)}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                            <Card className="bg-muted/5 border-border/50">
                                                <CardContent className="p-3 md:p-4 md:pt-6 text-center">
                                                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1">Gross Amount</p>
                                                    <p className="text-sm md:text-base font-bold">{formatCurrency((order.net_amount || 0) + (order.discount_amount || 0))}</p>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-muted/5 border-border/50">
                                                <CardContent className="p-3 md:p-4 md:pt-6 text-center">
                                                    <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Discount</p>
                                                    <p className="text-sm md:text-base font-bold text-destructive">-{formatCurrency(order.discount_amount)}</p>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-muted/10 border-primary/10">
                                                <CardContent className="p-3 md:p-4 md:pt-6 text-center">
                                                    <p className="text-[9px] md:text-[10px] font-bold text-primary uppercase mb-1">Net Amount</p>
                                                    <p className="text-sm md:text-base font-black">{formatCurrency(order.net_amount)}</p>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </motion.div>
                                )}

                                {/* TIMELINE TAB */}
                                {activeTab === "timeline" && (
                                    <motion.div
                                        key="timeline"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="min-h-[300px] md:min-h-[380px]"
                                    >
                                        <div className="relative pl-6 space-y-6 md:space-y-8 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-[2px] before:bg-gradient-to-b before:from-primary before:to-muted">
                                            {timelineData.map((item, idx) => {
                                                const hasDate = !!item.date;
                                                const Icon = item.icon;
                                                return (
                                                    <div key={idx} className="relative group">
                                                        <div className={`absolute -left-[30px] p-1 md:p-1.5 rounded-full border-2 transition-all duration-500 z-10 ${
                                                            hasDate 
                                                            ? "bg-primary border-primary scale-110 shadow-[0_0_15px_rgba(var(--primary),0.3)]" 
                                                            : "bg-background border-muted scale-90"
                                                        }`}>
                                                            {hasDate ? (
                                                                <Icon className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
                                                            ) : (
                                                                <Circle className="h-3 w-3 md:h-4 md:w-4 text-muted" />
                                                            )}
                                                        </div>
                                                        <div className={`p-3 md:p-4 rounded-xl border transition-all duration-300 ${
                                                            hasDate 
                                                            ? "bg-card border-primary/20 shadow-sm" 
                                                            : "bg-muted/5 border-transparent opacity-60"
                                                        }`}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <h4 className={`text-[10px] md:text-xs font-black uppercase tracking-wide ${hasDate ? "text-foreground" : "text-muted-foreground"}`}>
                                                                    {item.label}
                                                                </h4>
                                                                {hasDate && (
                                                                    <Badge variant="ghost" className="text-[8px] md:text-[10px] font-mono text-primary/70 px-1 md:px-2">
                                                                        <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                                                                        DONE
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className={`text-[10px] md:text-xs font-bold font-mono ${hasDate ? "text-primary/70" : "text-muted-foreground/50"}`}>
                                                                {hasDate ? formatDate(item.date) : "Step Pending"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Tabs>
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
