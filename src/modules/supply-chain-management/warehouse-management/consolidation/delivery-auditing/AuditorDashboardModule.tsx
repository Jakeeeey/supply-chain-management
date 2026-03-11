"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ShieldCheck, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";

// Relative imports looking at the files we just created in this folder
import { fetchConsolidators, fetchActiveBranches, completeAuditBatch } from "./providers/fetchProvider";
import { ConsolidatorDto } from "./types";
import { BranchSelector } from "./components/BranchSelector";
import { BatchCard } from "./components/BatchCard";
import ActiveAuditExecutionModule from "./components/ActiveAuditExecutionModule";

export default function AuditorDashboardModule() {
    const [batches, setBatches] = useState<ConsolidatorDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
    const [activeBatch, setActiveBatch] = useState<ConsolidatorDto | null>(null);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        const loadBranches = async () => {
            const activeBranches = await fetchActiveBranches();
            setBranches(activeBranches);
            if (activeBranches.length > 0 && !selectedBranchId) {
                setSelectedBranchId(activeBranches[0].id);
            }
        };
        loadBranches();
    }, []);

    const loadBatches = useCallback(async () => {
        if (!selectedBranchId) return;
        setLoading(true);
        try {
            // Asks for "Picked" status
            const response = await fetchConsolidators(selectedBranchId, 0, 50, "Picked", debouncedSearch);
            setBatches(response?.content || []);
        } catch (error) {
            console.error("Failed to load audit batches");
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId, debouncedSearch]);

    useEffect(() => {
        loadBatches();
    }, [loadBatches]);

    if (activeBatch) {
        return (
            <ActiveAuditExecutionModule
                batch={activeBatch}
                onClose={() => {
                    setActiveBatch(null);
                    loadBatches(); // 🚀 ADD THIS: Refresh list whenever the modal closes (Repick or Back)
                }}
                onAuditComplete={async () => {
                    const success = await completeAuditBatch(activeBatch.id);
                    if (success) {
                        setActiveBatch(null);
                        loadBatches(); // Keep this for completion
                    } else {
                        console.error("Failed to complete the audit.");
                    }
                }}
            />
        );
    }
    return (
        <div className="p-4 md:p-8 space-y-8 bg-background text-foreground min-h-screen pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 sticky top-0 z-30 py-4 bg-background/80 backdrop-blur-md">
                <div className="flex items-center gap-5 shrink-0">
                    <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 shrink-0">
                        <ShieldCheck className="h-8 w-8 text-white stroke-[2.5px]"/>
                    </div>
                    <div className="space-y-0.5 shrink-0">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic leading-none whitespace-nowrap">
                            QA <span className="text-blue-500">Auditing</span>
                        </h2>
                        <BranchSelector
                            branches={branches}
                            selectedBranchId={selectedBranchId}
                            onBranchChange={setSelectedBranchId}
                            isLoading={loading}
                        />
                    </div>
                </div>

                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10 opacity-50"/>
                    <Input
                        placeholder="Search Picked Batches..."
                        className="relative pl-12 bg-card/80 border-border/60 h-14 shadow-inner font-black placeholder:font-bold text-lg rounded-2xl focus-visible:ring-blue-500/20 z-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                    {!selectedBranchId ? (
                        <motion.div key="empty-branch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground/40">
                            <PackageOpen className="w-20 h-20 mb-4"/>
                            <h3 className="font-black uppercase tracking-widest text-lg">Select Terminal</h3>
                        </motion.div>
                    ) : loading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-blue-500">
                            <Loader2 className="w-12 h-12 animate-spin mb-4"/>
                            <h3 className="font-black uppercase tracking-widest text-sm">Fetching Picked Carts...</h3>
                        </motion.div>
                    ) : batches.length === 0 ? (
                        <motion.div key="empty-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground/40">
                            <ShieldCheck className="w-20 h-20 mb-4"/>
                            <h3 className="font-black uppercase tracking-widest text-lg">No Batches Pending Audit</h3>
                        </motion.div>
                    ) : (
                        batches.map((batch) => (
                            <BatchCard key={batch.id} batch={batch} onClick={setActiveBatch} />
                        ))
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}