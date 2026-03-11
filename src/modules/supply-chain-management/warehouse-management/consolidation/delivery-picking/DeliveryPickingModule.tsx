"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Package, Search, Plus, Loader2, Users, ClipboardList, RefreshCw, Layers, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Providers & Types
import { fetchConsolidators, fetchConsolidatorSummary, fetchActiveBranches } from "./providers/fetchProvider";
import { ConsolidatorDto } from "./types";

// Extracted Sub-Components
import { StatusSummaryCards } from "./components/StatusSummaryCards";
import { ConsolidatorTable } from "./components/ConsolidatorTable";
import { ConsolidatorDetailSheet } from "./components/ConsolidatorDetailSheet";
import { ManagePickersSheet } from "./components/ManagePickersSheet";
import { BranchSelector } from "./components/BranchSelector"; // 🚀 Ensure you created this component

// 🚀 Core Consolidation Logic
import ConsolidationCreationModule from "./ConsolidationCreationModule";

export default function DeliveryPickingModule() {
    // --- DATA STATE ---
    const [data, setData] = useState<ConsolidatorDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);

    const [globalCounts, setGlobalCounts] = useState<{
        [key: string]: any;
        page?: { totalElements: number; totalPages: number; number: number };
    }>({});

    const [errorStatus, setErrorStatus] = useState<number | null>(null);

    // --- UI STATE ---
    const [isManagePickersOpen, setIsManagePickersOpen] = useState(false);
    const [selectedConsolidator, setSelectedConsolidator] = useState<ConsolidatorDto | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // --- FILTERS, SEARCH & PAGINATION ---
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    // 🚀 INITIALIZE BRANCHES
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

    // 🚀 DEBOUNCE SEARCH
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(0);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const loadSummary = useCallback(async () => {
        const summary = await fetchConsolidatorSummary();
        if (summary) setGlobalCounts(summary);
    }, []);

    const loadTableData = useCallback(async () => {
        if (!selectedBranchId) return; // 🚀 LOCK: Don't fetch without branch

        setLoading(true);
        setErrorStatus(null);

        try {
            const response = await fetchConsolidators(
                selectedBranchId, // 🚀 NEW: Branch-aware fetching
                currentPage,
                50,
                statusFilter,
                debouncedSearch
            );

            if (!response) {
                setErrorStatus(401);
                setData([]);
                setTotalPages(0);
                setTotalElements(0);
                return;
            }

            setData(response.content || []);
            setTotalPages(response.totalPages || 0);
            setTotalElements(response.totalElements || 0);

        } catch (error) {
            console.error("VOS: Failed to load consolidators:", error);
            setErrorStatus(500);
            setTotalPages(0);
            setTotalElements(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, statusFilter, debouncedSearch, selectedBranchId]);

    useEffect(() => {
        if (selectedBranchId) {
            loadSummary();
            loadTableData();
        }
    }, [loadTableData, loadSummary, selectedBranchId]);

    const handleStatusChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        setCurrentPage(0);
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-background text-foreground min-h-screen pb-20 transition-all duration-500 ease-in-out">

            {/* --- 💎 MODERN GLASS HEADER --- */}
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6 sticky top-0 z-30 py-4 bg-background/80 backdrop-blur-md border-b border-transparent transition-all">

                <div className="flex items-center gap-5 shrink-0">
                    <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20 rotate-3 shrink-0">
                        <Layers className="h-8 w-8 text-primary-foreground stroke-[2.5px]"/>
                    </div>
                    <div className="space-y-0.5 shrink-0">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic leading-none whitespace-nowrap">
                            Delivery <span className="text-primary">Picking</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* 🚀 NEW: Branch Selector Integration */}
                            <BranchSelector
                                branches={branches}
                                selectedBranchId={selectedBranchId}
                                onBranchChange={setSelectedBranchId}
                                isLoading={loading}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 ml-auto xl:ml-0">
                    {/* Search Field */}
                    <div className="relative w-full md:w-72 group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-blue-500/30 blur opacity-0 group-focus-within:opacity-100 transition duration-500 rounded-xl" />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 opacity-50"/>
                        <Input
                            placeholder="Find Batch Number..."
                            className="relative pl-10 bg-card/50 border-border/40 h-12 shadow-inner font-bold placeholder:font-medium text-sm rounded-xl focus-visible:ring-primary/20 z-10 backdrop-blur-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="h-8 w-[1px] bg-border/50 mx-1 hidden md:block" />

                    {/* Primary Action */}
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-12 gap-3 shadow-2xl shadow-primary/30 font-black uppercase tracking-widest px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-95 group">
                                <Plus className="h-5 w-5 stroke-[3.5px] group-hover:rotate-90 transition-transform duration-300"/>
                                <span>Generate Batch</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[95vw] lg:max-w-[1440px] w-full h-[95vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/60 shadow-[0_0_100px_-12px_rgba(0,0,0,0.5)]">
                            <DialogHeader className="p-8 bg-card/30 border-b border-border/40">
                                <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3 italic">
                                    <ClipboardList className="w-8 h-8 text-primary" />
                                    Consolidation <span className="text-primary">Wizard</span>
                                </DialogTitle>
                            </DialogHeader>

                            <div className="flex-1 overflow-hidden bg-transparent">
                                <ConsolidationCreationModule
                                    branchId={selectedBranchId} // 🚀 NEW: Wizard is now branch-aware
                                    onSuccess={() => {
                                        setIsCreateModalOpen(false);
                                        loadTableData();
                                        loadSummary();
                                    }}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Secondary Action */}
                    <Button
                        variant="outline"
                        className="h-12 gap-2 shadow-sm font-black uppercase text-[10px] tracking-widest border-border/60 bg-card hover:bg-accent rounded-xl px-5"
                        onClick={() => setIsManagePickersOpen(true)}
                    >
                        <Users className="h-4 w-4 stroke-[2.5px]"/> Manage Pickers
                    </Button>
                </div>
            </div>

            {/* --- 📊 ANALYTICS OVERVIEW --- */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                <StatusSummaryCards
                    globalCounts={globalCounts}
                    currentFilter={statusFilter}
                    onFilterChange={handleStatusChange}
                />
            </div>

            {/* --- 📦 MAIN DATA GRID --- */}
            <Card className="border-border/30 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden bg-card/20 backdrop-blur-sm transition-all rounded-[2rem] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <CardContent className="p-0">
                    {!selectedBranchId ? (
                        <div className="flex flex-col items-center justify-center py-64">
                            <Building2 className="h-12 w-12 text-muted-foreground mb-4 animate-bounce" />
                            <p className="text-muted-foreground font-black uppercase tracking-widest">Select Branch to Stream Data</p>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-64 space-y-8">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full animate-pulse" />
                                <div className="relative p-6 bg-card rounded-3xl border border-border/50 shadow-2xl">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary"/>
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-lg font-black uppercase tracking-[0.4em] text-foreground italic">Syncing Terminal</p>
                                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-mono opacity-50 uppercase tracking-widest">
                                    <RefreshCw className="h-3 w-3 animate-spin-reverse" />
                                    Establishing Secure Tunnel to VOS-SCM
                                </div>
                            </div>
                        </div>
                    ) : (
                        <ConsolidatorTable
                            data={data}
                            loading={loading}
                            error={errorStatus}
                            onRowClick={setSelectedConsolidator}
                            pagination={{
                                currentPage,
                                totalPages,
                                totalElements,
                                onPageChange: setCurrentPage
                            }}
                        />
                    )}
                </CardContent>
            </Card>

            {/* --- 🛠️ SLIDE-OUT INTERFACES --- */}
            <ConsolidatorDetailSheet
                consolidator={selectedConsolidator}
                isOpen={!!selectedConsolidator}
                onClose={() => setSelectedConsolidator(null)}
            />

            <ManagePickersSheet
                isOpen={isManagePickersOpen}
                onClose={() => setIsManagePickersOpen(false)}
            />
        </div>
    );
}