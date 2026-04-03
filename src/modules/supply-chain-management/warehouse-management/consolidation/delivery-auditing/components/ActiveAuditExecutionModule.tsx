"use client";

import React, { useMemo, useState } from "react";
import {
    ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, Factory,
    ChevronRight, Tags, MinusSquare, PlusSquare, RotateCcw,
    AlertCircle, FileSignature
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConsolidatorDto, ConsolidatorDetailsDto } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import { repickBatch } from "../providers/fetchProvider";
import { cn } from "@/lib/utils";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

// ============================================================================
// 1. MAIN WRAPPER COMPONENT
// ============================================================================

interface Props {
    batch: ConsolidatorDto;
    onClose: () => void;
    onAuditComplete: () => void;
}

export default function ActiveAuditExecutionModule({ batch, onClose, onAuditComplete }: Props) {
    const [collapsedSuppliers, setCollapsedSuppliers] = useState<Record<string, boolean>>({});
    const [showErrorsOnly, setShowErrorsOnly] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    const { nestedGroups, supplierStats, discrepancyCount, totalItems } = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, ConsolidatorDetailsDto[]>>> = {};
        const stats: Record<string, { total: number; errors: number }> = {};
        let dCount = 0;
        let tItems = 0;

        batch.details?.forEach(detail => {
            const picked = detail.pickedQuantity || 0;
            const ordered = detail.orderedQuantity || 0;
            const isMatch = picked === ordered;

            tItems++;
            if (!isMatch) dCount++;
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
        return { nestedGroups: groups, supplierStats: stats, discrepancyCount: dCount, totalItems: tItems };
    }, [batch.details, showErrorsOnly]);

    const hasDiscrepancy = discrepancyCount > 0;
    const isFilteredEmpty = Object.keys(nestedGroups).length === 0;

    const handleRepickBatch = async () => {
        if (!window.confirm(`⚠️ WARNING: SEND TO REPICK?\n\nThis will return the batch to the floor.\nDiscrepancies found: ${discrepancyCount}`)) return;
        try {
            const success = await repickBatch(batch.id);
            if (success) onClose();
        } catch (_error) {
            alert("Failed to send back to repick.");
        }
    };

    const toggleSupplier = (s: string) => setCollapsedSuppliers(prev => ({ ...prev, [s]: !prev[s] }));
    const collapseAll = () => setCollapsedSuppliers(Object.keys(nestedGroups).reduce((acc, s) => ({ ...acc, [s]: true }), {}));
    const expandAll = () => setCollapsedSuppliers({});

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.98] duration-300 font-sans">

            <AuditHeader
                batch={batch}
                hasDiscrepancy={hasDiscrepancy}
                discrepancyCount={discrepancyCount}
                onClose={onClose}
                onCollapseAll={collapseAll}
                onExpandAll={expandAll}
            />

            <AuditFilters
                showErrorsOnly={showErrorsOnly}
                setShowErrorsOnly={setShowErrorsOnly}
                totalItems={totalItems}
                discrepancyCount={discrepancyCount}
            />

            {/* 🚀 NATIVE SCROLL CONTAINER (Fixes Flexbox scroll bugs) */}
            <div className="flex-1 min-h-0 bg-muted/10 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                    {isFilteredEmpty && showErrorsOnly ? (
                        <AuditEmptyState />
                    ) : (
                        Object.entries(nestedGroups).map(([supplier, brands]) => (
                            <SupplierGroup
                                key={supplier}
                                supplier={supplier}
                                brands={brands}
                                stats={supplierStats[supplier]}
                                isCollapsed={collapsedSuppliers[supplier]}
                                showErrorsOnly={showErrorsOnly}
                                onToggle={() => toggleSupplier(supplier)}
                            />
                        ))
                    )}
                </div>
            </div>

            <AuditFooter
                hasDiscrepancy={hasDiscrepancy}
                onRepick={handleRepickBatch}
                onAuditAttempt={() => setIsConfirming(true)}
            />

            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                <AlertDialogContent className="sm:max-w-lg rounded-[2rem]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black uppercase italic">
                            {hasDiscrepancy ? "Force Complete Audit?" : "Finalize Audit?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base font-bold">
                            {hasDiscrepancy
                                ? `There are ${discrepancyCount} unresolved error(s). Are you sure you want to force complete this audit?`
                                : "This will finalize the audit and mark it as complete. Are you sure?"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="h-12 rounded-xl font-bold uppercase">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onAuditComplete} className="h-12 rounded-xl font-black uppercase bg-primary">
                            {hasDiscrepancy ? "Force Complete" : "Confirm & Finalize"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ============================================================================
// 2. SUB-COMPONENTS
// ============================================================================

interface AuditHeaderProps {
    batch: ConsolidatorDto;
    hasDiscrepancy: boolean;
    discrepancyCount: number;
    onClose: () => void;
    onCollapseAll: () => void;
    onExpandAll: () => void;
}

function AuditHeader({ batch, hasDiscrepancy, discrepancyCount, onClose, onCollapseAll, onExpandAll }: AuditHeaderProps) {
    return (
        <header className="shrink-0 bg-card/95 backdrop-blur-md border-b border-border/50 p-4 md:px-8 md:py-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between z-20 gap-4">
            <div className="flex items-center gap-4 min-w-0">
                <Button variant="secondary" size="icon" onClick={onClose}
                        className="h-14 w-14 md:h-16 md:w-16 rounded-2xl border border-border/50 shrink-0 hover:bg-muted active:scale-95 transition-transform shadow-sm">
                    <ArrowLeft className="h-7 w-7 md:h-8 md:w-8" />
                </Button>
                <div className="min-w-0">
                    <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-none truncate text-foreground">
                        {batch.consolidatorNo}
                    </h1>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] md:text-xs font-black uppercase px-3 py-1 bg-muted/50 border-border/60">
                            {batch.branchName}
                        </Badge>
                        <Badge className={cn("text-[10px] md:text-xs font-black uppercase px-3 py-1 shadow-sm",
                            hasDiscrepancy ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                        )}>
                            {hasDiscrepancy ? `⚠️ ${discrepancyCount} Discrepancies` : "✅ 100% Match"}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 bg-muted/30 p-1.5 rounded-xl border border-border/40">
                <Button variant="ghost" onClick={onCollapseAll} className="h-10 px-4 font-black uppercase tracking-widest text-xs text-muted-foreground hover:text-foreground">
                    <MinusSquare className="w-4 h-4 mr-2" /> Collapse
                </Button>
                <div className="w-[1px] h-6 bg-border/50" />
                <Button variant="ghost" onClick={onExpandAll} className="h-10 px-4 font-black uppercase tracking-widest text-xs text-muted-foreground hover:text-foreground">
                    <PlusSquare className="w-4 h-4 mr-2" /> Expand
                </Button>
            </div>
        </header>
    );
}

interface AuditFiltersProps {
    showErrorsOnly: boolean;
    setShowErrorsOnly: (val: boolean) => void;
    totalItems: number;
    discrepancyCount: number;
}

function AuditFilters({ showErrorsOnly, setShowErrorsOnly, totalItems, discrepancyCount }: AuditFiltersProps) {
    return (
        <div className="shrink-0 bg-card border-b border-border/40 p-4 md:px-8 z-10 flex gap-4 shadow-[0_4px_20px_-15px_rgba(0,0,0,0.1)]">
            <Button
                onClick={() => setShowErrorsOnly(false)}
                variant={!showErrorsOnly ? "default" : "outline"}
                className={cn(
                    "flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm transition-all",
                    !showErrorsOnly ? "bg-primary shadow-lg shadow-primary/20" : "bg-card text-muted-foreground border-border/50 hover:bg-muted"
                )}
            >
                All Scanned Items
                <Badge variant="secondary" className={cn("ml-3 px-2 py-0.5", !showErrorsOnly ? "bg-background/20 text-current" : "bg-muted text-muted-foreground")}>
                    {totalItems}
                </Badge>
            </Button>
            <Button
                onClick={() => setShowErrorsOnly(true)}
                variant={showErrorsOnly ? "destructive" : "outline"}
                className={cn(
                    "flex-1 h-14 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm transition-all",
                    showErrorsOnly ? "bg-red-600 shadow-lg shadow-red-600/20" : "bg-card text-muted-foreground border-border/50 hover:bg-muted hover:text-red-500"
                )}
            >
                Discrepancies Only
                <Badge variant="secondary" className={cn("ml-3 px-2 py-0.5", showErrorsOnly ? "bg-white/20 text-white" : "bg-red-500/10 text-red-500")}>
                    {discrepancyCount}
                </Badge>
            </Button>
        </div>
    );
}

interface SupplierGroupProps {
    supplier: string;
    brands: Record<string, Record<string, ConsolidatorDetailsDto[]>>;
    stats: { total: number; errors: number };
    isCollapsed: boolean;
    showErrorsOnly: boolean;
    onToggle: () => void;
}

function SupplierGroup({ supplier, brands, stats, isCollapsed, showErrorsOnly, onToggle }: SupplierGroupProps) {
    const hasSupplierErrors = stats.errors > 0;

    return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div
                onClick={onToggle}
                className={cn(
                    "sticky top-0 z-10 flex items-center justify-between p-5 md:p-6 cursor-pointer border-b transition-colors",
                    hasSupplierErrors && showErrorsOnly ? "bg-red-500/5 border-red-500/20" : "bg-card/95 backdrop-blur-xl border-border/40 hover:bg-muted/40"
                )}
            >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn("p-3 rounded-xl shrink-0 shadow-sm", hasSupplierErrors ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary")}>
                        <Factory className="w-6 h-6 stroke-[2px]" />
                    </div>
                    <h2 className="font-black uppercase tracking-widest text-lg md:text-xl truncate text-foreground">{supplier}</h2>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                    {hasSupplierErrors && (
                        <Badge className="h-8 px-3 bg-red-600 text-white font-black uppercase tracking-widest animate-pulse border-none shadow-md shadow-red-600/20 hidden sm:flex">
                            {stats.errors} Error{stats.errors > 1 ? 's' : ''}
                        </Badge>
                    )}
                    <Badge variant="outline" className="h-8 px-3 font-black text-sm border-border/50 bg-muted/30">
                        {stats.total} Total
                    </Badge>
                </div>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="bg-muted/5">
                        <div className="p-4 md:p-8 space-y-8">
                            {Object.entries(brands).map(([brand, categories]) => (
                                <div key={brand} className="space-y-5">
                                    <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border border-border/40">
                                        <ChevronRight className="w-5 h-5 text-primary shrink-0 stroke-[3px]" />
                                        <span className="font-black uppercase tracking-widest text-sm text-foreground">{brand}</span>
                                    </div>
                                    <div className="pl-4 md:pl-8 space-y-8 border-l-[3px] border-border/30 ml-4">
                                        {Object.entries(categories).map(([category, items]) => (
                                            <div key={category} className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Tags className="w-4 h-4 text-muted-foreground/50" />
                                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">{category}</span>
                                                </div>
                                                <div className="grid gap-4">
                                                    {items.map(detail => <AuditItemCard key={detail.id} detail={detail} />)}
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
}

function AuditItemCard({ detail }: { detail: ConsolidatorDetailsDto }) {
    const picked = detail.pickedQuantity || 0;
    const ordered = detail.orderedQuantity || 0;
    const isMatch = picked === ordered;
    const diff = picked - ordered;
    const isShort = diff < 0;

    // Status styles
    const statusColor = isMatch ? "emerald" : isShort ? "red" : "amber";
    const diffLabel = isMatch ? "MATCH" : isShort ? `${Math.abs(diff)} SHORT` : `${diff} OVER`;
    const Icon = isMatch ? CheckCircle2 : AlertTriangle;

    return (
        <div className={cn(
            "bg-card border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-6 transition-all hover:shadow-md",
            isMatch ? "border-border/50" : `border-${statusColor}-500/40 bg-${statusColor}-500/5`
        )}>
            <div className="flex items-start gap-5 min-w-0 flex-1">
                <div className={cn(
                    `h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner`,
                    `bg-${statusColor}-500/10 border-${statusColor}-500/20 text-${statusColor}-600`
                )}>
                    <Icon className="h-7 w-7 stroke-[2.5px]" />
                </div>
                <div className="min-w-0 flex-1 pt-1">
                    <h4 className="font-black text-foreground text-base md:text-xl leading-tight uppercase line-clamp-2">
                        {detail.productName}
                    </h4>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="outline" className="text-[10px] md:text-xs font-black bg-background px-3 py-1 border-border/50">
                            {detail.unitName || 'PC'}
                        </Badge>
                        <span className="text-[10px] md:text-xs font-mono text-muted-foreground font-bold truncate bg-muted/50 px-3 py-1 rounded-md border border-border/40">
                            {detail.barcode ? `BC: ${detail.barcode}` : `ID: ${detail.productId}`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-8 border-t border-border/40 md:border-t-0 pt-4 md:pt-0 shrink-0">
                <div className={cn(
                    `h-12 px-5 rounded-xl flex items-center justify-center text-xs font-black uppercase tracking-widest`,
                    isMatch ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : `bg-${statusColor}-600 text-white shadow-md shadow-${statusColor}-600/20`
                )}>
                    {diffLabel}
                </div>

                <div className="text-right">
                    <span className="block text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">Pick / Req</span>
                    <div className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none">
                        <span className={cn(isMatch ? "text-foreground" : `text-${statusColor}-600`)}>{picked}</span>
                        <span className="text-muted-foreground/30 mx-1.5">/</span>
                        <span className="text-muted-foreground">{ordered}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AuditEmptyState() {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-3xl border border-dashed border-emerald-500/30">
            <div className="h-28 w-28 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="h-14 w-14 text-emerald-500" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic text-emerald-600">Audit Clear</h2>
            <p className="text-muted-foreground font-bold mt-2 text-base">No discrepancies found in this batch.</p>
        </motion.div>
    );
}

interface AuditFooterProps {
    hasDiscrepancy: boolean;
    onRepick: () => void;
    onAuditAttempt: () => void;
}

function AuditFooter({ hasDiscrepancy, onRepick, onAuditAttempt }: AuditFooterProps) {
    return (
        <div className="shrink-0 bg-card/95 backdrop-blur-md border-t border-border/50 z-20 flex items-center justify-center p-4 md:p-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <div className="w-full max-w-[1400px] flex flex-col sm:flex-row gap-4">
                <Button
                    onClick={onRepick}
                    variant="outline"
                    className={cn(
                        "flex-1 h-16 md:h-20 rounded-2xl font-black uppercase tracking-widest text-sm border-2 transition-all active:scale-[0.98]",
                        hasDiscrepancy ? "border-red-600/30 text-red-600 bg-red-600/5 hover:bg-red-600/10" : "border-border/50 bg-card hover:bg-muted"
                    )}
                >
                    <RotateCcw className="mr-3 h-6 w-6 stroke-[2.5px]" />
                    Send to Repick
                </Button>
                <Button
                    onClick={onAuditAttempt}
                    className={cn(
                        "flex-[2] h-16 md:h-20 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-[0.98]",
                        hasDiscrepancy
                            ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                    )}
                >
                    {hasDiscrepancy ? (
                        <><AlertCircle className="mr-3 h-6 w-6 stroke-[2.5px]" /> Force Complete (Errors)</>
                    ) : (
                        <><FileSignature className="mr-3 h-6 w-6 stroke-[2.5px]" /> Sign & Finalize Audit</>
                    )}
                </Button>
            </div>
        </div>
    );
}