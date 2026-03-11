"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, Factory, ChevronRight, Tags, MinusSquare, PlusSquare, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConsolidatorDto, ConsolidatorDetailsDto } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { repickBatch } from "../providers/fetchProvider"; // Ensure this is imported

interface Props {
    batch: ConsolidatorDto;
    onClose: () => void;
    onAuditComplete: () => void;
}

export default function ActiveAuditExecutionModule({ batch, onClose, onAuditComplete }: Props) {
    const [collapsedSuppliers, setCollapsedSuppliers] = useState<Record<string, boolean>>({});

    const totalItems = batch.details?.reduce((sum, d) => sum + (d.orderedQuantity || 0), 0) || 0;
    const totalPicked = batch.details?.reduce((sum, d) => sum + (d.pickedQuantity || 0), 0) || 0;
    const hasDiscrepancy = totalPicked !== totalItems;

    // 🚀 NESTED GROUPING + TOTALS CALCULATION
    const { nestedGroups, supplierTotals } = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, ConsolidatorDetailsDto[]>>> = {};
        const sTotals: Record<string, number> = {};

        batch.details?.forEach(detail => {
            const s = detail.supplierName || "UNASSIGNED";
            const b = detail.brandName || "NO BRAND";
            const c = detail.categoryName || "UNCATEGORIZED";

            if (!groups[s]) groups[s] = {};
            if (!groups[s][b]) groups[s][b] = {};
            if (!groups[s][b][c]) groups[s][b][c] = [];

            groups[s][b][c].push(detail);
            sTotals[s] = (sTotals[s] || 0) + detail.orderedQuantity;
        });
        return { nestedGroups: groups, supplierTotals: sTotals };
    }, [batch.details]);

    // 🚀 REPICK HANDLER
    const handleRepickBatch = async () => {
        if (!window.confirm("Send this batch back to Picking?")) return;

        try {
            const success = await repickBatch(batch.id); // Using the provider function
            if (success) {
                onClose(); // 🚀 This will now trigger the refresh in the Dashboard
            } else {
                alert("Failed to send back to repick.");
            }
        } catch (error) {
            console.error("Repick Error:", error);
        }
    };
    // 🚀 AUDIT HANDLER WITH WARNING
    const handleAuditAttempt = () => {
        if (hasDiscrepancy) {
            const msg = `⚠️ DISCREPANCY DETECTED\n\nScanned: ${totalPicked}\nExpected: ${totalItems}\n\nAre you sure you want to finalize this batch with missing items? This will send it to invoicing as-is.`;
            if (!window.confirm(msg)) return;
        }
        onAuditComplete();
    };

    const toggleSupplier = (s: string) => {
        setCollapsedSuppliers(prev => ({ ...prev, [s]: !prev[s] }));
    };

    const collapseAll = () => {
        const allCollapsed = Object.keys(nestedGroups).reduce((acc, s) => ({ ...acc, [s]: true }), {});
        setCollapsedSuppliers(allCollapsed);
    };

    const expandAll = () => setCollapsedSuppliers({});

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-300 font-sans">

            {/* --- HEADER --- */}
            <header className="shrink-0 bg-card border-b border-border/40 p-4 md:p-6 shadow-sm flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onClose} className="h-16 w-16 rounded-2xl active:scale-95 transition-transform shadow-sm">
                        <ArrowLeft className="h-8 w-8" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">
                            {batch.consolidatorNo}
                        </h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1">
                                Total Units: {totalItems}
                            </Badge>
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1">
                                {batch.branchName}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className={`text-4xl md:text-6xl font-black italic leading-none tracking-tighter ${hasDiscrepancy ? 'text-destructive animate-pulse' : 'text-emerald-500'}`}>
                        {totalPicked}<span className="text-2xl text-muted-foreground/30 not-italic mx-1 font-light">/</span>{totalItems}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={collapseAll} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted">
                            <MinusSquare className="w-3.5 h-3.5 mr-1.5"/> Collapse
                        </Button>
                        <Button variant="ghost" size="sm" onClick={expandAll} className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted">
                            <PlusSquare className="w-3.5 h-3.5 mr-1.5"/> Expand
                        </Button>
                    </div>
                </div>
            </header>

            {/* --- NESTED LIST --- */}
            <div className="flex-1 min-h-0 bg-muted/5 relative">
                <ScrollArea className="h-full w-full">
                    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-8 pb-48">

                        {Object.entries(nestedGroups).map(([supplier, brands]) => {
                            const isCollapsed = collapsedSuppliers[supplier];
                            return (
                                <div key={supplier} className="bg-card/40 border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
                                    <div
                                        onClick={() => toggleSupplier(supplier)}
                                        className="flex items-center justify-between p-6 bg-card cursor-pointer hover:bg-muted/10 transition-colors"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-primary/10 text-primary rounded-2xl shadow-inner">
                                                <Factory className="w-7 h-7"/>
                                            </div>
                                            <div>
                                                <h2 className="font-black uppercase tracking-[0.15em] text-xl leading-none">{supplier}</h2>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-60">Verified Vendor</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge className="h-10 px-5 bg-muted text-foreground border-border/60 font-black italic text-xl">
                                                {supplierTotals[supplier]} <span className="text-[10px] not-italic ml-1.5 opacity-30">QTY</span>
                                            </Badge>
                                            {isCollapsed ? <PlusSquare className="text-muted-foreground/30 w-6 h-6"/> : <MinusSquare className="text-muted-foreground/30 w-6 h-6"/>}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {!isCollapsed && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                className="px-6 pb-8 space-y-12 border-t border-border/40 bg-muted/5"
                                            >
                                                <div className="pl-6 md:pl-12 space-y-12 border-l-4 border-primary/10 ml-8 mt-8">
                                                    {Object.entries(brands).map(([brand, categories]) => {
                                                        const brandTotal = Object.values(categories).flat().reduce((sum, i) => sum + i.orderedQuantity, 0);
                                                        return (
                                                            <div key={brand} className="space-y-6">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <ChevronRight className="w-6 h-6 text-blue-500 stroke-[3]"/>
                                                                        <span className="font-black uppercase tracking-[0.2em] text-sm text-foreground/80">{brand}</span>
                                                                    </div>
                                                                    <div className="h-px flex-1 bg-border/40 mx-4 hidden md:block" />
                                                                    <Badge variant="outline" className="text-[10px] font-black tracking-widest opacity-50 px-3 py-1">
                                                                        {brandTotal} UNITS
                                                                    </Badge>
                                                                </div>

                                                                <div className="space-y-8">
                                                                    {Object.entries(categories).map(([category, items]) => (
                                                                        <div key={category} className="space-y-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <Tags className="w-4 h-4 text-blue-500/40"/>
                                                                                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/70">{category}</span>
                                                                            </div>

                                                                            <div className="grid gap-4">
                                                                                {items.map(detail => {
                                                                                    const isMatch = detail.pickedQuantity === detail.orderedQuantity;
                                                                                    return (
                                                                                        <div key={detail.id} className="bg-card border border-border/60 rounded-[1.5rem] p-6 flex items-center justify-between shadow-sm active:bg-muted/10 transition-all hover:border-primary/20">
                                                                                            <div className="flex items-center gap-6">
                                                                                                <div className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 border-2 ${isMatch ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-destructive/10 border-destructive/20 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
                                                                                                    {isMatch ? <CheckCircle2 className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
                                                                                                </div>
                                                                                                <div>
                                                                                                    <h4 className="font-black text-foreground text-xl leading-none uppercase tracking-tight">{detail.productName}</h4>
                                                                                                    <div className="flex items-center gap-4 mt-3">
                                                                                                        <Badge variant="outline" className="text-[10px] font-black uppercase bg-blue-500/5 text-blue-600 border-blue-500/20 px-3 py-1">
                                                                                                            {detail.unitName || 'PC'}
                                                                                                        </Badge>
                                                                                                        <span className="text-[10px] font-mono text-muted-foreground/40 font-black uppercase tracking-widest">#{detail.productId}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="text-right shrink-0 ml-4">
                                                                                                <div className={`text-4xl font-black italic leading-none tracking-tighter ${isMatch ? 'text-foreground' : 'text-destructive font-black'}`}>
                                                                                                    {detail.pickedQuantity}
                                                                                                    <span className="text-xl text-muted-foreground/20 not-italic mx-1 font-light">/</span>
                                                                                                    <span className="text-muted-foreground/40">{detail.orderedQuantity}</span>
                                                                                                </div>
                                                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-2 block">VERIFIED</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* --- 🚀 ACTION BAR (Repick & Warning-Ready Audit) --- */}
                <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none z-30 flex items-center justify-center px-8">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-2xl pointer-events-auto pb-10 flex gap-5">

                        {/* 🔄 REPICK BUTTON */}
                        <Button
                            onClick={handleRepickBatch}
                            variant="outline"
                            className="flex-1 h-20 rounded-[1.5rem] font-black uppercase italic tracking-tighter text-xl border-2 border-destructive/20 text-destructive hover:bg-destructive/5 active:scale-95 transition-all shadow-xl bg-card"
                        >
                            <RotateCcw className="mr-3 h-7 w-7" />
                            Repick
                        </Button>

                        {/* ✅ FINALIZE BUTTON (Warning Mode) */}
                        <Button
                            onClick={handleAuditAttempt}
                            className={`flex-[2.5] h-20 rounded-[1.5rem] font-black uppercase italic tracking-tighter text-2xl shadow-2xl transition-all flex items-center justify-center gap-3 ${
                                hasDiscrepancy
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            {hasDiscrepancy ? <AlertCircle className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
                            {hasDiscrepancy ? "Audit with Discrepancy" : "Complete Audit"}
                        </Button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}