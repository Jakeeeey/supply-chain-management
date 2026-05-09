"use client"

import * as React from "react"
// import { motion } from "framer-motion"
import { TerminalUnit } from "./TerminalUnit"
import { GlassCard } from "./GlassCard"
import { HardDrive, Truck, Box, Briefcase, Cpu, Cloud, Database, Network } from "lucide-react"

const SUBSYSTEMS = [
    { label: "Supply_Node", value: "88.2%", icon: HardDrive, progress: 88, status: "active" as const },
    { label: "Production_Core", value: "92.5%", icon: Cpu, progress: 92, status: "active" as const },
    { label: "Logistics_Relay", value: "74.1%", icon: Truck, progress: 74, status: "warning" as const },
    { label: "Inventory_Sync", value: "99.9%", icon: Box, progress: 100, status: "active" as const },
    { label: "Project_Exec", value: "62.4%", icon: Briefcase, progress: 62, status: "active" as const },
    { label: "Cloud_Compute", value: "12.4ms", icon: Cloud, progress: 85, status: "active" as const },
    { label: "Database_Load", value: "Active", icon: Database, progress: 34, status: "idle" as const },
    { label: "Network_Grid", value: "Stable", icon: Network, progress: 98, status: "active" as const },
]

export function OperationsOrchestrator() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBSYSTEMS.map((sys, i) => (
                <GlassCard key={sys.label} accent={sys.status === 'warning' ? 'rose' : 'cyan'}>
                    <div className="p-1">
                        <TerminalUnit 
                            label={sys.label}
                            value={sys.value}
                            progress={sys.progress}
                            status={sys.status}
                            subtext={`NODE_${i + 10}4`}
                        />
                    </div>
                </GlassCard>
            ))}
            
            {/* Extended Status Card */}
            <GlassCard className="lg:col-span-2 p-5 flex flex-col justify-between" accent="indigo">
                <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                        <h4 className="text-[10px] font-black font-mono text-slate-700 dark:text-white uppercase tracking-widest">Global_Orchestrator</h4>
                        <p className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">Cluster status: OPERATIONAL</p>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map(b => (
                            <div key={b} className="w-1 h-3 rounded bg-cyan-500/50 animate-pulse" style={{ animationDelay: `${b * 0.2}s` }} />
                        ))}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded bg-slate-500/5 dark:bg-white/5 border border-slate-500/10 dark:border-white/10">
                        <p className="text-[8px] font-mono text-slate-500 dark:text-white/20 uppercase">Total Threads</p>
                        <p className="text-xl font-mono font-black text-indigo-500 tracking-tighter">1,024</p>
                    </div>
                    <div className="p-3 rounded bg-slate-500/5 dark:bg-white/5 border border-slate-500/10 dark:border-white/10">
                        <p className="text-[8px] font-mono text-slate-500 dark:text-white/20 uppercase">Core Load</p>
                        <p className="text-xl font-mono font-black text-rose-500 tracking-tighter">42.8%</p>
                    </div>
                </div>
            </GlassCard>
            
            <GlassCard className="lg:col-span-2 p-5 flex items-center gap-6" accent="emerald">
                <div className="flex-1 space-y-4">
                    <div>
                        <h4 className="text-[10px] font-black font-mono text-slate-700 dark:text-white uppercase tracking-widest">Efficiency_Report</h4>
                        <p className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">Optimized for enterprise scale</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-mono font-black text-emerald-500">SYNC_COMPLETE</p>
                            <p className="text-[9px] font-mono text-slate-400 dark:text-white/20">All nodes integrated</p>
                        </div>
                    </div>
                </div>
                <div className="hidden sm:block">
                    <svg width="60" height="60" viewBox="0 0 100 100" className="opacity-40">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="180 251" className="text-emerald-500" />
                    </svg>
                </div>
            </GlassCard>
        </div>
    )
}
