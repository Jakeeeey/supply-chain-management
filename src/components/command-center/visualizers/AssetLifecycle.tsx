"use client"

import * as React from "react"
// import { motion } from "framer-motion"
import { ChevronRight, ShieldCheck, Hammer, RotateCcw, Trash2 } from "lucide-react"

export function AssetLifecycle() {
    const steps = [
        { label: "Acquire", icon: ShieldCheck, status: "complete" },
        { label: "Deploy", icon: RotateCcw, status: "complete" },
        { label: "Maintain", icon: Hammer, status: "active" },
        { label: "Dispose", icon: Trash2, status: "pending" },
    ]

    return (
        <div className="space-y-4">
            <h4 className="text-[10px] font-black font-mono text-slate-500 dark:text-white/40 uppercase tracking-[0.2em]">Asset_Lifecycle_Cycle</h4>
            
            <div className="flex items-center justify-between gap-1">
                {steps.map((step, i) => (
                    <React.Fragment key={step.label}>
                        <div className="flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                                step.status === "complete" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" :
                                step.status === "active" ? "bg-emerald-500 border-emerald-500 text-white animate-pulse" :
                                "bg-slate-500/5 border-slate-500/10 text-slate-500/40"
                            }`}>
                                <step.icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[8px] font-mono font-bold uppercase ${
                                step.status === "pending" ? "text-slate-500/40" : "text-slate-500 dark:text-white/60"
                            }`}>{step.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-slate-500/20 mb-6" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-500/5 dark:bg-white/5 border border-slate-500/10 dark:border-white/10">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase mb-2">
                    <span>Active_Monitoring</span>
                    <span>9/12 Nodes</span>
                </div>
                <div className="flex gap-1">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-4 flex-1 rounded-sm ${
                                i < 9 ? "bg-emerald-500/50" : "bg-slate-500/10 dark:bg-white/5"
                            }`} 
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
