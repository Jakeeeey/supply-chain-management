"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    CheckCircle2, AlertCircle, XCircle, 
    ArrowLeft, ChevronRight, PackageCheck, 
    Zap, ClipboardCheck, Info, Loader2, RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    const [searchQuery, setSearchQuery] = useState("");
    const [scannedTags, setScannedTags] = useState<Set<string>>(new Set());
    
    // Performance optimized refs for scanner logic
    const bufferRef = React.useRef("");
    const scanTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const scanningRef = React.useRef(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRepicking, setIsRepicking] = useState(false);

    // Mocking current user (Replace with auth context in production)
    const currentUser: UserInfo = { user_id: 1, user_fname: "Admin", user_lname: "Global" };

    // Grouping logic for clean UI
    const groupedDetails = useMemo(() => {
        const groups: Record<string, Record<string, ConsolidatorDetailsDto[]>> = {};
        localDetails.forEach(detail => {
            const supplier = detail.supplierName || "UNASSIGNED";
            const brand = detail.brandName || "NO BRAND";
            if (!groups[supplier]) groups[supplier] = {};
            if (!groups[supplier][brand]) groups[supplier][brand] = [];
            groups[supplier][brand].push(detail);
        });
        return groups;
    }, [localDetails]);

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
            // Priority 1: Check if it's already scanned
            if (scannedTags.has(tag)) {
                soundFX.duplicate();
                toast.warning("SKU already audited in this session");
                return;
            }

            // Priority 2: Direct identifier match
            let matchedDetail = localDetails.find(d => 
                d.productId.toString() === tag || 
                d.barcode?.toLowerCase() === tag.toLowerCase()
            );

            // Priority 3: RFID Lookup if no direct match
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
                    
                    // Fire-and-forget server sync
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

    // Hardware Scanner Listener
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
            <header className="w-full flex-none px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-border/40 bg-card/50">
                <div className="flex items-center gap-5">
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-2xl h-12 w-12 hover:bg-muted transition-all">
                        <ArrowLeft className="h-6 w-6"/>
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                             <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-none font-black tracking-widest text-[10px] py-0">{batch.consolidatorNo}</Badge>
                             <h2 className="text-2xl font-black tracking-tighter uppercase italic">Batch Audit <span className="text-blue-500">Execution</span></h2>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Auditor: {currentUser.user_fname} {currentUser.user_lname}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col items-end gap-1 shrink-0 px-4">
                        <div className="flex items-baseline gap-1.5">
                             <span className="text-3xl font-black tracking-tighter text-blue-500 tabular-nums italic leading-none">{auditedCount}</span>
                             <span className="text-xl font-bold text-muted-foreground/30 tabular-nums leading-none">/ {totalToAudit}</span>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Audited SKUs</span>
                    </div>

                    <div className="h-10 w-48 bg-muted/30 rounded-full relative overflow-hidden flex-none border border-border/20">
                        <motion.div 
                            className="absolute inset-x-0 bottom-0 top-0 bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-black text-foreground mix-blend-difference">{Math.round(progressPercent)}% DONE</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
                <div className="lg:w-[400px] flex flex-col gap-6 shrink-0">
                    <Card className="rounded-[2rem] border-none shadow-[0_20px_50px_-20px_rgba(37,99,235,0.15)] bg-blue-600/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                            <PackageCheck className="h-48 w-48 text-blue-600" />
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-center gap-2">
                                < Zap className="h-4 w-4 text-blue-500 animate-pulse" />
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Scanner Ready</span>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black tracking-tighter leading-none italic uppercase">Hardware <br/>Interface</h3>
                                <p className="text-[11px] font-medium text-muted-foreground opacity-60 leading-relaxed uppercase tracking-tight">System listening for keyboard-wedge or Bluetooth HID scans in the background.</p>
                            </div>
                            <Input 
                                placeholder="Scan Barcode or RFID Tag..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 bg-background/50 border-none rounded-2xl px-6 font-black placeholder:font-bold placeholder:text-muted-foreground/30 text-lg shadow-inner focus-visible:ring-0"
                                onKeyDown={(e) => { if(e.key === "Enter") { processAuditScan(searchQuery); setSearchQuery(""); } }}
                            />
                        </CardContent>
                    </Card>

                    <Card className="flex-1 rounded-[2rem] border-none shadow-xl bg-card/30 flex flex-col overflow-hidden">
                         <div className="p-6 border-b border-border/20 flex justify-between items-center shrink-0">
                             <div className="flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Audit Policy</span>
                             </div>
                         </div>
                         <ScrollArea className="flex-1">
                             <div className="p-8 space-y-6">
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
                         </ScrollArea>
                         <div className="p-4 border-t border-border/20 bg-muted/10">
                            <div className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="text-[9px] font-bold text-blue-500/70 uppercase leading-tight tracking-tighter">Automatic capture enabled. Any scanned valid SKU will mark as verified.</span>
                            </div>
                         </div>
                    </Card>
                </div>

                <div className="flex-1 bg-card/30 rounded-[2.5rem] border border-border/40 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700">
                    <ScrollArea className="flex-1">
                        <div className="p-8 pt-10 space-y-10">
                            {Object.entries(groupedDetails).map(([supplier, brands]) => (
                                <section key={supplier} className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-border/40" />
                                        <Badge variant="outline" className="bg-muted px-4 py-1 text-[10px] font-black tracking-[0.2em] uppercase rounded-full">{supplier}</Badge>
                                        <div className="h-px flex-1 bg-border/40" />
                                    </div>

                                    {Object.entries(brands).map(([brand, items]) => (
                                        <div key={brand} className="space-y-3">
                                            <div className="flex items-center gap-2 px-2">
                                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">{brand}</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {items.map((item) => {
                                                    const isAudited = !!auditStatus[item.id];
                                                    return (
                                                        <motion.div 
                                                            key={item.id}
                                                            whileHover={{ y: -2 }}
                                                            onClick={!isAudited ? () => processAuditScan(item.productId.toString()) : undefined}
                                                            className={`p-4 rounded-3xl border transition-all cursor-pointer ${isAudited ? "bg-green-500/5 border-green-500/20" : "bg-card border-border/60 hover:border-primary/20 hover:shadow-lg"}`}
                                                        >
                                                            <div className="flex justify-between items-start gap-4">
                                                                <div className="flex-1">
                                                                    <h4 className="text-[13px] font-black tracking-tight leading-tight uppercase line-clamp-2">{item.productName}</h4>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded-full">{item.unitName || "N/A"}</span>
                                                                        <span className="text-[9px] font-black tabular-nums text-foreground">COUNT: {item.pickedQuantity}</span>
                                                                    </div>
                                                                </div>
                                                                {isAudited ? (
                                                                    <div className="p-2 bg-green-500 rounded-2xl shadow-lg shadow-green-500/20">
                                                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-2 bg-muted rounded-2xl">
                                                                        <XCircle className="h-4 w-4 text-muted-foreground/30" />
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
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="flex-none p-6 bg-card border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button 
                                variant="outline" 
                                size="lg" 
                                disabled={isRepicking || isSubmitting}
                                onClick={handleRepick}
                                className="w-full sm:w-auto rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/5 font-black uppercase text-[10px] tracking-widest h-14 px-8"
                            >
                                {isRepicking ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCcw className="h-4 w-4 mr-2"/>}
                                Return to Picker
                            </Button>
                        </div>
                        <Button 
                            size="lg" 
                            className={`w-full sm:w-auto rounded-3xl h-14 px-12 transition-all font-black uppercase text-[11px] tracking-widest relative overflow-hidden group ${isComplete ? "bg-green-600 hover:bg-green-700 shadow-xl shadow-green-600/20" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
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