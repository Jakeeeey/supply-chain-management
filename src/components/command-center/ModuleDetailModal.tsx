"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

export interface ModuleDetailModalProps {
    isOpen: boolean
    onClose: () => void
    moduleName: string
    accent: "cyan" | "indigo" | "rose" | "emerald" | "amber" | "violet"
    data: {
        description: string
        stats: { label: string; value: string; trend?: string }[]
    }
}

export function ModuleDetailModal({ isOpen, onClose, moduleName, accent, data }: ModuleDetailModalProps) {
    const accentColors = {
        cyan: "text-cyan-500 border-cyan-500/30",
        indigo: "text-indigo-500 border-indigo-500/30",
        rose: "text-rose-500 border-rose-500/30",
        emerald: "text-emerald-500 border-emerald-500/30",
        amber: "text-amber-500 border-amber-500/30",
        violet: "text-violet-500 border-violet-500/30",
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-start justify-between">
                            <div className="space-y-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${accentColors[accent]} bg-white/5`}>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{moduleName}</span>
                                </div>
                                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">System Telemetry</h2>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-8">
                            <p className="text-lg text-white/60 leading-relaxed italic">
                                &quot;{data.description}&quot;
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {data.stats.map((stat, i) => (
                                    <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition-colors">
                                        <p className="text-[10px] font-mono text-white/20 uppercase mb-2 tracking-widest">{stat.label}</p>
                                        <div className="flex items-baseline gap-2">
                                            <p className={`text-3xl font-mono font-black tracking-tighter text-white underline underline-offset-4 decoration-2 decoration-${accent}-500/50`}>
                                                {stat.value}
                                            </p>
                                            {stat.trend && (
                                                <span className="text-[10px] font-mono text-emerald-500 font-bold">{stat.trend}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-white/20 uppercase uppercase tracking-[0.3em]">Integrity_Check: Stable</span>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={`w-12 h-1 rounded-full bg-white/${(5-i)*5}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
