"use client"

import * as React from "react"
// import { motion } from "framer-motion"
import { GlassCard } from "./GlassCard"
import { Sparkline } from "./Sparkline"
import { Activity, ShieldCheck, Target, Zap } from "lucide-react"

const STATS = [
    {
        label: "Active Employees",
        value: "2,840",
        change: "+128",
        icon: Activity,
        accent: "cyan" as const,
        data: [40, 45, 42, 50, 48, 55, 60, 58, 65, 70]
    },
    {
        label: "Audit Compliance",
        value: "99.8%",
        change: "+0.3%",
        icon: ShieldCheck,
        accent: "indigo" as const,
        data: [90, 92, 91, 95, 94, 98, 97, 99, 99, 100]
    },
    {
        label: "Inventory Accuracy",
        value: "97.4%",
        change: "+1.2%",
        icon: Target,
        accent: "emerald" as const,
        data: [80, 82, 85, 83, 88, 90, 91, 94, 96, 97]
    },
    {
        label: "API Response",
        value: "12ms",
        change: "-4ms",
        icon: Zap,
        accent: "rose" as const,
        data: [20, 18, 22, 15, 12, 10, 8, 12, 10, 8]
    }
]

export function MissionStatsGrid() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
                <GlassCard 
                    key={stat.label} 
                    accent={stat.accent} 
                    className="p-5"
                    transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                >
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="p-2 rounded-lg bg-slate-500/5 dark:bg-white/5 border border-slate-500/10 dark:border-white/10">
                                <stat.icon className="w-5 h-5 text-slate-600 dark:text-white/60" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-mono text-slate-500 dark:text-white/40 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-2xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Sparkline data={stat.data} accent={stat.accent} />
                            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-tighter">
                                <span className={stat.change.startsWith('+') ? "text-emerald-500" : "text-rose-500"}>
                                    {stat.change} vs prev. cycle
                                </span>
                                <span className="text-slate-400 dark:text-white/20">Telemetry Active</span>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            ))}
        </div>
    )
}
