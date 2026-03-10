"use client";

import React from "react";
import { CheckCircle2, Package, Truck, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConsolidationCreationSuccessProps {
    batch: {
        consolidatorNo: string;
        dispatches?: any[];
        details?: any[];
    };
    onReset: () => void;
    onViewBatch: () => void;
}

export default function ConsolidationCreationSuccess({ batch, onReset, onViewBatch }: ConsolidationCreationSuccessProps) {
    return (
        <div className="flex flex-col h-full bg-background items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
            <div className="bg-card border border-border/60 rounded-3xl shadow-2xl p-8 md:p-12 max-w-lg w-full text-center flex flex-col items-center relative overflow-hidden">

                {/* 🎨 UI Enhancement: Animated Scanline effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_bottom,transparent_50%,black_50%)] bg-[length:100%_4px] animate-[pulse_2s_ease-in-out_infinite]" />

                {/* Background celebratory glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

                {/* Icon Section */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                    <div className="relative bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-full">
                        <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-[bounce_2s_infinite]" />
                    </div>
                </div>

                <div className="space-y-2 mb-8">
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic italic-none">
                        Batch <span className="text-emerald-500">Confirmed</span>
                    </h2>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] opacity-70">
                        Logistics Pipeline Synchronized
                    </p>
                </div>

                {/* The Batch Number - Visual Focus */}
                <div className="relative w-full mb-10 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-muted/50 px-6 py-5 rounded-2xl w-full flex items-center justify-between border border-border/50 shadow-inner">
                        <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-primary" />
                            <span className="text-lg font-mono font-bold text-foreground tracking-tight">
                                {batch.consolidatorNo}
                            </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                            LIVE
                        </Badge>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 w-full mb-10">
                    <div className="flex flex-col items-start p-5 bg-muted/30 rounded-2xl border border-border/40 hover:bg-muted/50 transition-all group">
                        <Truck className="w-5 h-5 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-2xl font-black tracking-tighter">{batch.dispatches?.length || 0}</span>
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Dispatch Plans</span>
                    </div>
                    <div className="flex flex-col items-start p-5 bg-muted/30 rounded-2xl border border-border/40 hover:bg-muted/50 transition-all group">
                        <FileText className="w-5 h-5 text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-2xl font-black tracking-tighter">{batch.details?.length || 0}</span>
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Unique SKUs</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    <Button
                        variant="ghost"
                        className="w-full font-black uppercase text-[10px] tracking-widest h-14 rounded-xl border border-border/50 hover:bg-muted"
                        onClick={onReset}
                    >
                        Create New
                    </Button>
                    <Button
                        className="w-full font-black uppercase text-[10px] tracking-widest h-14 rounded-xl shadow-xl shadow-primary/20 group relative overflow-hidden"
                        onClick={onViewBatch}
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                        <span className="flex items-center gap-2">
                            View Batch <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// 🚀 Helper for the Status Badge
function Badge({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: string }) {
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${className}`}>
            {children}
        </span>
    );
}