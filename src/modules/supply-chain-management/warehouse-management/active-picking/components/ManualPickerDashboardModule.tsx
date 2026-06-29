"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, PackageOpen, Keyboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BranchSelector } from "../../consolidation/delivery-picking/components/BranchSelector";
import ManualPickingExecutionModule from "./ManualPickingExecutionModule";
import { BatchCard } from "./BatchCard";
import { usePickerDashboard } from "../hooks/usePickerDashboard";

export default function ManualPickerDashboardModule() {
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
            <ManualPickingExecutionModule
                batch={activeBatch}
                currentUserId={currentUserId}
                onClose={() => setActiveBatch(null)}
                onBatchComplete={handleBatchCompletion}
            />
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">

            {/* STICKY HEADER — Manual branded with blue accent */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between md:items-center gap-6 transition-all">
                <div className="flex items-center gap-4 md:gap-5 shrink-0">
                    <div className="p-3 md:p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 shrink-0">
                        <Keyboard className="h-7 w-7 md:h-8 md:w-8 text-white stroke-[2.5px]" />
                    </div>
                    <div className="space-y-0.5 shrink-0">
                        <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic leading-none whitespace-nowrap">
                            Manual <span className="text-blue-500">Picking</span>
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
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10 opacity-60" />
                    <Input
                        placeholder="Scan or Type Batch Number..."
                        className="relative pl-12 bg-muted/30 border-border/60 h-14 shadow-inner font-black placeholder:font-bold text-base md:text-lg rounded-2xl focus-visible:ring-blue-500/20 z-10 transition-colors hover:bg-muted/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* MODE INDICATOR BANNER */}
            <div className="mx-4 md:mx-8 mt-4 flex items-center gap-2 px-4 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <Keyboard className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                    Manual Mode — Supports barcode scanner &amp; keyboard input for all inventory items
                </p>
            </div>

            {/* BATCH GRID */}
            <div className="p-4 md:p-8">
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {!selectedBranchId ? (
                            <motion.div key="empty-branch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground/40">
                                <PackageOpen className="w-20 h-20 mb-4" />
                                <h3 className="font-black uppercase tracking-widest text-lg">Select Terminal</h3>
                            </motion.div>
                        ) : loading ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-blue-500">
                                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                <h3 className="font-black uppercase tracking-widest text-sm">Loading Batches...</h3>
                            </motion.div>
                        ) : batches.length === 0 ? (
                            <motion.div key="empty-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground/40">
                                <Keyboard className="w-20 h-20 mb-4" />
                                <h3 className="font-black uppercase tracking-widest text-lg">No Pending Batches</h3>
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
