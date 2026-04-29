"use client"

import * as React from "react"
// import { motion } from "framer-motion"
import { 
    Search, 
    Filter, 
    Download, 
    ChevronRight, 
    MoreHorizontal,
    ArrowUpRight,
    Play
} from "lucide-react"
import { GlassCard } from "./GlassCard"
import { cn } from "@/lib/utils"

const MOCK_DATA = [
    { id: "TX-9021", entity: "Supply Chain", metric: "Efficiency", value: "88%", status: "active", stamp: "12:04:22" },
    { id: "TX-8832", entity: "Human Capital", metric: "Utilization", value: "94%", status: "stable", stamp: "12:03:51" },
    { id: "TX-7742", entity: "Finance Node", metric: "Liquidity", value: "1.2M", status: "active", stamp: "12:02:10" },
    { id: "TX-6651", entity: "Procurement", metric: "Lead Time", value: "4.2d", status: "warning", stamp: "11:59:44" },
    { id: "TX-5540", entity: "Delivery Hub", metric: "Latency", value: "0.2s", status: "active", stamp: "11:55:12" },
]

export function AnalyticsWorkbench() {
    return (
        <GlassCard className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-500/10 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-500/10 dark:bg-white/5">
                        <Play className="w-3 h-3 text-cyan-500" />
                        <span className="text-[10px] font-black font-mono text-slate-700 dark:text-white uppercase tracking-widest">Workbench_v4</span>
                    </div>
                    <div className="h-4 w-px bg-slate-500/20" />
                    <nav className="flex items-center gap-1 text-[9px] font-mono text-slate-500 dark:text-white/40">
                        <span>ROOT</span>
                        <ChevronRight className="w-2 h-2" />
                        <span className="text-cyan-500 font-bold">ANALYTICS</span>
                    </nav>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="SEARCH_QUERY..." 
                            className="bg-slate-500/5 dark:bg-white/5 border border-slate-500/10 dark:border-white/10 rounded px-7 py-1 text-[9px] font-mono focus:outline-none focus:border-cyan-500/50 w-[150px] transition-all"
                        />
                    </div>
                    <button className="p-1.5 rounded hover:bg-slate-500/10 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-500/10">
                        <Filter className="w-3 h-3 text-slate-500" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-slate-500/10 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-500/10">
                        <Download className="w-3 h-3 text-slate-500" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="border-b border-slate-500/10 dark:border-white/5">
                            <th className="px-4 py-3 text-[9px] font-bold font-mono text-slate-500 dark:text-white/40 uppercase tracking-widest">ID::REF</th>
                            <th className="px-4 py-3 text-[9px] font-bold font-mono text-slate-500 dark:text-white/40 uppercase tracking-widest">ENTITY_MODULE</th>
                            <th className="px-4 py-3 text-[9px] font-bold font-mono text-slate-500 dark:text-white/40 uppercase tracking-widest">METRIC_TYPE</th>
                            <th className="px-4 py-3 text-[9px] font-bold font-mono text-slate-500 dark:text-white/40 uppercase tracking-widest">VALUE_OUT</th>
                            <th className="px-4 py-3 text-[9px] font-bold font-mono text-slate-500 dark:text-white/40 uppercase tracking-widest">STATUS</th>
                            <th className="px-4 py-3 text-[9px] font-bold font-mono text-slate-500 dark:text-white/40 uppercase tracking-widest text-right">STAMP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/5 dark:divide-white/[0.02]">
                        {MOCK_DATA.map((row) => (
                            <tr key={row.id} className="group hover:bg-slate-500/5 dark:hover:bg-white/[0.01] transition-colors cursor-pointer">
                                <td className="px-4 py-3 text-[10px] font-mono font-black text-slate-700 dark:text-white/80">{row.id}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase">{row.entity}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-[10px] font-mono text-slate-500 dark:text-white/40">{row.metric}</td>
                                <td className="px-4 py-3 font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">{row.value}</td>
                                <td className="px-4 py-3">
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                        row.status === 'active' ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" :
                                        row.status === 'stable' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                        "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    )}>
                                        <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                                        {row.status}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2 text-[9px] font-mono text-slate-400 dark:text-white/20">
                                        <span>{row.stamp}</span>
                                        <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-500/10 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <p className="text-[9px] font-mono text-slate-500 dark:text-white/20 uppercase tracking-tighter">DISPLAYING_ROWS: 5/5</p>
                    <div className="h-3 w-px bg-slate-500/20" />
                    <p className="text-[9px] font-mono text-slate-500 dark:text-white/20 uppercase tracking-tighter">DATA_INTEGRITY: 100%</p>
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3].map((n) => (
                        <button key={n} className={cn(
                            "w-5 h-5 flex items-center justify-center rounded text-[9px] font-mono border transition-colors",
                            n === 1 ? "bg-cyan-500 text-white border-cyan-500" : "border-slate-500/10 dark:border-white/10 text-slate-500 hover:bg-slate-500/10"
                        )}>
                            {n}
                        </button>
                    ))}
                    <button className="w-5 h-5 flex items-center justify-center rounded text-[9px] font-mono border border-slate-500/10 dark:border-white/10 text-slate-500 hover:bg-slate-500/10">
                        <MoreHorizontal className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </GlassCard>
    )
}
