"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ScanLine, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BranchSelector } from "../consolidation/delivery-picking/components/BranchSelector";
import ActivePickingExecutionModule from "./components/ActivePickingExecutionModule";
import { BatchCard } from "./components/BatchCard";
import { usePickerDashboard } from "./hooks/usePickerDashboard";

export default function PickerDashboardModule() {
    const {
        batches,
        loading,
        searchQuery,
        branches,
        selectedBranchId,
        activeBatch,
        currentUserId,
        setSearchQuery,
        setSelectedBranchId,
        setActiveBatch,
        handleBatchCompletion,
    } = usePickerDashboard();

    if (activeBatch) {
        return (
            <ActivePickingExecutionModule
                batch={activeBatch}
                currentUserId={currentUserId}
                onClose={() => setActiveBatch(null)}
                onBatchComplete={handleBatchCompletion}
            />
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* 🚀 FLAWLESS STICKY HEADER */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between md:items-center gap-6 transition-all">
                <div className="flex items-center gap-4 md:gap-5 shrink-0">
                    <div className="p-3 md:p-4 bg-primary rounded-2xl shadow-lg shadow-primary/20 shrink-0">
                        <ScanLine className="h-7 w-7 md:h-8 md:w-8 text-primary-foreground stroke-[2.5px]"/>
                    </div>
                    <div className="space-y-0.5 shrink-0">
                        <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic leading-none whitespace-nowrap">
                            Floor <span className="text-primary">Execution</span>
                        </h2>
                        <div className="mt-1 md:mt-0">
                            <BranchSelector
                                branches={branches}
                                selectedBranchId={selectedBranchId}
                                onBranchChange={setSelectedBranchId}
                                isLoading={loading}
                            />
                        </div>
                    </div>
                </div>

                <div className="relative w-full md:w-[400px] group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10 opacity-60"/>
                    <Input
                        placeholder="Scan or Type Batch Number..."
                        className="relative pl-12 bg-muted/30 border-border/60 h-14 shadow-inner font-black placeholder:font-bold text-base md:text-lg rounded-2xl focus-visible:ring-primary/20 z-10 transition-colors hover:bg-muted/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* BATCH GRID (Padding applied here instead of wrapper) */}
            <div className="p-4 md:p-8">
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {!selectedBranchId ? (
                            <motion.div key="empty-branch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground/40">
                                <PackageOpen className="w-20 h-20 mb-4"/>
                                <h3 className="font-black uppercase tracking-widest text-lg">Select Terminal</h3>
                            </motion.div>
                        ) : loading ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-primary">
                                <Loader2 className="w-12 h-12 animate-spin mb-4"/>
                                <h3 className="font-black uppercase tracking-widest text-sm">Syncing Scanners...</h3>
                            </motion.div>
                        ) : batches.length === 0 ? (
                            <motion.div key="empty-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground/40">
                                <ScanLine className="w-20 h-20 mb-4"/>
                                <h3 className="font-black uppercase tracking-widest text-lg">No Pending Scans</h3>
                            </motion.div>
                        ) : (
                            batches.map((batch) => (
                                <BatchCard
                                    key={batch.id}
                                    batch={batch}
                                    onClick={setActiveBatch}
                                />
                            ))
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}