"use client";

import React, { useMemo, useState } from "react";
import {
    ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, Factory,
    ChevronRight, Tags, MinusSquare, PlusSquare, RotateCcw,
    AlertCircle, PackageCheck, FileSignature
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConsolidatorDto, ConsolidatorDetailsDto } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { repickBatch } from "../providers/fetchProvider";
import { cn } from "@/lib/utils";

interface Props {
    batch: ConsolidatorDto;
    onClose: () => void;
    onAuditComplete: () => void;
}

export default function ActiveAuditExecutionModule({ batch, onClose, onAuditComplete }: Props) {
    const [collapsedSuppliers, setCollapsedSuppliers] = useState<Record<string, boolean>>({});
    const [showErrorsOnly, setShowErrorsOnly] = useState(false);

    const totalItems = batch.details?.reduce((sum, d) => sum + (d.orderedQuantity || 0), 0) || 0;
    const totalPicked = batch.details?.reduce((sum, d) => sum + (d.pickedQuantity || 0), 0) || 0;

    const { nestedGroups, supplierStats, discrepancyCount } = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, ConsolidatorDetailsDto[]>>> = {};
        const stats: Record<string, { total: number; errors: number }> = {};
        let dCount = 0;

        batch.details?.forEach(detail => {
            const picked = detail.pickedQuantity || 0;
            const ordered = detail.orderedQuantity || 0;
            const isMatch = picked === ordered;

            if (!isMatch) dCount++;

            // FILTER LOGIC
            if (showErrorsOnly && isMatch) return;

            const s = detail.supplierName || "UNASSIGNED";
            const b = detail.brandName || "NO BRAND";
            const c = detail.categoryName || "UNCATEGORIZED";

            if (!groups[s]) groups[s] = {};
            if (!groups[s][b]) groups[s][b] = {};
            if (!groups[s][b][c]) groups[s][b][c] = [];

            groups[s][b][c].push(detail);

            if (!stats[s]) stats[s] = { total: 0, errors: 0 };
            stats[s].total += ordered;
            if (!isMatch) stats[s].errors++;
        });
        return { nestedGroups: groups, supplierStats: stats, discrepancyCount: dCount };
    }, [batch.details, showErrorsOnly]);

    const hasDiscrepancy = discrepancyCount > 0;
    const isFilteredEmpty = Object.keys(nestedGroups).length === 0;

    const handleRepickBatch = async () => {
        if (!window.confirm(`⚠️ WARNING: SEND TO REPICK?\n\nThis will return the batch to the floor.\nDiscrepancies found: ${discrepancyCount}`)) return;
        try {
            const success = await repickBatch(batch.id);
            if (success) onClose();
        } catch (error) {
            alert("Failed to send back to repick.");
        }
    };

    const handleAuditAttempt = () => {
        if (hasDiscrepancy) {
            const msg = `🛑 DISCREPANCIES DETECTED\n\nThere are ${discrepancyCount} unresolved error(s).\nAre you sure you want to FORCE FINISH this audit?`;
            if (!window.confirm(msg)) return;
        }
        onAuditComplete();
    };

    const toggleSupplier = (s: string) => setCollapsedSuppliers(prev => ({ ...prev, [s]: !prev[s] }));
    const collapseAll = () => setCollapsedSuppliers(Object.keys(nestedGroups).reduce((acc, s) => ({ ...acc, [s]: true }), {}));
    const expandAll = () => setCollapsedSuppliers({});

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 font-sans">

            {/* --- INDUSTRIAL HEADER --- */}
            <header className="shrink-0 bg-card border-b-4 border-border/60 p-4 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between z-20 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <Button variant="secondary" size="icon" onClick={onClose} className="h-14 w-14 md:h-16 md:w-16 rounded-xl border-2 border-border/50 shrink-0 hover:bg-muted active:scale-95 transition-transform">
                        <ArrowLeft className="h-7 w-7 md:h-8 md:w-8" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none truncate block text-foreground">
                            {batch.consolidatorNo}
                        </h1>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] md:text-xs font-black uppercase px-2.5 py-0.5 bg-muted/50 border-2">
                                {batch.branchName}
                            </Badge>
                            <Badge className={cn("text-[10px] md:text-xs font-black uppercase px-2.5 py-0.5 border-2",
                                hasDiscrepancy ? "bg-red-500/10 text-red-600 border-red-500/30" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            )}>
                                {hasDiscrepancy ? `⚠️ ${discrepancyCount} Errors` : "✅ 100% Match"}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-muted/40 p-1.5 rounded-xl border-2 border-border/50">
                    <Button variant="ghost" onClick={collapseAll} className="h-10 md:h-12 px-4 font-black uppercase tracking-widest text-xs md:text-sm text-muted-foreground hover:text-foreground">
                        <MinusSquare className="w-4 h-4 mr-2"/> Collapse
                    </Button>
                    <div className="w-[2px] h-6 bg-border/50" />
                    <Button variant="ghost" onClick={expandAll} className="h-10 md:h-12 px-4 font-black uppercase tracking-widest text-xs md:text-sm text-muted-foreground hover:text-foreground">
                        <PlusSquare className="w-4 h-4 mr-2"/> Expand
                    </Button>
                </div>
            </header>

            {/* --- MASSIVE TOGGLE TABS FOR FIELD USE --- */}
            <div className="shrink-0 bg-card border-b-2 border-border/40 p-2 md:p-3 z-10 flex gap-2">
                <Button
                    onClick={() => setShowErrorsOnly(false)}
                    variant={!showErrorsOnly ? "default" : "ghost"}
                    className={cn(
                        "flex-1 h-12 md:h-14 rounded-lg font-black uppercase tracking-widest text-xs md:text-sm transition-all border-2",
                        !showErrorsOnly ? "bg-primary text-primary-foreground border-primary shadow-md" : "border-transparent text-muted-foreground hover:bg-muted/50"
                    )}
                >
                    All Items <Badge variant="secondary" className="ml-2 bg-background/20 text-current">{batch.details?.length || 0}</Badge>
                </Button>
                <Button
                    onClick={() => setShowErrorsOnly(true)}
                    variant={showErrorsOnly ? "destructive" : "ghost"}
                    className={cn(
                        "flex-1 h-12 md:h-14 rounded-lg font-black uppercase tracking-widest text-xs md:text-sm transition-all border-2",
                        showErrorsOnly ? "bg-red-600 text-white border-red-700 shadow-md shadow-red-600/20" : "border-transparent text-muted-foreground hover:bg-muted/50"
                    )}
                >
                    Discrepancies <Badge variant="secondary" className={cn("ml-2", showErrorsOnly ? "bg-white/20 text-white" : "bg-red-500/10 text-red-500")}>{discrepancyCount}</Badge>
                </Button>
            </div>

            {/* --- AUDIT LIST --- */}
            <div className="flex-1 min-h-0 bg-muted/20 relative">
                <ScrollArea className="h-full w-full">
                    <div className="max-w-7xl mx-auto p-2 md:p-6 space-y-4 md:space-y-6 pb-48">

                        {isFilteredEmpty && showErrorsOnly ? (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-2xl border-2 border-dashed border-emerald-500/30 m-4">
                                <div className="h-24 w-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                                    <ShieldCheck className="h-12 w-12 text-emerald-500" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-emerald-600">Audit Clear</h2>
                                <p className="text-muted-foreground font-bold mt-2 max-w-sm">No discrepancies found in this batch.</p>
                            </motion.div>
                        ) : (
                            Object.entries(nestedGroups).map(([supplier, brands]) => {
                                const isCollapsed = collapsedSuppliers[supplier];
                                const stats = supplierStats[supplier];
                                const hasSupplierErrors = stats.errors > 0;

                                return (
                                    <div key={supplier} className="bg-card border-2 border-border/50 rounded-xl overflow-hidden shadow-sm mb-4">
                                        {/* 🚀 STICKY SUPPLIER HEADER */}
                                        <div
                                            onClick={() => toggleSupplier(supplier)}
                                            className={cn(
                                                "sticky top-0 z-10 flex items-center justify-between p-4 md:p-5 cursor-pointer border-b-2 transition-colors",
                                                hasSupplierErrors && showErrorsOnly ? "bg-red-500/5 border-red-500/20" : "bg-card/95 backdrop-blur-md border-border/40 hover:bg-muted/40"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={cn("p-2.5 rounded-lg shrink-0", hasSupplierErrors ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary")}>
                                                    <Factory className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5px]"/>
                                                </div>
                                                <h2 className="font-black uppercase tracking-widest text-base md:text-xl truncate text-foreground">{supplier}</h2>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                {hasSupplierErrors && (
                                                    <Badge className="h-8 px-3 bg-red-600 text-white font-black uppercase tracking-widest animate-pulse border-none shadow-md shadow-red-600/20">
                                                        {stats.errors} Error{stats.errors > 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="h-8 px-3 font-black text-sm border-2">
                                                    {stats.total}
                                                </Badge>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {!isCollapsed && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="bg-muted/5">
                                                    <div className="p-3 md:p-6 space-y-8">
                                                        {Object.entries(brands).map(([brand, categories]) => (
                                                            <div key={brand} className="space-y-4">
                                                                <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border border-border/50">
                                                                    <ChevronRight className="w-5 h-5 text-primary shrink-0 stroke-[3px]"/>
                                                                    <span className="font-black uppercase tracking-widest text-xs md:text-sm text-foreground">{brand}</span>
                                                                </div>

                                                                <div className="pl-2 md:pl-6 space-y-6 md:space-y-8 border-l-4 border-border/40 ml-4">
                                                                    {Object.entries(categories).map(([category, items]) => (
                                                                        <div key={category} className="space-y-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <Tags className="w-4 h-4 text-muted-foreground/40"/>
                                                                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground/70">{category}</span>
                                                                            </div>

                                                                            <div className="grid gap-3">
                                                                                {items.map(detail => {
                                                                                    const picked = detail.pickedQuantity || 0;
                                                                                    const ordered = detail.orderedQuantity || 0;
                                                                                    const isMatch = picked === ordered;
                                                                                    const diff = picked - ordered;

                                                                                    const isShort = diff < 0;
                                                                                    const diffLabel = isMatch ? "MATCH" : isShort ? `${Math.abs(diff)} SHORT` : `${diff} OVER`;

                                                                                    return (
                                                                                        <div key={detail.id} className={cn(
                                                                                            "bg-card border-2 rounded-xl p-3 md:p-5 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4 transition-colors",
                                                                                            isMatch ? "border-border/60" : isShort ? "border-red-500/50 bg-red-500/5" : "border-amber-500/50 bg-amber-500/5"
                                                                                        )}>

                                                                                            <div className="flex items-start md:items-center gap-4 min-w-0 flex-1">
                                                                                                <div className={cn(
                                                                                                    "h-12 w-12 md:h-14 md:w-14 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-inner",
                                                                                                    isMatch ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" :
                                                                                                        isShort ? "bg-red-500/10 border-red-500/20 text-red-600" :
                                                                                                            "bg-amber-500/10 border-amber-500/20 text-amber-600"
                                                                                                )}>
                                                                                                    {isMatch ? <CheckCircle2 className="h-6 w-6 stroke-[3px]"/> : <AlertTriangle className="h-6 w-6 stroke-[2.5px]"/>}
                                                                                                </div>
                                                                                                <div className="min-w-0 flex-1">
                                                                                                    <h4 className="font-black text-foreground text-sm md:text-lg leading-tight uppercase line-clamp-2">
                                                                                                        {detail.productName}
                                                                                                    </h4>
                                                                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                                                        <Badge variant="outline" className="text-[9px] md:text-[10px] font-black bg-background px-2 py-0.5 border-2">
                                                                                                            {detail.unitName || 'PC'}
                                                                                                        </Badge>
                                                                                                        <span className="text-[10px] md:text-xs font-mono text-muted-foreground/80 font-bold truncate bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                                                                                                            {detail.barcode ? `BC: ${detail.barcode}` : `ID: ${detail.productId}`}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="flex items-center justify-between md:justify-end gap-6 border-t-2 border-border/40 md:border-t-0 pt-3 md:pt-0 shrink-0">
                                                                                                {/* 🚀 INDUSTRIAL BADGE (Fat Finger Target Area) */}
                                                                                                <div className={cn(
                                                                                                    "h-10 md:h-12 px-4 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-black uppercase tracking-widest border-2",
                                                                                                    isMatch ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
                                                                                                        isShort ? "bg-red-600 text-white border-red-700 shadow-md shadow-red-600/20" :
                                                                                                            "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20"
                                                                                                )}>
                                                                                                    {diffLabel}
                                                                                                </div>

                                                                                                <div className="text-right">
                                                                                                    <span className="block text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest mb-0.5">Pick / Req</span>
                                                                                                    <div className="text-2xl md:text-3xl font-black italic tracking-tighter leading-none">
                                                                                                        <span className={isMatch ? "text-foreground" : isShort ? "text-red-600" : "text-amber-600"}>{picked}</span>
                                                                                                        <span className="text-muted-foreground/30 mx-1">/</span>
                                                                                                        <span className="text-muted-foreground">{ordered}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>

                {/* --- CHUNKY INDUSTRIAL ACTION BAR --- */}
                <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-t from-background via-background/95 to-transparent z-30 flex items-end justify-center px-4 md:px-8 pb-6 md:pb-8 pointer-events-none">
                    <motion.div className="w-full max-w-4xl flex flex-col sm:flex-row gap-3 md:gap-4 pointer-events-auto">
                        <Button
                            onClick={handleRepickBatch}
                            variant="outline"
                            className={cn(
                                "flex-1 h-16 md:h-20 rounded-xl font-black uppercase tracking-widest text-xs md:text-base border-2 shadow-xl transition-all active:scale-[0.98]",
                                hasDiscrepancy ? "border-red-600/40 text-red-600 bg-red-600/5 hover:bg-red-600/10" : "border-border/60 bg-card hover:bg-muted"
                            )}
                        >
                            <RotateCcw className="mr-2 h-5 w-5 md:h-6 md:w-6 stroke-[3px]" />
                            Send to Repick
                        </Button>
                        <Button
                            onClick={handleAuditAttempt}
                            className={cn(
                                "flex-[1.5] h-16 md:h-20 rounded-xl font-black uppercase tracking-widest text-xs md:text-base shadow-2xl transition-all border-2 border-transparent active:scale-[0.98]",
                                hasDiscrepancy
                                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                            )}
                        >
                            {hasDiscrepancy ? (
                                <><AlertCircle className="mr-2 h-5 w-5 md:h-6 md:w-6 stroke-[3px]" /> Force Complete (Errors)</>
                            ) : (
                                <><FileSignature className="mr-2 h-5 w-5 md:h-6 md:w-6 stroke-[3px]" /> Sign & Finalize Audit</>
                            )}
                        </Button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}