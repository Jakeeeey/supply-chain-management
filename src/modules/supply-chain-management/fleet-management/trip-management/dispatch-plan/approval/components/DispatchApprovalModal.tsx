"use client"

import React, { useState, useMemo } from "react"
import {
    MapPin, Truck, Package, Users, Wallet, FileText,
    Loader2, Download, AlertTriangle, CheckCircle2, Boxes, Receipt
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import { exportDispatchManifestPDF } from "../utils/exportManifest"
import { PostDispatchApprovalDto } from "../types"

const formatCurrency = (val: number) => `₱${(val || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

interface ModalProps {
    isOpen: boolean;
    isLoading: boolean;
    plan: PostDispatchApprovalDto | null;
    isProcessing: boolean;
    onClose: () => void;
    onAction: (id: number, action: "APPROVE" | "REJECT") => void;
}

export function DispatchApprovalModal({ isOpen, isLoading, plan, isProcessing, onClose, onAction }: ModalProps) {
    const [isExporting, setIsExporting] = useState(false);

    const totalBudget = plan?.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
    const hasValidBudget = plan?.budgets && plan.budgets.length > 0 && totalBudget > 0;

    // 📦 Aggregate Cargo Summary
    const supplierSummary = useMemo(() => {
        if (!plan || !plan.stops) return {};
        const summary: Record<string, Record<string, number>> = {};
        plan.stops.forEach(stop => {
            if (!stop.items) return;
            stop.items.forEach(item => {
                const sup = item.supplier || "UNKNOWN SUPPLIER";
                const unit = item.unit || "PC";
                if (!summary[sup]) summary[sup] = {};
                if (!summary[sup][unit]) summary[sup][unit] = 0;
                summary[sup][unit] += item.quantity;
            });
        });
        return summary;
    }, [plan]);

    // 🧾 Aggregate Receipts Summary
    const invoiceSummary = useMemo(() => {
        if (!plan || !plan.stops) return {};
        const summary: Record<string, { docNo: string, amount: number, date?: string }[]> = {};
        plan.stops.filter(s => s.type === "DELIVERY").forEach(stop => {
            const customer = stop.name || "UNKNOWN CUSTOMER";
            if (!summary[customer]) summary[customer] = [];
            summary[customer].push({
                docNo: stop.documentNo,
                amount: stop.documentAmount,
                date: stop.date
            });
        });
        return summary;
    }, [plan]);

    const handleExportPDF = async () => {
        if (!plan || !plan.stops) return;
        setIsExporting(true);
        try {
            setTimeout(() => {
                exportDispatchManifestPDF(plan);
                setIsExporting(false);
            }, 100);
        } catch (error) {
            console.error(error);
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
            <DialogContent
                // 🚀 MASSIVE EXPANSION: Now uses up to 1800px and 98vw for maximum breathing room
                className="max-w-[98vw] xl:max-w-[1600px] 2xl:max-w-[1800px] h-[96vh] flex flex-col p-0 overflow-hidden bg-background border border-border/40 rounded-2xl shadow-2xl duration-200"
            >
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-card">
                        <DialogTitle className="sr-only">Loading Manifest Data</DialogTitle>
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
                        <h3 className="text-xl font-black uppercase tracking-widest text-foreground">Pulling Manifest Data</h3>
                        <p className="text-base font-bold text-muted-foreground mt-2">Securely fetching cargo details...</p>
                    </div>
                ) : !plan ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-card">
                        <DialogTitle className="sr-only">Data Unavailable</DialogTitle>
                        <AlertTriangle className="w-16 h-16 text-destructive mb-6 opacity-80" />
                        <h3 className="text-3xl font-black uppercase tracking-widest text-foreground">Data Unavailable</h3>
                        <p className="text-lg font-bold text-muted-foreground mt-2 mb-8">The requested dispatch plan could not be loaded.</p>
                        <Button variant="outline" size="lg" onClick={onClose} className="font-black uppercase tracking-widest border">
                            Close Window
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* 🚀 SLEEK ENTERPRISE HEADER */}
                        <div className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border/40 p-6 sm:px-10 flex flex-wrap items-center justify-between gap-6 shrink-0 z-20">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20 flex items-center justify-center shrink-0 hidden sm:flex shadow-sm">
                                    <FileText className="w-7 h-7" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-4 mb-2 flex-wrap">
                                        <Badge className="bg-amber-500 text-white hover:bg-amber-600 font-black uppercase tracking-widest text-xs px-3 py-1 shadow-sm">
                                            For Approval
                                        </Badge>
                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                            <span className="relative flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </span>
                                            Est. Dispatch: {plan.estimatedTimeOfDispatch ? new Date(plan.estimatedTimeOfDispatch).toLocaleString() : 'TBD'}
                                        </span>
                                    </div>
                                    <DialogTitle className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-foreground leading-none">
                                        {plan.docNo}
                                    </DialogTitle>
                                </div>
                            </div>

                            <div className="flex items-center gap-8 w-full sm:w-auto mt-4 sm:mt-0">
                                <div className="text-right border-r border-border/50 pr-8 hidden lg:block">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Total Distance</p>
                                    <p className="text-3xl font-black tabular-nums text-foreground leading-none">
                                        {plan.totalDistance ? `${plan.totalDistance} km` : "-"}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={handleExportPDF}
                                    disabled={isExporting}
                                    className="h-14 px-8 text-sm font-black uppercase tracking-widest shadow-sm hover:bg-muted w-full sm:w-auto"
                                >
                                    <Download className="w-5 h-5 mr-3" />
                                    {isExporting ? "Exporting..." : "Export PDF"}
                                </Button>
                            </div>
                        </div>

                        {/* 📜 EXPANDED SCROLLABLE BODY */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 bg-muted/20 relative z-0 custom-scrollbar">
                            {/* 🚀 EXPANDED GRID: Now 4 columns instead of 3. Tables get 75% of the screen width! */}
                            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 lg:gap-10 mx-auto w-full">

                                {/* 🚚 LEFT COLUMN: Route Timeline (Taking 3 columns of space) */}
                                <div className="xl:col-span-3 space-y-8">
                                    <div className="flex items-center justify-between bg-card p-5 px-8 rounded-2xl border border-border/40 shadow-sm">
                                        <h3 className="text-base font-black text-foreground uppercase tracking-widest flex items-center gap-3">
                                            <MapPin className="w-6 h-6 text-primary" />
                                            Route Itinerary & Manifest
                                        </h3>
                                        <Badge variant="secondary" className="font-bold text-xs uppercase px-4 py-1.5 bg-muted border border-border/50">
                                            {plan.stops?.length || 0} Stops
                                        </Badge>
                                    </div>

                                    {/* Timeline Base */}
                                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[2.25rem] before:-translate-x-px before:h-full before:w-[3px] before:bg-border/60 ml-1">

                                        {plan.stops?.map((stop, index) => {
                                            const isDelivery = stop.type === "DELIVERY";
                                            const isPickup = stop.type === "PICKUP";

                                            const sortedItems = [...(stop.items || [])].sort((a, b) => {
                                                const supA = a.supplier || ""; const supB = b.supplier || "";
                                                if (supA !== supB) return supA.localeCompare(supB);
                                                const brA = a.brand || ""; const brB = b.brand || "";
                                                if (brA !== brB) return brA.localeCompare(brB);
                                                const catA = a.category || ""; const catB = b.category || "";
                                                if (catA !== catB) return catA.localeCompare(catB);
                                                const nameA = a.name || ""; const nameB = b.name || "";
                                                if (nameA !== nameB) return nameA.localeCompare(nameB);
                                                const unitA = a.unit || ""; const unitB = b.unit || "";
                                                return unitA.localeCompare(unitB);
                                            });

                                            return (
                                                <div key={index} className="relative flex items-start gap-6 sm:gap-8 group">
                                                    {/* Modern Timeline Node */}
                                                    <div className={cn(
                                                        "flex items-center justify-center w-16 h-16 rounded-2xl border-4 shadow-sm shrink-0 z-10 mt-1 transition-transform group-hover:scale-105",
                                                        isDelivery ? "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-900/40" :
                                                            isPickup ? "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-900/40" :
                                                                "bg-card border-border/50 text-muted-foreground"
                                                    )}>
                                                        {isDelivery ? <Truck className="w-7 h-7" /> : isPickup ? <Package className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                                                    </div>

                                                    {/* Expanded Stop Card */}
                                                    <div className="flex-1 bg-card p-6 sm:p-8 rounded-3xl border border-border/40 shadow-sm group-hover:shadow-md transition-all">

                                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6">
                                                            <div>
                                                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                                                    <Badge className={cn(
                                                                        "font-black uppercase tracking-widest text-xs px-3 py-1",
                                                                        isDelivery ? "bg-blue-500 hover:bg-blue-600 text-white" :
                                                                            isPickup ? "bg-amber-500 hover:bg-amber-600 text-white" :
                                                                                "bg-muted-foreground hover:bg-muted-foreground text-white"
                                                                    )}>
                                                                        {stop.sequence}. {stop.type}
                                                                    </Badge>
                                                                    {stop.documentNo !== "N/A" && (
                                                                        <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-3 py-1 rounded-md border border-border/50">
                                                                            DOC: {stop.documentNo}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="font-black text-2xl sm:text-3xl text-foreground leading-tight uppercase">
                                                                    {stop.name}
                                                                </p>
                                                            </div>
                                                            <div className="text-left sm:text-right shrink-0 bg-muted/20 p-4 rounded-2xl border border-border/40 min-w-[160px]">
                                                                <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest block mb-1">
                                                                    Distance
                                                                </span>
                                                                <span className="text-base font-black tabular-nums text-foreground block mb-3">
                                                                    {stop.distance ? `${stop.distance} km` : "-"}
                                                                </span>
                                                                {stop.documentAmount > 0 && (
                                                                    <>
                                                                        <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest block mb-1 border-t border-border/40 pt-3">
                                                                            Amount
                                                                        </span>
                                                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                                                                            {formatCurrency(stop.documentAmount)}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 📦 Breathable Cargo Manifest Table */}
                                                        {sortedItems.length > 0 && (
                                                            <div className="bg-background rounded-2xl ring-1 ring-inset ring-border/50 overflow-hidden mt-8 overflow-x-auto shadow-sm">
                                                                <div className="flex items-center gap-6 bg-muted/40 px-6 py-4 border-b border-border/50 min-w-[800px]">
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest w-48 shrink-0">Supplier</span>
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex-1">Item Description</span>
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest w-28 text-right shrink-0">Qty</span>
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest w-32 text-right shrink-0">Amount</span>
                                                                </div>
                                                                <ul className="divide-y divide-border/40 text-base min-w-[800px]">
                                                                    {sortedItems.map((item, idx) => (
                                                                        <li key={idx} className="flex items-center py-5 px-6 gap-6 hover:bg-muted/10 transition-colors">
                                                                            <div className="w-48 shrink-0">
                                                                                <span className="text-xs font-black text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 line-clamp-2 leading-tight">
                                                                                    {item.supplier || "—"}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <span className="font-black text-foreground uppercase text-base leading-tight">
                                                                                    {item.name}
                                                                                </span>
                                                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1.5 block">
                                                                                    {(item.brand && item.brand !== "No Brand") ? `${item.brand} • ` : ""} {item.category || "Uncategorized"}
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-28 text-right shrink-0 flex items-baseline justify-end gap-1.5">
                                                                                <span className="font-black text-foreground text-xl tabular-nums">
                                                                                    {item.quantity}
                                                                                </span>
                                                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                                                    {item.unit}
                                                                                </span>
                                                                            </div>
                                                                            <div className="font-black text-lg tabular-nums text-foreground w-32 text-right shrink-0">
                                                                                {formatCurrency(item.amount)}
                                                                            </div>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 💰 RIGHT COLUMN: Ancillary Data (Takes 1 column) */}
                                <div className="xl:col-span-1 space-y-8">

                                    {/* 🚀 Supplier Cargo Summary Card */}
                                    {Object.keys(supplierSummary).length > 0 && (
                                        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/40 shadow-sm">
                                            <h3 className="text-base font-black text-foreground uppercase tracking-widest flex items-center gap-3 mb-6">
                                                <Boxes className="w-6 h-6 text-blue-500" />
                                                Total Cargo
                                            </h3>
                                            <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                                                {Object.entries(supplierSummary).sort(([a], [b]) => a.localeCompare(b)).map(([supplier, units]) => (
                                                    <div key={supplier} className="bg-muted/10 border border-border/40 rounded-2xl overflow-hidden">
                                                        <div className="bg-muted/30 px-4 py-3 border-b border-border/40">
                                                            <span className="text-xs font-black text-foreground uppercase tracking-widest">
                                                                {supplier}
                                                            </span>
                                                        </div>
                                                        <div className="p-4 grid grid-cols-2 gap-3">
                                                            {Object.entries(units).map(([unit, qty]) => (
                                                                <div key={unit} className="flex justify-between items-center bg-background border border-border/30 px-3 py-2 rounded-xl shadow-sm">
                                                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{unit}</span>
                                                                    <span className="text-base font-black text-foreground tabular-nums">{qty}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 🧾 Receipts Summary Card */}
                                    {Object.keys(invoiceSummary).length > 0 && (
                                        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/40 shadow-sm">
                                            <h3 className="text-base font-black text-foreground uppercase tracking-widest flex items-center gap-3 mb-6">
                                                <Receipt className="w-6 h-6 text-indigo-500" />
                                                Receipts Summary
                                            </h3>
                                            <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                                                {Object.entries(invoiceSummary).sort(([a], [b]) => a.localeCompare(b)).map(([customer, invoices]) => (
                                                    <div key={customer} className="bg-muted/10 border border-border/40 rounded-2xl overflow-hidden">
                                                        <div className="bg-muted/30 px-4 py-3 border-b border-border/40">
                                                            <span className="text-xs font-black text-foreground uppercase tracking-widest">
                                                                {customer}
                                                            </span>
                                                        </div>
                                                        <div className="p-4 space-y-3">
                                                            {invoices.map((inv, idx) => (
                                                                <div key={idx} className="flex justify-between items-center bg-background border border-border/30 px-4 py-3 rounded-xl shadow-sm">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-black text-foreground uppercase tracking-widest">{inv.docNo}</span>
                                                                        {inv.date && (
                                                                            <span className="text-xs font-bold text-muted-foreground uppercase mt-1">{inv.date}</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                                                                        {formatCurrency(inv.amount)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Budget Card */}
                                    <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/40 shadow-sm flex flex-col">
                                        <h3 className="text-base font-black text-foreground uppercase tracking-widest flex items-center gap-3 mb-6">
                                            <Wallet className="w-6 h-6 text-emerald-500" />
                                            Trip Budget
                                        </h3>

                                        {plan.budgets && plan.budgets.length > 0 ? (
                                            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                                {plan.budgets.map((b, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-muted/20 p-4 rounded-2xl border border-border/30">
                                                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider truncate pr-4">
                                                            {b.remarks || "General Budget"}
                                                        </span>
                                                        <span className="text-base font-black tabular-nums text-foreground shrink-0">
                                                            {formatCurrency(b.amount)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center py-10 bg-muted/10 rounded-2xl border border-dashed border-border/40">
                                                <Wallet className="w-10 h-10 text-muted-foreground/30 mb-4" />
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Budget Assigned</p>
                                            </div>
                                        )}

                                        <div className="pt-6 mt-6 border-t border-border/40">
                                            <div className="flex justify-between items-end bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/20">
                                                <span className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-500">
                                                    Total Requested
                                                </span>
                                                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                                                    {formatCurrency(totalBudget)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 🛑 HIGH VISIBILITY BLOCKER */}
                                        {!hasValidBudget && (
                                            <div className="mt-6 bg-destructive/10 border border-destructive/30 rounded-2xl p-5 flex gap-4 items-start animate-in zoom-in-95">
                                                <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-black text-destructive uppercase tracking-widest mb-1.5">
                                                        Approval Blocked
                                                    </p>
                                                    <p className="text-xs font-bold text-destructive/80 leading-relaxed uppercase">
                                                        A valid budget allocation is strictly required before dispatch authorization.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Crew Card */}
                                    {plan.staff && plan.staff.length > 0 && (
                                        <div className="bg-card rounded-3xl p-6 sm:p-8 border border-border/40 shadow-sm">
                                            <h3 className="text-base font-black text-foreground uppercase tracking-widest flex items-center gap-3 mb-6">
                                                <Users className="w-6 h-6 text-purple-500" />
                                                Assigned Crew
                                            </h3>
                                            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                                {plan.staff.map((s, i) => (
                                                    <div key={i} className="flex items-center gap-5 bg-muted/20 p-4 rounded-2xl border border-border/30 hover:bg-muted/40 transition-colors">
                                                        <div className="w-12 h-12 rounded-full bg-background shadow-sm border border-border/50 flex items-center justify-center text-lg font-black text-foreground">
                                                            {s.name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-base font-black text-foreground uppercase truncate">{s.name}</p>
                                                            <p className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mt-1">
                                                                {s.role}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 🛑 ENTERPRISE ACTION FOOTER */}
                        <div className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-t border-border/40 p-5 sm:px-10 flex flex-wrap items-center justify-between gap-6 shrink-0 z-20 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.05)]">
                            <div className="hidden md:flex items-center gap-4 bg-amber-500/10 text-amber-600 px-5 py-3 rounded-xl border border-amber-500/20">
                                <AlertTriangle className="w-5 h-5" />
                                <p className="text-xs font-bold uppercase tracking-widest">
                                    Review all logistics data before final approval.
                                </p>
                            </div>

                            <div className="flex gap-4 w-full md:w-auto">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    disabled={isProcessing}
                                    onClick={onClose}
                                    className="flex-1 md:flex-none h-14 px-8 font-black text-sm uppercase tracking-widest border border-border/50 hover:bg-muted"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="lg"
                                    disabled={isProcessing}
                                    onClick={() => onAction(plan.id, "REJECT")}
                                    className="flex-1 md:flex-none h-14 px-10 font-black text-sm uppercase tracking-widest shadow-sm"
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : "Reject"}
                                </Button>

                                <Button
                                    size="lg"
                                    disabled={isProcessing || !hasValidBudget}
                                    onClick={() => onAction(plan.id, "APPROVE")}
                                    className={cn(
                                        "flex-1 md:flex-none h-14 px-12 font-black text-sm uppercase tracking-widest shadow-md transition-all",
                                        !hasValidBudget
                                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-100 border border-border/50"
                                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                                    )}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-5 h-5 animate-spin"/>
                                    ) : (
                                        <><CheckCircle2 className="w-5 h-5 mr-3"/> Approve Plan</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}