"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const NODES = [
    { id: "CORE", x: 50, y: 50, label: "OMNI-VOS CORE", status: "online", accent: "cyan" },
    { id: "OPS", x: 20, y: 30, label: "OPERATIONS", status: "online", accent: "cyan" },
    { id: "FIN", x: 80, y: 30, label: "FINANCE", status: "online", accent: "indigo" },
    { id: "CUST", x: 20, y: 70, label: "CUSTOMER NEXUS", status: "warning", accent: "rose" },
    { id: "GOV", x: 80, y: 70, label: "GOVERNANCE", status: "online", accent: "emerald" },
]

const CONNECTIONS = [
    ["CORE", "OPS"],
    ["CORE", "FIN"],
    ["CORE", "CUST"],
    ["CORE", "GOV"],
    ["OPS", "CUST"],
    ["FIN", "GOV"],
]

export function GlobalHealthViz() {
    return (
        <div className="relative w-full h-[400px] border border-slate-500/10 dark:border-white/5 rounded-xl bg-slate-500/5 dark:bg-white/[0.02] overflow-hidden">
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {CONNECTIONS.map(([fromId, toId], i) => {
                    const from = NODES.find(n => n.id === fromId)!
                    const to = NODES.find(n => n.id === toId)!
                    return (
                        <motion.line
                            key={`${fromId}-${toId}`}
                            x1={`${from.x}%`}
                            y1={`${from.y}%`}
                            x2={`${to.x}%`}
                            y2={`${to.y}%`}
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            className="text-slate-500/20 dark:text-white/10"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, delay: i * 0.2 }}
                        />
                    )
                })}
            </svg>

            {NODES.map((node) => (
                <motion.div
                    key={node.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200 }}
                >
                    <div className="relative group cursor-crosshair">
                        {/* Orbiting Ring */}
                        <motion.div 
                            className={cn(
                                "absolute -inset-4 rounded-full border border-dashed opacity-20",
                                node.accent === "cyan" ? "border-cyan-500" :
                                node.accent === "indigo" ? "border-indigo-500" :
                                node.accent === "rose" ? "border-rose-500" : "border-emerald-500"
                            )}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        />
                        
                        <div className={cn(
                            "w-12 h-12 rounded-full border-2 flex items-center justify-center bg-white dark:bg-slate-950 backdrop-blur-xl shadow-lg transition-transform group-hover:scale-110",
                            node.accent === "cyan" ? "border-cyan-500 text-cyan-500" :
                            node.accent === "indigo" ? "border-indigo-500 text-indigo-500" :
                            node.accent === "rose" ? "border-rose-500 text-rose-500" : "border-emerald-500 text-emerald-500"
                        )}>
                            <span className="text-[10px] font-black">{node.id}</span>
                        </div>

                        {/* Tooltip-style Label */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-slate-900 text-white text-[10px] font-mono px-2 py-1 rounded border border-white/10 uppercase tracking-widest">
                                {node.label} • {node.status}
                            </div>
                        </div>
                        
                        {/* Glow effect */}
                        <div className={cn(
                            "absolute -inset-2 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity",
                            node.accent === "cyan" ? "bg-cyan-500" :
                            node.accent === "indigo" ? "bg-indigo-500" :
                            node.accent === "rose" ? "bg-rose-500" : "bg-emerald-500"
                        )} />
                    </div>
                </motion.div>
            ))}

            <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">LIVE_CORE_LINK active</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">Latency spike in NEXUS_04</span>
                </div>
            </div>
            
            <div className="absolute top-4 right-4 text-right">
                <p className="text-[8px] font-mono text-slate-500 dark:text-white/20 uppercase tracking-tighter">GLOBAL_HEALTH_VIZ_PREMIUM_V3</p>
                <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-white/40 uppercase">9 Nodes Analyzed</p>
            </div>
        </div>
    )
}
