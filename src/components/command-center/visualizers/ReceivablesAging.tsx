"use client"

import * as React from "react"
import { motion } from "framer-motion"

export function ReceivablesAging() {
    const data = [
        { label: "Current", val: 5500000, col: "bg-indigo-500", perc: 65 },
        { label: "30 Days", val: 1800000, col: "bg-indigo-400/60", perc: 21 },
        { label: "60 Days", val: 800000, col: "bg-indigo-300/40", perc: 10 },
        { label: "90+ Days", val: 300000, col: "bg-rose-500/80", perc: 4 },
    ]

    return (
        <div className="space-y-6">
            <h4 className="text-[10px] font-black font-mono text-slate-500 dark:text-white/40 uppercase tracking-[0.2em]">Receivables_Aging_Report</h4>
            
            <div className="space-y-4">
                {data.map((item, i) => (
                    <div key={item.label} className="space-y-1.5 px-3 py-2 rounded-xl bg-slate-500/5 dark:bg-white/[0.02] border border-slate-500/5 dark:border-white/5">
                        <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-slate-500 dark:text-white/60 font-black">{item.label}</span>
                            <span className="text-indigo-500 font-black">₱{(item.val / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="h-1 w-full bg-slate-500/10 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                className={item.col}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${item.perc}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-slate-500/10 dark:border-white/5">
                <div className="space-y-0.5">
                    <p className="text-[9px] font-mono text-slate-500 dark:text-white/20 uppercase">Total_Receivables</p>
                    <p className="text-xl font-mono font-black text-indigo-500 tracking-tighter">₱8.4M</p>
                </div>
                <div className="text-right space-y-0.5">
                    <p className="text-[9px] font-mono text-slate-500 dark:text-white/20 uppercase text-right">Risk_Exposure</p>
                    <p className="text-xs font-mono font-black text-rose-500 tracking-tighter">LOW</p>
                </div>
            </div>
        </div>
    )
}
