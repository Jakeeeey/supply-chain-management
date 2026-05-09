"use client";

import * as React from "react";
import { KioskDispatchPlan, UserOption } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, User, Truck, Box, ArrowRight } from "lucide-react";
import { ManualDispatchModal } from "./ManualDispatchModal";

interface DispatchListProps {
    plans: KioskDispatchPlan[];
    users: UserOption[];
    loading: boolean;
    onSuccess?: () => void;
}

export function DispatchList({ plans, users, loading, onSuccess }: DispatchListProps) {
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
                    <div key={i} className="h-[200px] w-full animate-pulse rounded-[2rem] bg-muted/20 dark:bg-muted/5 border border-border/40" />
                ))}
            </div>
        );
    }

    if (plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] bg-muted/5 rounded-[2.5rem] border border-dashed border-border/60 text-center p-12 backdrop-blur-sm">
                <div className="h-20 w-20 bg-muted/20 rounded-[2rem] flex items-center justify-center mb-6">
                    <Box className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">No Dispatch Found</h3>
                <p className="text-muted-foreground max-w-xs font-medium">
                    Try adjusting your search or filters to find what you&apos;re looking for.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
                <Card
                    key={plan.id}
                    className="group relative overflow-hidden backdrop-blur-sm transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.2)] hover:-translate-y-2 rounded-[2rem] bg-card/40 border-border/40 hover:border-emerald-500/50 cursor-pointer"
                    onClick={() => handleCardClick(plan)}
                >
                    {/* Gradient glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <CardContent className="p-8 relative">
                        <div className="flex flex-col h-full justify-between gap-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <Truck className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">DP Number</span>
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tighter transition-colors group-hover:text-emerald-600 truncate">
                                        {plan.doc_no}
                                    </h3>
                                </div>

                                <div className="px-3 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shrink-0">
                                    {plan.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border/40">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center border bg-muted/30 border-border/40 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
                                        <User className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600" />
                                    </div>
                                    <div className="flex flex-col min-w-0 leading-tight">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Personnel</span>
                                        <span className="text-sm font-black text-foreground/90 truncate">{plan.driver_name}</span>
                                        {plan.helpers.length > 0 && (
                                            <span className="text-[10px] font-bold text-muted-foreground/80 truncate">
                                                +{plan.helpers.length} Helpers
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center border bg-muted/30 border-border/40 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/5 transition-all">
                                            <Calendar className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600" />
                                        </div>
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Est. Dispatch</span>
                                            <span className="text-sm font-black text-foreground/90">
                                                {plan.estimated_time_of_dispatch ? format(new Date(plan.estimated_time_of_dispatch), "MMM dd, yyyy") : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 -translate-x-4">
                                        <ArrowRight className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <ManualDispatchModal
                plan={selectedPlan}
                users={users}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSuccess={onSuccess}
            />
        </div>
    );
}
