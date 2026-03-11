"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, Factory, ChevronRight, Tags, MinusSquare, PlusSquare, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConsolidatorDto, ConsolidatorDetailsDto } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { repickBatch } from "../providers/fetchProvider";

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

    const handleRepickBatch = async () => {
        if (!window.confirm("Send this batch back to Picking?")) return;
        try {
            const success = await repickBatch(batch.id);
            if (success) onClose();
        } catch (error) {
            alert("Failed to send back to repick.");
        }
    };

    const handleAuditAttempt = () => {
        if (hasDiscrepancy) {
            const msg = `⚠️ DISCREPANCY DETECTED\n\nScanned: ${totalPicked}\nExpected: ${totalItems}\n\nFinalize anyway?`;
            if (!window.confirm(msg)) return;
        }
        onAuditComplete();
    };

    const toggleSupplier = (s: string) => setCollapsedSuppliers(prev => ({ ...prev, [s]: !prev[s] }));
    const collapseAll = () => setCollapsedSuppliers(Object.keys(nestedGroups).reduce((acc, s) => ({ ...acc, [s]: true }), {}));
    const expandAll = () => setCollapsedSuppliers({});

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in duration-300 font-sans">

            {/* --- HEADER --- */}
            <header className="shrink-0 bg-card border-b border-border/40 p-3 md:p-6 shadow-sm flex items-center justify-between z-20">
                <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                    <Button variant="outline" size="icon" onClick={onClose} className="h-10 w-10 md:h-16 md:w-16 rounded-xl md:rounded-2xl shrink-0">
                        <ArrowLeft className="h-5 w-5 md:h-8 md:w-8" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-lg md:text-4xl font-black uppercase italic tracking-tighter leading-none truncate block">
                            {batch.consolidatorNo}
                        </h1>
                        <div className="flex items-center gap-1 md:gap-2 mt-1">
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[7px] md:text-[9px] font-black uppercase px-2 whitespace-nowrap">
                                Qty: {totalItems}
                            </Badge>
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[7px] md:text-[9px] font-black uppercase px-2 truncate max-w-[100px] md:max-w-none">
                                {batch.branchName}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 md:gap-2 shrink-0 ml-2">
                    <div className={`text-2xl md:text-6xl font-black italic leading-none tracking-tighter ${hasDiscrepancy ? 'text-destructive' : 'text-emerald-500'}`}>
                        {totalPicked}<span className="text-sm md:text-2xl text-muted-foreground/30 mx-0.5 font-light">/</span>{totalItems}
                    </div>
                    <div className="flex gap-1 md:gap-2">
                        <Button variant="ghost" size="sm" onClick={collapseAll} className="h-6 md:h-8 px-2 text-[8px] md:text-[10px] font-black uppercase">
                            <MinusSquare className="w-3 h-3 md:mr-1.5"/> <span className="hidden md:inline">Collapse</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={expandAll} className="h-6 md:h-8 px-2 text-[8px] md:text-[10px] font-black uppercase">
                            <PlusSquare className="w-3 h-3 md:mr-1.5"/> <span className="hidden md:inline">Expand</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* --- LIST --- */}
            <div className="flex-1 min-h-0 bg-muted/5 relative">
                <ScrollArea className="h-full w-full">
                    <div className="max-w-6xl mx-auto p-3 md:p-10 space-y-4 md:space-y-8 pb-48">

                        {Object.entries(nestedGroups).map(([supplier, brands]) => {
                            const isCollapsed = collapsedSuppliers[supplier];
                            return (
                                <div key={supplier} className="bg-card/40 border border-border/40 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-sm">
                                    <div onClick={() => toggleSupplier(supplier)} className="flex items-center justify-between p-4 md:p-6 bg-card cursor-pointer">
                                        <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1">
                                            <div className="p-2 md:p-4 bg-primary/10 text-primary rounded-lg md:rounded-2xl shrink-0">
                                                <Factory className="w-5 h-5 md:w-7 md:h-7"/>
                                            </div>
                                            <h2 className="font-black uppercase tracking-tight md:tracking-[0.15em] text-sm md:text-xl truncate">{supplier}</h2>
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-4">
                                            <Badge className="h-6 md:h-10 px-2 md:px-5 bg-muted text-foreground font-black italic text-xs md:text-xl">
                                                {supplierTotals[supplier]}
                                            </Badge>
                                            {isCollapsed ? <PlusSquare className="w-4 h-4 text-muted-foreground/30"/> : <MinusSquare className="w-4 h-4 text-muted-foreground/30"/>}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {!isCollapsed && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="px-3 md:px-6 pb-4 md:pb-8 space-y-6 md:space-y-12 border-t border-border/40 bg-muted/5">
                                                <div className="pl-3 md:pl-12 space-y-6 md:space-y-12 border-l-2 md:border-l-4 border-primary/10 ml-4 md:ml-8 mt-4 md:mt-8">
                                                    {Object.entries(brands).map(([brand, categories]) => (
                                                        <div key={brand} className="space-y-3 md:space-y-6">
                                                            <div className="flex items-center gap-2">
                                                                <ChevronRight className="w-4 h-4 text-blue-500 stroke-[3]"/>
                                                                <span className="font-black uppercase text-[10px] md:text-sm text-foreground/80">{brand}</span>
                                                            </div>

                                                            {Object.entries(categories).map(([category, items]) => (
                                                                <div key={category} className="space-y-2 md:space-y-4">
                                                                    <div className="flex items-center gap-2 opacity-60">
                                                                        <Tags className="w-3 h-3 text-blue-500/40"/>
                                                                        <span className="text-[8px] md:text-[11px] font-black uppercase truncate">{category}</span>
                                                                    </div>

                                                                    <div className="grid gap-2 md:gap-4">
                                                                        {items.map(detail => {
                                                                            const isMatch = detail.pickedQuantity === detail.orderedQuantity;
                                                                            return (
                                                                                <div key={detail.id} className="bg-card border border-border/60 rounded-xl md:rounded-[1.5rem] p-3 md:p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">

                                                                                    {/* 🚀 FIXED: min-w-0 here is key */}
                                                                                    <div className="flex items-center gap-3 md:gap-6 min-w-0 flex-1">
                                                                                        <div className={`h-10 w-10 md:h-14 md:w-14 rounded-full flex items-center justify-center shrink-0 border-2 ${isMatch ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                                                                                            {isMatch ? <CheckCircle2 className="h-5 w-5 md:h-7 md:w-7" /> : <AlertTriangle className="h-5 w-5 md:h-7 md:w-7" />}
                                                                                        </div>
                                                                                        <div className="min-w-0 flex-1">
                                                                                            {/* 🚀 FIXED: line-clamp-2 allows text to wrap once then truncate */}
                                                                                            <h4 className="font-black text-foreground text-sm md:text-xl leading-none uppercase line-clamp-2 md:line-clamp-1 break-words">
                                                                                                {detail.productName}
                                                                                            </h4>
                                                                                            <div className="flex items-center gap-2 mt-2">
                                                                                                <Badge variant="outline" className="text-[7px] md:text-[10px] font-black bg-blue-500/5 px-1 md:px-3 whitespace-nowrap">
                                                                                                    {detail.unitName || 'PC'}
                                                                                                </Badge>
                                                                                                <span className="text-[7px] md:text-[10px] font-mono text-muted-foreground/40 font-black truncate">#{detail.productId}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex items-center justify-between md:justify-end md:text-right border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
                                                                                        <span className="md:hidden text-[8px] font-black text-muted-foreground/40 uppercase">Verified Qty:</span>
                                                                                        <div className={`text-xl md:text-4xl font-black italic tracking-tighter ${isMatch ? 'text-foreground' : 'text-destructive'}`}>
                                                                                            {detail.pickedQuantity}<span className="text-sm md:text-xl text-muted-foreground/20 mx-1">/</span>{detail.orderedQuantity}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* --- ACTION BAR --- */}
                <div className="absolute bottom-0 left-0 right-0 h-28 md:h-44 bg-gradient-to-t from-background via-background/95 to-transparent z-30 flex items-center justify-center px-4 md:px-8">
                    <motion.div className="w-full max-w-2xl pb-4 md:pb-10 flex gap-2 md:gap-5">
                        <Button onClick={handleRepickBatch} variant="outline" className="flex-1 h-12 md:h-20 rounded-xl md:rounded-[1.5rem] font-black uppercase italic text-xs md:text-xl border-2 border-destructive/20 text-destructive bg-card shadow-xl">
                            <RotateCcw className="mr-1 md:mr-3 h-4 w-4 md:h-7 md:w-7" /> <span className="truncate">Repick</span>
                        </Button>
                        <Button onClick={handleAuditAttempt} className={`flex-[2] h-12 md:h-20 rounded-xl md:rounded-[1.5rem] font-black uppercase italic text-xs md:text-2xl shadow-2xl flex items-center justify-center gap-1 md:gap-3 ${hasDiscrepancy ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-blue-600 text-white'}`}>
                            {hasDiscrepancy ? <AlertCircle className="h-4 w-4 md:h-7 md:w-7" /> : <ShieldCheck className="h-4 w-4 md:h-7 md:w-7" />}
                            <span className="truncate">{hasDiscrepancy ? "Audit Incomplete" : "Complete Audit"}</span>
                        </Button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}