"use client"

import * as React from "react"
import { motion } from "framer-motion"

export function InventoryTreadmill() {
    const items = [
        { label: "SKU-902", stock: 85, trigger: 20 },
        { label: "SKU-441", stock: 12, trigger: 25 },
        { label: "SKU-112", stock: 64, trigger: 15 },
        { label: "SKU-883", stock: 92, trigger: 30 },
        { label: "SKU-304", stock: 45, trigger: 10 },
    ]

    return (
        <div className="space-y-4">
            <h4 className="text-[10px] font-black font-mono text-slate-500 dark:text-white/40 uppercase tracking-[0.2em]">Inventory_Treadmill</h4>
            
            <div className="space-y-3">
                {items.map((item, i) => (
                    <div key={item.label} className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-slate-500 dark:text-white/60 font-bold">{item.label}</span>
                            <span className={item.stock < item.trigger ? "text-rose-500 font-black animate-pulse" : "text-amber-500 font-black"}>
                                {item.stock}% {item.stock < item.trigger && "// LOW_STOCK"}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-500/5 dark:bg-white/5 rounded-full overflow-hidden border border-slate-500/5 dark:border-white/5 relative">
                            {/* Trigger Marker */}
                            <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500/40 z-10" 
                                style={{ left: `${item.trigger}%` }} 
                            />
                            
                            <motion.div 
                                className={`h-full ${item.stock < item.trigger ? "bg-rose-500" : "bg-amber-500"}`}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${item.stock}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-500/10 dark:border-white/5">
                <span className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">Global_Turnover</span>
                <span className="text-xs font-black font-mono text-amber-500 tracking-tighter">14.2X / Year</span>
            </div>
        </div>
    )
}
