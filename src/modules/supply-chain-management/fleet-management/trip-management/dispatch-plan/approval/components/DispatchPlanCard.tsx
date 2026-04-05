"use client"

import React from "react"
import { MapPin, CalendarClock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PostDispatchApprovalDto } from "../types"

const formatCurrency = (val: number) => `₱${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
    plan: PostDispatchApprovalDto;
    onClick: () => void;
}

export function DispatchPlanCard({ plan, onClick }: Props) {
    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col h-full"
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 mb-2 font-black tracking-wider uppercase text-[10px]">
                        {plan.status}
                    </Badge>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{plan.docNo}</h3>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Dispatch</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                        {plan.estimatedTimeOfDispatch ? new Date(plan.estimatedTimeOfDispatch).toLocaleDateString() : 'TBD'}
                    </p>
                </div>
            </div>

            <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0"/>
                    <span className="truncate">Distance: {plan.totalDistance} km</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <CalendarClock className="w-4 h-4 text-slate-400 shrink-0"/>
                    <span>{plan.estimatedTimeOfDispatch ? new Date(plan.estimatedTimeOfDispatch).toLocaleTimeString() : 'TBD'}</span>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Value</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(plan.amount)}
                </p>
            </div>
        </div>
    );
}
