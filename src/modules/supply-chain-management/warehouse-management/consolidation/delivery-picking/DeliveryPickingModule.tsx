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
import { BranchSelector } from "./components/BranchSelector";

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
        if (!selectedBranchId) return;

        setLoading(true);
        setErrorStatus(null);

        try {
            const response = await fetchConsolidators(
                selectedBranchId,
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
        <div className="p-3 sm:p-6 md:p-8 space-y-6 md:space-y-8 bg-background text-foreground min-h-screen pb-20 transition-all duration-500 ease-in-out">

            {/* --- 💎 MODERN RESPONSIVE HEADER --- */}
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 xl:gap-6 sticky top-0 z-30 py-2 sm:py-4 bg-background/90 backdrop-blur-md border-b border-border/40 xl:border-transparent transition-all">

                {/* Title & Branch Section */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 shrink-0 w-full xl:w-auto">
                    <div className="hidden sm:flex p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20 rotate-3 shrink-0">
                        <Layers className="h-6 w-6 lg:h-8 lg:w-8 text-primary-foreground stroke-[2.5px]"/>
                    </div>
                    <div className="space-y-2 sm:space-y-0.5 shrink-0 w-full sm:w-auto">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase italic leading-none whitespace-nowrap flex items-center gap-2">
                            <Layers className="h-5 w-5 sm:hidden text-primary stroke-[3px] -mt-0.5"/>
                            Delivery <span className="text-primary">Picking</span>
                        </h2>
                        <div className="w-full sm:w-auto">
                            <BranchSelector
                                branches={branches}
                                selectedBranchId={selectedBranchId}
                                onBranchChange={setSelectedBranchId}
                                isLoading={loading}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-64 md:w-72 group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-blue-500/30 blur opacity-0 group-focus-within:opacity-100 transition duration-500 rounded-xl" />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 opacity-50"/>
                        <Input
                            placeholder="Find Batch Number..."
                            className="relative w-full pl-10 bg-card/50 border-border/40 h-10 sm:h-12 shadow-inner font-bold placeholder:font-medium text-xs sm:text-sm rounded-xl focus-visible:ring-primary/20 z-10 backdrop-blur-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="h-8 w-[1px] bg-border/50 mx-1 hidden sm:block" />

                    {/* Buttons Row (Mobile: Side-by-side, Desktop: Inline) */}
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                        {/* Secondary Action (Moved to left on mobile for hierarchy) */}
                        <Button
                            variant="outline"
                            className="flex-1 sm:flex-none h-10 sm:h-12 gap-1.5 sm:gap-2 shadow-sm font-black uppercase text-[9px] sm:text-[10px] tracking-widest border-border/60 bg-card hover:bg-accent rounded-xl px-3 sm:px-5"
                            onClick={() => setIsManagePickersOpen(true)}
                        >
                            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5px]"/>
                            <span className="hidden sm:inline">Manage Pickers</span>
                            <span className="sm:hidden">Pickers</span>
                        </Button>

                        {/* Primary Action */}
                        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex-1 sm:flex-none h-10 sm:h-12 gap-2 sm:gap-3 shadow-lg shadow-primary/20 font-black uppercase text-[10px] sm:text-xs tracking-widest px-4 sm:px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-95 group">
                                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3.5px] group-hover:rotate-90 transition-transform duration-300"/>
                                    <span>Generate Batch</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="p-0 border-none sm:border-solid sm:border-border/60 max-w-none w-screen h-[100dvh] sm:h-[95vh] sm:max-w-[95vw] lg:max-w-[1440px] flex flex-col overflow-hidden bg-background sm:bg-background/95 sm:backdrop-blur-xl sm:rounded-2xl sm:shadow-[0_0_100px_-12px_rgba(0,0,0,0.5)]">
                                <DialogHeader className="p-4 sm:p-6 lg:p-8 bg-card/30 border-b border-border/40 shrink-0">
                                    <DialogTitle className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tighter flex items-center gap-2 sm:gap-3 italic">
                                        <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                                        Consolidation <span className="text-primary">Wizard</span>
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="flex-1 overflow-hidden bg-transparent relative">
                                    {/* Using absolute positioning inside the dialog body prevents mobile flex blowout */}
                                    <div className="absolute inset-0">
                                        <ConsolidationCreationModule
                                            branchId={selectedBranchId}
                                            onSuccess={() => {
                                                setIsCreateModalOpen(false);
                                                loadTableData();
                                                loadSummary();
                                            }}
                                        />
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
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
            <Card className="border-border/30 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.1)] sm:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden bg-card/20 backdrop-blur-sm transition-all rounded-xl sm:rounded-[2rem] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                <CardContent className="p-0">
                    {!selectedBranchId ? (
                        <div className="flex flex-col items-center justify-center py-32 sm:py-64 px-4 text-center">
                            <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4 animate-bounce" />
                            <p className="text-xs sm:text-sm text-muted-foreground font-black uppercase tracking-widest">Select Branch to Stream Data</p>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-32 sm:py-64 space-y-6 sm:space-y-8 px-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-[40px] sm:blur-[60px] rounded-full animate-pulse" />
                                <div className="relative p-4 sm:p-6 bg-card rounded-2xl sm:rounded-3xl border border-border/50 shadow-xl sm:shadow-2xl">
                                    <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-primary"/>
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-base sm:text-lg font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-foreground italic">Syncing Terminal</p>
                                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-muted-foreground font-mono opacity-50 uppercase tracking-widest">
                                    <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin-reverse shrink-0" />
                                    <span>Establishing Secure Tunnel to VOS-SCM</span>
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