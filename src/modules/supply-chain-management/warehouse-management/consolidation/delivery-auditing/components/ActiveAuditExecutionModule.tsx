"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2, AlertCircle, XCircle,
    ArrowLeft, ChevronRight, PackageCheck,
    Zap, ClipboardCheck, Info, Loader2, RefreshCcw, Search, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { soundFX } from "../../../active-picking/utils/audioProvider";

import { ConsolidatorDto, ConsolidatorDetailsDto } from "../types";
import { lookupRfidTag, transmitAuditLog, repickBatch } from "../providers/fetchProvider";

interface UserInfo {
    user_id: number;
    user_fname: string;
    user_lname: string;
}

interface ActiveAuditExecutionModuleProps {
    batch: ConsolidatorDto;
    onClose: () => void;
    onAuditComplete: () => Promise<void>;
}

export default function ActiveAuditExecutionModule({ batch, onClose, onAuditComplete }: ActiveAuditExecutionModuleProps) {
    const localDetails = useMemo(() => batch.details || [], [batch.details]);
    const [auditStatus, setAuditStatus] = useState<Record<number, boolean>>({});

    // Hardware Scanner State
    const [scannerQuery, setScannerQuery] = useState("");
    // Visual UI Filter State
    const [filterQuery, setFilterQuery] = useState("");

    const [scannedTags, setScannedTags] = useState<Set<string>>(new Set());

    // Performance optimized refs for scanner logic
    const bufferRef = React.useRef("");
    const scanTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const scanningRef = React.useRef(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRepicking, setIsRepicking] = useState(false);

    // Mocking current user (Replace with auth context in production)
    const currentUser: UserInfo = { user_id: 1, user_fname: "Admin", user_lname: "Global" };

    // 1. Filter Logic: Search by Supplier, Brand, Category, or Product Name
    const filteredDetails = useMemo(() => {
        if (!filterQuery.trim()) return localDetails;

        const q = filterQuery.toLowerCase();
        return localDetails.filter(d =>
            (d.supplierName || "").toLowerCase().includes(q) ||
            (d.brandName || "").toLowerCase().includes(q) ||
            (d.productName || "").toLowerCase().includes(q) ||
            ((d).categoryName || "").toLowerCase().includes(q)
        );
    }, [localDetails, filterQuery]);

    // 2. Grouping Logic: Build groups from the *filtered* list
    const groupedDetails = useMemo(() => {
        const groups: Record<string, Record<string, ConsolidatorDetailsDto[]>> = {};
        filteredDetails.forEach(detail => {
            const supplier = detail.supplierName || "UNASSIGNED";
            const brand = detail.brandName || "NO BRAND";
            if (!groups[supplier]) groups[supplier] = {};
            if (!groups[supplier][brand]) groups[supplier][brand] = [];
            groups[supplier][brand].push(detail);
        });
        return groups;
    }, [filteredDetails]);

    const totalToAudit = localDetails.length;
    const auditedCount = Object.keys(auditStatus).length;
    const progressPercent = totalToAudit > 0 ? (auditedCount / totalToAudit) * 100 : 0;
    const isComplete = auditedCount === totalToAudit && totalToAudit > 0;

    const handleAuditSuccess = useCallback((detailId: number, tag: string) => {
        if (auditStatus[detailId]) return;

        setAuditStatus(prev => ({ ...prev, [detailId]: true }));
        setScannedTags(prev => new Set(prev).add(tag));
        soundFX.success();
    }, [auditStatus]);

    const processAuditScan = useCallback(async (tag: string) => {
        if (scanningRef.current) return;
        scanningRef.current = true;

        try {
            if (scannedTags.has(tag)) {
                soundFX.duplicate();
                toast.warning("SKU already audited in this session");
                return;
            }

            let matchedDetail = localDetails.find(d =>
                d.productId.toString() === tag ||
                d.barcode?.toLowerCase() === tag.toLowerCase()
            );

            if (!matchedDetail && tag.length > 10) {
                const productId = await lookupRfidTag(tag);
                if (productId) matchedDetail = localDetails.find(d => d.productId === productId);
            }

            if (matchedDetail) {
                if (auditStatus[matchedDetail.id]) {
                    soundFX.duplicate();
                    toast.warning("Item already audited");
                } else {
                    handleAuditSuccess(matchedDetail.id, tag);

                    transmitAuditLog({
                        consolidatorDetailId: matchedDetail.id,
                        tag,
                        auditedBy: currentUser.user_id,
                        status: "Success"
                    }).catch(() => console.error("Sync Error"));
                }
            } else {
                soundFX.error();
                toast.error("Item not found in this batch");
            }
        } finally {
            scanningRef.current = false;
        }
    }, [localDetails, scannedTags, auditStatus, handleAuditSuccess, currentUser.user_id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;
            if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return;

            if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

            if (e.key === "Enter") {
                const finalTag = bufferRef.current.trim();
                bufferRef.current = "";
                if (finalTag) processAuditScan(finalTag);
            } else if (e.key.length === 1) {
                bufferRef.current += e.key;
            }

            scanTimeoutRef.current = setTimeout(() => {
                const finalTag = bufferRef.current.trim();
                if (finalTag.length > 3) {
                    bufferRef.current = "";
                    processAuditScan(finalTag);
                }
            }, 50);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [processAuditScan]);

    const handleRepick = async () => {
        if (!confirm("Are you sure you want to send this entire batch back to Picking?\n\nThis will clear current picking data.")) return;

        setIsRepicking(true);
        try {
            const success = await repickBatch(batch.id);
            if (success) {
                toast.success("Batch sent back for re-picking");
                onClose();
            }
        } catch {
            toast.error("Failed to initiate re-pick");
        } finally {
            setIsRepicking(false);
        }
    };

    const handleFinalize = async () => {
        setIsSubmitting(true);
        try {
            await onAuditComplete();
            toast.success("Audit Verified & Captured");
        } catch {
            toast.error("Finishing failed. Check connection.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-start overflow-hidden">
            {/* Sticky Header */}
            <header className="w-full flex-none px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 border-b border-border/40 bg-card/80 z-10 backdrop-blur-md shadow-sm shrink-0">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl h-12 w-12 hover:bg-muted transition-all shrink-0">
                        <ArrowLeft className="h-6 w-6"/>
                    </Button>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-none font-black tracking-widest text-[10px] py-0 shrink-0">{batch.consolidatorNo}</Badge>
                            <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic truncate">Batch Audit <span className="text-blue-500">Execution</span></h2>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">Active Auditor: {currentUser.user_fname} {currentUser.user_lname}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto shrink-0">
                    <div className="flex flex-col items-end gap-1 shrink-0 px-2 md:px-4">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl md:text-3xl font-black tracking-tighter text-blue-500 tabular-nums italic leading-none">{auditedCount}</span>
                            <span className="text-lg md:text-xl font-bold text-muted-foreground/30 tabular-nums leading-none">/ {totalToAudit}</span>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Audited SKUs</span>
                    </div>

                    <div className="h-8 md:h-10 w-32 md:w-48 bg-muted/30 rounded-full relative overflow-hidden flex-none border border-border/20">
                        <motion.div
                            className="absolute inset-x-0 bottom-0 top-0 bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] md:text-[10px] font-black text-foreground mix-blend-difference">{Math.round(progressPercent)}% DONE</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Layout - min-h-0 is crucial for flexbox scrolling to work! */}
            <main className="flex-1 min-h-0 w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 p-4 md:p-6 overflow-y-auto lg:overflow-hidden relative">

                {/* Left Panel */}
                <div className="lg:w-[400px] flex flex-col gap-6 shrink-0 lg:h-full lg:overflow-hidden">
                    <Card className="rounded-[2rem] border-none shadow-[0_20px_50px_-20px_rgba(37,99,235,0.15)] bg-blue-600/5 relative overflow-hidden group shrink-0">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                            <PackageCheck className="h-48 w-48 text-blue-600" />
                        </div>
                        <CardContent className="p-6 md:p-8 space-y-6">
                            <div className="flex items-center gap-2">
                                < Zap className="h-4 w-4 text-blue-500 animate-pulse" />
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Scanner Ready</span>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-2xl md:text-3xl font-black tracking-tighter leading-none italic uppercase">Hardware <br/>Interface</h3>
                                <p className="text-[11px] font-medium text-muted-foreground opacity-60 leading-relaxed uppercase tracking-tight">System listening for keyboard-wedge or Bluetooth HID scans in the background.</p>
                            </div>
                            <Input
                                placeholder="Manual Barcode Override..."
                                value={scannerQuery}
                                onChange={(e) => setScannerQuery(e.target.value)}
                                className="h-12 md:h-14 bg-background/50 border-none rounded-2xl px-6 font-black placeholder:font-bold placeholder:text-muted-foreground/30 text-base md:text-lg shadow-inner focus-visible:ring-0"
                                onKeyDown={(e) => {
                                    if(e.key === "Enter" && scannerQuery.trim()) {
                                        processAuditScan(scannerQuery.trim());
                                        setScannerQuery("");
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>

                    <Card className="flex-1 rounded-[2rem] border-none shadow-xl bg-card/30 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
                        <div className="p-6 border-b border-border/20 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Audit Policy</span>
                            </div>
                        </div>
                        {/* 🚀 BULLETPROOF NATIVE SCROLL CONTAINER */}
                        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                            <div className="p-6 md:p-8 space-y-6">
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black uppercase italic tracking-wider">Double Verification</h4>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase leading-tight tracking-tight">Ensure physical item matches the digital pick entry provided by warehouse picker.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                                        <AlertCircle className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black uppercase italic tracking-wider">Exception Handling</h4>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase leading-tight tracking-tight">If damaged or incorrect, do not audit. Use Repick button to return batch to picking floor.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border/20 bg-muted/10 shrink-0">
                            <div className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <span className="text-[9px] font-bold text-blue-500/70 uppercase leading-tight tracking-tighter">Automatic capture enabled. Any scanned valid SKU will mark as verified.</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Panel */}
                <div className="flex-1 bg-card/30 rounded-[2rem] border border-border/40 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700 min-h-[500px] lg:min-h-0">

                    <div className="p-4 border-b border-border/40 bg-background/50 flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter by Supplier, Brand, Category, or SKU..."
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                className="pl-11 h-12 bg-card border-none shadow-sm rounded-xl text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/30 w-full"
                            />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 px-2 text-muted-foreground">
                            <Filter className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{filteredDetails.length} Results</span>
                        </div>
                    </div>

                    {/* 🚀 BULLETPROOF NATIVE SCROLL CONTAINER */}
                    <div className="flex-1 overflow-y-auto min-h-0 bg-muted/5 custom-scrollbar">
                        <div className="p-4 md:p-8 space-y-10">
                            {Object.entries(groupedDetails).length === 0 ? (
                                <div className="py-20 text-center flex flex-col items-center justify-center text-muted-foreground/50">
                                    <PackageCheck className="h-16 w-16 mb-4 opacity-20" />
                                    <h3 className="text-lg font-black uppercase tracking-widest">No Items Found</h3>
                                    <p className="text-xs font-medium uppercase mt-2">Try adjusting your search filter.</p>
                                </div>
                            ) : (
                                Object.entries(groupedDetails).map(([supplier, brands]) => (
                                    <section key={supplier} className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px flex-1 bg-border/40" />
                                            <Badge variant="outline" className="bg-card px-4 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase rounded-full border-border/60 text-foreground">{supplier}</Badge>
                                            <div className="h-px flex-1 bg-border/40" />
                                        </div>

                                        {Object.entries(brands).map(([brand, items]) => (
                                            <div key={brand} className="space-y-3">
                                                <div className="flex items-center gap-2 px-2">
                                                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{brand}</span>
                                                </div>
                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                                    {items.map((item) => {
                                                        const isAudited = !!auditStatus[item.id];
                                                        return (
                                                            <motion.div
                                                                key={item.id}
                                                                whileHover={{ y: -2 }}
                                                                onClick={!isAudited ? () => processAuditScan(item.productId.toString()) : undefined}
                                                                className={`p-4 rounded-3xl border transition-all cursor-pointer ${isAudited ? "bg-green-500/10 border-green-500/30 shadow-inner" : "bg-card border-border/60 hover:border-primary/30 hover:shadow-lg"}`}
                                                            >
                                                                <div className="flex justify-between items-start gap-4">
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="text-xs md:text-[13px] font-black tracking-tight leading-tight uppercase line-clamp-2 pr-2">{item.productName}</h4>
                                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                            <span className="text-[9px] font-bold text-muted-foreground uppercase bg-background border border-border/40 px-2 py-0.5 rounded-md">
                                                                                {(item.categoryName) || "N/A"}
                                                                            </span>
                                                                            <span className="text-[9px] font-bold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-full">
                                                                                {item.unitName || "N/A"}
                                                                            </span>
                                                                            <span className="text-[9px] font-black tabular-nums text-foreground ml-auto pr-2">
                                                                                QTY: {item.pickedQuantity}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {isAudited ? (
                                                                        <div className="p-2.5 bg-green-500 rounded-2xl shadow-lg shadow-green-500/30 shrink-0">
                                                                            <CheckCircle2 className="h-4 w-4 text-white" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="p-2.5 bg-muted rounded-2xl shrink-0">
                                                                            <XCircle className="h-4 w-4 text-muted-foreground/40" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex-none p-4 md:p-6 bg-card border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                        <Button
                            variant="outline"
                            size="lg"
                            disabled={isRepicking || isSubmitting}
                            onClick={handleRepick}
                            className="w-full sm:w-auto rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/5 font-black uppercase text-[10px] tracking-widest h-12 md:h-14 px-6 md:px-8"
                        >
                            {isRepicking ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCcw className="h-4 w-4 mr-2"/>}
                            Return to Picker
                        </Button>
                        <Button
                            size="lg"
                            className={`w-full sm:w-auto rounded-3xl h-12 md:h-14 px-8 md:px-12 transition-all font-black uppercase text-[10px] md:text-[11px] tracking-widest relative overflow-hidden group ${isComplete ? "bg-green-600 hover:bg-green-700 shadow-xl shadow-green-600/20 text-white" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                            disabled={!isComplete || isSubmitting}
                            onClick={handleFinalize}
                        >
                            <AnimatePresence mode="wait">
                                {isSubmitting ? (
                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Verifying...
                                    </motion.div>
                                ) : isComplete ? (
                                    <motion.div key="complete" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                                        Finalize Verified Audit <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </motion.div>
                                ) : (
                                    <motion.span key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{totalToAudit - auditedCount} SKU(S) REMAINING</motion.span>
                                )}
                            </AnimatePresence>
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}