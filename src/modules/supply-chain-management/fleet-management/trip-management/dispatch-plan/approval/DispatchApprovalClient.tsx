"use client"

import React, { useState, useEffect } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

import { DispatchPlanCard } from "./components/DispatchPlanCard"
import { DispatchApprovalModal } from "./components/DispatchApprovalModal"

import { PostDispatchApprovalDto } from "./types"
import { fetchPendingApprovals, fetchPlanDetails, approveDispatchPlan, rejectDispatchPlan } from "./providers/fetchProviders"

export default function DispatchApprovalClient() {
    const [pendingPlans, setPendingPlans] = useState<PostDispatchApprovalDto[]>([]);
    const [isListLoading, setIsListLoading] = useState(true);

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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                        Dispatch Approvals
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Review and authorize pending fleet routes
                    </p>
                </div>
                <Badge variant="outline" className="px-4 py-2 text-sm font-black uppercase tracking-widest bg-amber-50 text-amber-600 border-amber-200 w-fit">
                    {pendingPlans.length} Pending
                </Badge>
            </div>

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
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {pendingPlans.map((plan) => (
                        <DispatchPlanCard
                            key={plan.id}
                            plan={plan}
                            onClick={() => handleCardClick(plan.id)}
                        />
                    ))}
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