"use client";

import * as React from "react";
import { KioskDispatchPlan } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, User, Truck, Box } from "lucide-react";
import { DispatchModal } from "./DispatchModal";

interface KioskListProps {
    plans: KioskDispatchPlan[];
    loading: boolean;
    onSuccess?: () => void;
}

export function KioskList({ plans, loading, onSuccess }: KioskListProps) {
    const [selectedPlan, setSelectedPlan] = React.useState<KioskDispatchPlan | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleCardClick = (plan: KioskDispatchPlan) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-[180px] w-full animate-pulse rounded-2xl bg-muted/40 dark:bg-muted/10" />
                ))}
            </div>
        );
    }

    if (plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-background/30 rounded-3xl border border-dashed border-border/60 text-center p-8 backdrop-blur-sm">
                <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <Box className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-xl font-semibold mb-1">No Dispatch Found</h3>
                <p className="text-muted-foreground max-w-xs">
                    Try adjusting your search or filters to find what you're looking for.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
                // Normalize status for comparison
                const statusStr = plan.status?.toLowerCase() || "";
                const isDispatch = statusStr === "for dispatch";
                const isInbound = statusStr === "for inbound";

                // Dynamic styling based on status
                const cardStyles = isDispatch
                    ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/10 hover:border-emerald-500"
                    : isInbound
                        ? "border-red-500/50 bg-red-50/30 dark:bg-red-500/10 hover:border-red-500"
                        : "border-border/40 bg-card/40 hover:border-primary/20";

                const gradientStyles = isDispatch
                    ? "from-emerald-400/10 via-transparent to-transparent"
                    : isInbound
                        ? "from-red-400/10 via-transparent to-transparent"
                        : "from-primary/5 via-transparent to-transparent";

                const iconColor = isDispatch ? "text-emerald-600" : isInbound ? "text-red-600" : "text-primary/80";
                const titleColor = isDispatch ? "text-emerald-700" : isInbound ? "text-red-700" : "group-hover:text-primary";
                const borderColor = isDispatch ? "border-emerald-500/30" : isInbound ? "border-red-500/30" : "border-border/20";
                const iconBgColor = isDispatch ? "bg-emerald-500/10 border-emerald-500/20" : isInbound ? "bg-red-500/10 border-red-500/20" : "bg-background/60 border-border/30";
                const labelColor = isDispatch ? "text-emerald-600/80" : isInbound ? "text-red-600/80" : "text-muted-foreground";
                const valueColor = isDispatch ? "text-emerald-900 dark:text-emerald-100" : isInbound ? "text-red-900 dark:text-red-100" : "text-foreground/90";

                return (
                    <Card
                        key={plan.id}
                        className={`group relative overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl dark:bg-card/20 dark:hover:bg-card/30 cursor-pointer ${cardStyles}`}
                        onClick={() => handleCardClick(plan)}
                    >
                        {/* Gradient glow */}
                        <div className={`absolute inset-0 bg-gradient-to-br transition-opacity opacity-0 group-hover:opacity-100 ${gradientStyles}`} />

                        <CardContent className="p-6 relative">
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className={`flex items-center gap-2 ${iconColor}`}>
                                            <Truck className="h-4 w-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">DP Number</span>
                                        </div>
                                        <h3 className={`text-2xl font-black tracking-tight transition-colors ${titleColor}`}>
                                            {plan.doc_no}
                                        </h3>
                                    </div>

                                    {/* Text-only coloring for the status indicator */}
                                    <div
                                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm transition-all border bg-white dark:bg-card ${isDispatch
                                            ? "text-emerald-600 border-emerald-200 dark:border-emerald-500/30"
                                            : isInbound
                                                ? "text-red-600 border-red-200 dark:border-red-500/30"
                                                : "text-muted-foreground border-border/50"
                                            }`}
                                    >
                                        {plan.status}
                                    </div>
                                </div>

                                <div className={`grid grid-cols-2 gap-4 pt-2 border-t ${borderColor}`}>
                                    {/* Driver Info Section */}
                                    <div className="flex items-center gap-2">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-colors ${iconBgColor}`}>
                                            <User className={`h-4 w-4 ${iconColor}`} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] uppercase font-bold ${labelColor}`}>Driver</span>
                                            <span className={`text-sm font-semibold truncate ${valueColor}`}>
                                                {plan.driver_name}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Date Info Section */}
                                    <div className="flex items-center gap-2">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-colors ${iconBgColor}`}>
                                            <Calendar className={`h-4 w-4 ${iconColor}`} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] uppercase font-bold ${labelColor}`}>
                                                {isDispatch ? "Est. Dispatch" : isInbound ? "Est. Arrival" : "Date"}
                                            </span>
                                            <span className={`text-sm font-semibold ${valueColor}`}>
                                                {isDispatch && plan.estimated_time_of_dispatch
                                                    ? format(new Date(plan.estimated_time_of_dispatch), "MMMM dd, yyyy")
                                                    : isInbound && plan.estimated_time_of_arrival
                                                        ? format(new Date(plan.estimated_time_of_arrival), "MMMM dd, yyyy")
                                                        : plan.date_encoded ? format(new Date(plan.date_encoded), "MMMM dd, yyyy") : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            <DispatchModal
                plan={selectedPlan}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSuccess={onSuccess}
            />
        </div>
    );
}