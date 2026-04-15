"use client"

import React, { useState, useEffect } from "react"
import { CheckCircle, Loader2, LayoutGrid, List } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

import { DispatchPlanCard } from "./components/DispatchPlanCard"
import { DispatchApprovalModal } from "./components/DispatchApprovalModal"

import { PostDispatchApprovalDto } from "./types"
import { fetchPendingApprovals, fetchPlanDetails, approveDispatchPlan, rejectDispatchPlan } from "./providers/fetchProviders"
import { cn } from "@/lib/utils"

export default function DispatchApprovalClient() {
    const [pendingPlans, setPendingPlans] = useState<PostDispatchApprovalDto[]>([]);
    const [isListLoading, setIsListLoading] = useState(true);

    // 🚀 NEW: View mode state
    const [viewMode, setViewMode] = useState<"TILE" | "TABLE">("TILE");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlanDetails, setSelectedPlanDetails] = useState<PostDispatchApprovalDto | null>(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const loadList = async () => {
            try {
                const data = await fetchPendingApprovals();
                if (isMounted) setPendingPlans(data);
            } catch (error) {
                console.error("Failed to load dispatch plans", error);
                toast.error("Could not load pending plans.");
            } finally {
                if (isMounted) setIsListLoading(false);
            }
        };
        loadList();
        return () => { isMounted = false; };
    }, []);

    const handleCardClick = async (id: number) => {
        setIsModalOpen(true);
        setIsFetchingDetails(true);
        setSelectedPlanDetails(null);

        try {
            const details = await fetchPlanDetails(id);
            setSelectedPlanDetails(details);
        } catch (error) {
            console.error("Failed to fetch details", error);
            toast.error("Failed to load plan details.");
            setIsModalOpen(false);
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const handleAction = async (id: number, action: "APPROVE" | "REJECT") => {
        setIsProcessing(true);
        const success = action === "APPROVE"
            ? await approveDispatchPlan(id)
            : await rejectDispatchPlan(id);

        if (success) {
            toast.success(`Dispatch Plan ${action === "APPROVE" ? "Approved" : "Rejected"} successfully.`);
            setPendingPlans(prev => prev.filter(p => p.id !== id));
            setIsModalOpen(false);
            setSelectedPlanDetails(null);
        } else {
            toast.error(`Failed to ${action.toLowerCase()} dispatch plan.`);
        }
        setIsProcessing(false);
    };

    return (
        <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-32">

            {/* HEADER SECTION */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        Dispatch Approvals
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Review and authorize pending fleet routes
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Badge variant="outline" className="px-4 py-2 text-sm font-black uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-200">
                        {pendingPlans.length} Pending
                    </Badge>

                    {/* 🚀 NEW: VIEW TOGGLE CONTROLS */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                        <button
                            onClick={() => setViewMode("TILE")}
                            className={cn(
                                "p-2 rounded-md transition-all flex items-center justify-center",
                                viewMode === "TILE"
                                    ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                            title="Tile View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("TABLE")}
                            className={cn(
                                "p-2 rounded-md transition-all flex items-center justify-center",
                                viewMode === "TABLE"
                                    ? "bg-white dark:bg-slate-800 shadow-sm text-primary"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                            title="Table View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT SECTION */}
            {isListLoading ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <Loader2 className="w-12 h-12 animate-spin text-slate-400 mb-4"/>
                    <p className="text-sm font-bold uppercase tracking-widest">Loading Plans...</p>
                </div>
            ) : pendingPlans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mb-4 opacity-50"/>
                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-400">All Caught Up</h3>
                    <p className="text-sm font-bold text-slate-500 mt-2">No pending dispatches require approval.</p>
                </div>
            ) : viewMode === "TILE" ? (
                // 🚀 MODE 1: TILE GRID
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {pendingPlans.map((plan) => (
                        <DispatchPlanCard
                            key={plan.id}
                            // Quick data sanitization before passing to the card component
                            plan={{...plan, totalDistance: plan.totalDistance || 0}}
                            onClick={() => handleCardClick(plan.id)}
                        />
                    ))}
                </div>
            ) : (
                // 🚀 MODE 2: HIGH-DENSITY TABLE
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <th className="p-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500">Document No.</th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Status</th>
                            <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Est. Dispatch</th>
                            <th className="p-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500 text-right">Distance</th>
                            <th className="p-4 px-6 text-[11px] font-black uppercase tracking-widest text-slate-500 text-right">Amount</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pendingPlans.map(plan => (
                            <tr
                                key={plan.id}
                                onClick={() => handleCardClick(plan.id)}
                                className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                            >
                                <td className="p-4 px-6 font-black text-sm text-foreground group-hover:text-primary transition-colors">
                                    {plan.docNo}
                                </td>
                                <td className="p-4">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                                        {plan.status}
                                    </Badge>
                                </td>
                                <td className="p-4 font-bold text-xs text-slate-500 uppercase tracking-widest">
                                    {plan.estimatedTimeOfDispatch ? new Date(plan.estimatedTimeOfDispatch).toLocaleString() : "-"}
                                </td>
                                <td className="p-4 px-6 font-mono font-bold text-sm text-right text-slate-500">
                                    {/* 🚀 DISTANCE CHECK: If 0 or null, render "-" */}
                                    {plan.totalDistance ? `${plan.totalDistance} km` : "-"}
                                </td>
                                <td className="p-4 px-6 font-mono font-black text-sm text-right">
                                    ₱{(plan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            <DispatchApprovalModal
                isOpen={isModalOpen}
                isLoading={isFetchingDetails}
                plan={selectedPlanDetails}
                isProcessing={isProcessing}
                onClose={() => setIsModalOpen(false)}
                onAction={handleAction}
            />
        </div>
    );
}