"use client";

import React from "react";
import { Clock, PlayCircle, CheckCircle2, ShieldCheck, ListOrdered, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatusSummaryCardsProps {
    globalCounts?: {
        [key: string]: any;
        page?: {
            totalElements: number;
            totalPages: number;
            number: number;
        };
    };
    currentFilter: string;
    onFilterChange: (status: string) => void;
}

export function StatusSummaryCards({ globalCounts = {}, currentFilter, onFilterChange }: StatusSummaryCardsProps) {
    const statuses = [
        { label: "All", icon: ListOrdered, color: "text-zinc-400", glow: "group-hover:shadow-zinc-500/20" },
        { label: "Pending", icon: Clock, color: "text-amber-500", glow: "group-hover:shadow-amber-500/20" },
        { label: "Picking", icon: PlayCircle, color: "text-blue-500", glow: "group-hover:shadow-blue-500/20" },
        { label: "Picked", icon: CheckCircle2, color: "text-emerald-500", glow: "group-hover:shadow-emerald-500/20" },
        { label: "Audited", icon: ShieldCheck, color: "text-purple-500", glow: "group-hover:shadow-purple-500/20" },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Responsive Grid: 2 cols on mobile, 3 on tablet, 5 on desktop */}
            {statuses.map((stat) => {
                const isActive = currentFilter === stat.label;

                const count = stat.label === "All"
                    ? (globalCounts.page?.totalElements ?? globalCounts["All"] ?? 0)
                    : (globalCounts[stat.label] ?? 0);

                return (
                    <Card
                        key={stat.label}
                        onClick={() => onFilterChange(stat.label)}
                        className={cn(
                            "relative overflow-hidden cursor-pointer transition-all duration-500 group border-none rounded-xl sm:rounded-2xl",
                            isActive
                                ? "bg-card shadow-[0_15px_30px_-10px_rgba(0,0,0,0.3)] scale-[1.02] ring-1 ring-primary/40"
                                : "bg-card/40 backdrop-blur-sm hover:bg-card/60"
                        )}
                    >
                        {isActive && (
                            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                        )}

                        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 relative z-10">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-500 shadow-xl",
                                    isActive ? "bg-primary text-primary-foreground rotate-6" : `bg-muted/50 ${stat.color} group-hover:rotate-12`,
                                    stat.glow
                                )}>
                                    <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5px]" />
                                </div>
                                {isActive && <ArrowUpRight className="h-3 w-3 text-primary" />}
                            </div>

                            <div className="space-y-0 text-left">
                                <p className={cn(
                                    "text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em]",
                                    isActive ? "text-primary" : "text-muted-foreground opacity-50"
                                )}>
                                    {stat.label}
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <h3 className="text-xl sm:text-2xl font-black tracking-tighter tabular-nums truncate">
                                        {count.toLocaleString()}
                                    </h3>
                                    <span className="hidden sm:inline-block text-[8px] font-bold text-muted-foreground uppercase opacity-40">Batches</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}