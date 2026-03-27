"use client"

import React, {useState} from "react"
import {
    CheckCircle, XCircle, MapPin, Truck, Package, Users, Wallet,
    FileText, Loader2, Download, AlertTriangle, Box
} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Dialog, DialogContent, DialogTitle, DialogDescription} from "@/components/ui/dialog"
import {cn} from "@/lib/utils"

import {exportDispatchManifestPDF} from "../utils/exportManifest"
import {PostDispatchApprovalDto} from "../types"

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

export function DispatchApprovalModal({isOpen, isLoading, plan, isProcessing, onClose, onAction}: ModalProps) {
    const [isExporting, setIsExporting] = useState(false);

    const totalBudget = plan?.budgets?.reduce((sum, b) => sum + b.amount, 0) || 0;
    const hasValidBudget = plan?.budgets && plan.budgets.length > 0 && totalBudget > 0;

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
                className="max-w-[95vw] lg:max-w-[1100px] h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl duration-200">

                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900">
                        {/* 🚀 FIX: Screen Reader Only Title for Radix UI */}
                        <DialogTitle className="sr-only">Loading Manifest Data</DialogTitle>
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-5"/>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Pulling
                            Manifest Data</h3>
                        <p className="text-xs font-medium text-slate-500 mt-2">Securely fetching cargo details...</p>
                    </div>
                ) : !plan ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-900">
                        {/* 🚀 FIX: Screen Reader Only Title for Radix UI */}
                        <DialogTitle className="sr-only">Data Unavailable</DialogTitle>
                        <AlertTriangle className="w-12 h-12 text-amber-500 mb-5 opacity-80"/>
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Data
                            Unavailable</h3>
                        <p className="text-sm font-medium text-slate-500 mt-2 mb-6">The requested dispatch plan could
                            not be loaded.</p>
                        <Button variant="outline" size="sm" onClick={onClose}
                                className="font-bold uppercase tracking-widest text-xs">Close Window</Button>
                    </div>
                ) : (
                    <>
                        {/* 📌 MODERN HEADER: Sticky with backdrop blur */}
                        <div
                            className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 shrink-0 z-20">
                            <div className="flex items-center gap-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline"
                                               className="bg-amber-50 text-amber-700 border-amber-200 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-full shadow-sm">
                                            For Approval
                                        </Badge>
                                        <DialogDescription
                                            className="text-xs font-bold text-slate-500 flex items-center gap-1.5 m-0">
                                            <span className="relative flex h-2 w-2">
                                              <span
                                                  className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span
                                                  className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            {plan.estimatedTimeOfDispatch ? new Date(plan.estimatedTimeOfDispatch).toLocaleString() : 'TBD'}
                                        </DialogDescription>
                                    </div>
                                    <DialogTitle
                                        className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                                        {plan.docNo}
                                    </DialogTitle>
                                </div>
                            </div>
                            <div className="flex items-center gap-5">
                                <div
                                    className="text-right border-r border-slate-200 dark:border-slate-800 pr-5 hidden sm:block">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total
                                        Distance</p>
                                    <p className="text-lg font-black tabular-nums text-slate-900 dark:text-white leading-none">
                                        {plan.totalDistance} <span
                                        className="text-xs text-slate-400 font-bold">km</span>
                                    </p>
                                </div>
                                <Button variant="secondary" size="sm" onClick={handleExportPDF} disabled={isExporting}
                                        className="h-9 px-4 text-xs font-bold uppercase tracking-widest shadow-sm hover:shadow transition-all">
                                    <Download className="w-3.5 h-3.5 mr-2"/>
                                    {isExporting ? "Exporting..." : "Export PDF"}
                                </Button>
                            </div>
                        </div>

                        {/* 📜 MODERN SCROLLABLE BODY */}
                        <div
                            className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50 relative z-0">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">

                                {/* 🚚 LEFT COLUMN: Route Timeline */}
                                <div className="xl:col-span-2 space-y-5">
                                    <div
                                        className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 px-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-blue-500"/> Itinerary & Cargo Manifest
                                        </h3>
                                        <Badge variant="secondary"
                                               className="font-bold text-[10px] uppercase px-2 rounded-md bg-slate-100 dark:bg-slate-800">
                                            {plan.stops?.length || 0} Stops
                                        </Badge>
                                    </div>

                                    <div
                                        className="space-y-5 relative before:absolute before:inset-0 before:ml-[1.25rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 ml-1">

                                        {plan.stops?.map((stop, index) => (
                                            <div key={index} className="relative flex items-start gap-4 group">
                                                {/* Timeline Node */}
                                                <div className={cn(
                                                    "flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 dark:border-slate-950 shadow-sm shrink-0 z-10 mt-1 transition-transform group-hover:scale-105",
                                                    stop.type === "DELIVERY" ? "bg-blue-100 text-blue-600" :
                                                        stop.type === "PICKUP" ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-600"
                                                )}>
                                                    {stop.type === "DELIVERY" ? <Truck className="w-4 h-4"/> :
                                                        stop.type === "PICKUP" ? <Package className="w-4 h-4"/> :
                                                            <FileText className="w-4 h-4"/>}
                                                </div>

                                                {/* Modern Stop Card */}
                                                <div
                                                    className="flex-1 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start gap-4 mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span
                                                                    className={cn("text-[10px] font-black uppercase tracking-widest",
                                                                        stop.type === "DELIVERY" ? "text-blue-600" :
                                                                            stop.type === "PICKUP" ? "text-amber-600" : "text-slate-500"
                                                                    )}>
                                                                    {stop.sequence}. {stop.type}
                                                                </span>
                                                                {stop.documentNo !== "N/A" && (
                                                                    <span
                                                                        className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                        {stop.documentNo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                                                                {stop.name}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span
                                                                className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-1">
                                                                {stop.distance} km
                                                            </span>
                                                            {stop.documentAmount > 0 && (
                                                                <span
                                                                    className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                    {formatCurrency(stop.documentAmount)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Refined Cargo Table */}
                                                    {stop.items && stop.items.length > 0 && (
                                                        <div
                                                            className="bg-slate-50/50 dark:bg-slate-950/30 rounded-xl p-3 ring-1 ring-inset ring-slate-200/60 dark:ring-slate-800/60 mt-4">
                                                            <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                                                                {stop.items.map((item, idx) => (
                                                                    <li key={idx}
                                                                        className="flex justify-between items-center py-2 first:pt-1 last:pb-1 gap-3 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 px-2 -mx-2 rounded transition-colors">
                                                                        <span
                                                                            className="font-semibold text-slate-700 dark:text-slate-300 flex-1 line-clamp-2">
                                                                            {item.name}
                                                                        </span>
                                                                        <span
                                                                            className="text-slate-500 dark:text-slate-400 w-20 text-right font-medium">
                                                                            {item.quantity} <span
                                                                            className="text-[9px] uppercase tracking-wider">{item.unit}</span>
                                                                        </span>
                                                                        <span
                                                                            className="font-black tabular-nums text-slate-900 dark:text-white w-24 text-right shrink-0">
                                                                            {formatCurrency(item.amount)}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 💰 RIGHT COLUMN: Ancillary Data */}
                                <div className="space-y-5">

                                    {/* Budget Card */}
                                    <div
                                        className="bg-white dark:bg-slate-900 rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
                                        <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
                                            <Wallet className="w-4 h-4 text-emerald-500"/> Trip Budget
                                        </h3>

                                        {plan.budgets && plan.budgets.length > 0 ? (
                                            <div className="space-y-2">
                                                {plan.budgets.map((b, i) => (
                                                    <div key={i}
                                                         className="flex justify-between items-center text-xs p-1">
                                                        <span
                                                            className="font-semibold text-slate-600 dark:text-slate-400 truncate pr-3">{b.remarks}</span>
                                                        <span
                                                            className="font-black tabular-nums text-slate-900 dark:text-white shrink-0">{formatCurrency(b.amount)}</span>
                                                    </div>
                                                ))}
                                                <div
                                                    className="pt-3 mt-3 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between items-end">
                                                    <span
                                                        className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Req.</span>
                                                    <span
                                                        className="text-xl font-black text-emerald-600 dark:text-emerald-500 tabular-nums leading-none">
                                                        {formatCurrency(totalBudget)}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                                                <Wallet className="w-6 h-6 text-slate-300 mb-2"/>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No
                                                    Budget</p>
                                            </div>
                                        )}

                                        {!hasValidBudget && (
                                            <div
                                                className="mt-4 bg-red-50 dark:bg-red-950/30 ring-1 ring-inset ring-red-200/50 rounded-lg p-3 flex gap-2.5">
                                                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5"/>
                                                <p className="text-[10px] font-bold text-red-700 dark:text-red-400 leading-tight">
                                                    Approval is blocked. A valid budget allocation is required before
                                                    dispatch.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Crew Card */}
                                    {plan.staff && plan.staff.length > 0 && (
                                        <div
                                            className="bg-white dark:bg-slate-900 rounded-xl p-5 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm">
                                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4">
                                                <Users className="w-4 h-4 text-purple-500"/> Assigned Crew
                                            </h3>
                                            <div className="space-y-2.5">
                                                {plan.staff.map((s, i) => (
                                                    <div key={i}
                                                         className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-lg ring-1 ring-inset ring-slate-100 dark:ring-slate-800/60">
                                                        <div
                                                            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center text-xs font-black text-slate-500">
                                                            {s.name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 leading-none mt-1">{s.role}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                                Review all logistics data before approval.
                            </p>
                            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                                <Button variant="ghost" size="sm" disabled={isProcessing} onClick={onClose}
                                        className="flex-1 sm:flex-none h-10 px-4 font-bold text-xs uppercase tracking-widest hover:bg-slate-100">
                                    Cancel
                                </Button>
                                <Button variant="destructive" size="sm" disabled={isProcessing}
                                        onClick={() => onAction(plan.id, "REJECT")}
                                        className="flex-1 sm:flex-none h-10 px-6 font-black text-xs uppercase tracking-widest shadow-sm">
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : "Reject"}
                                </Button>
                                <Button size="sm" disabled={isProcessing || !hasValidBudget}
                                        onClick={() => onAction(plan.id, "APPROVE")}
                                        className="flex-1 sm:flex-none h-10 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-sm disabled:opacity-50 transition-colors">
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : "Approve Plan"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}