"use client"

import * as React from "react"
import { motion } from "framer-motion"

export function LiquidityMeter() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <h4 className="text-[10px] font-black font-mono text-slate-500 dark:text-white/40 uppercase tracking-[0.2em]">Liquidity_Vs_Burn</h4>
                    <span className="text-[10px] font-mono font-black text-emerald-500">OPTIMAL</span>
                </div>
                
                {/* Large Gauge Style Bar */}
                <div className="h-12 relative bg-slate-500/5 dark:bg-white/5 rounded-xl border border-slate-500/10 dark:border-white/10 overflow-hidden group">
                    <motion.div 
                        className="absolute inset-y-0 left-0 bg-emerald-500/20"
                        initial={{ width: 0 }}
                        whileInView={{ width: "75%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-mono text-slate-400 dark:text-white/20 uppercase">Available_Cash</p>
                            <p className="text-xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">₱4.24M</p>
                        </div>
                        <div className="text-right space-y-0.5">
                            <p className="text-[8px] font-mono text-slate-400 dark:text-white/20 uppercase text-right">Burn_Velocity</p>
                            <p className="text-xs font-mono font-black text-rose-500 tracking-tighter">-₱14.2K/D</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: "Reserve", val: "84%", col: "emerald" },
                    { label: "Op_Ex", val: "12%", col: "cyan" },
                    { label: "Assets", val: "4%", col: "indigo" }
                ].map(item => (
                    <div key={item.label} className="p-2 rounded-lg bg-slate-500/5 dark:bg-white/[0.02] border border-slate-500/5 dark:border-white/5">
                        <p className="text-[8px] font-mono text-slate-500 dark:text-white/30 uppercase mb-1">{item.label}</p>
                        <p className={`text-xs font-mono font-black text-${item.col}-500`}>{item.val}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
