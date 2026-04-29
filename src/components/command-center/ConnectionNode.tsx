"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
    MessageSquare, 
    Link2, 
    UserPlus, 
    Share2,
    Clock
} from "lucide-react"
import { GlassCard } from "./GlassCard"

const FEED_ITEMS = [
    { id: 1, type: "connection", label: "LINK_ESTABLISHED", target: "Enterprise Node_04", time: "14:22:01", icon: Link2, accent: "cyan" },
    { id: 2, type: "engagement", label: "USER_COLLABORATION", target: "User_882", time: "14:20:15", icon: MessageSquare, accent: "indigo" },
    { id: 3, type: "expansion", label: "NODE_SCALING", target: "Global_Sync", time: "14:18:42", icon: UserPlus, accent: "emerald" },
    { id: 4, type: "telemetry", label: "DATA_RELAY", target: "Packet_Alpha", time: "14:15:10", icon: Share2, accent: "rose" },
]

export function ConnectionNode() {
    return (
        <GlassCard className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-500/10 dark:border-white/5 flex items-center justify-between">
                <div>
                    <h3 className="text-[10px] font-black font-mono text-slate-700 dark:text-white uppercase tracking-widest">Connection_Nexus</h3>
                    <p className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">Real-time engagement telemetry</p>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono p-1 rounded bg-slate-500/5 dark:bg-white/5 border border-slate-500/10 dark:border-white/10">
                    <Clock className="w-3 h-3 text-cyan-500" />
                    <span className="text-slate-500 dark:text-white/40 uppercase">UPTIME: 99.9%</span>
                </div>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto max-h-[400px]">
                {FEED_ITEMS.map((item, i) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-4 relative"
                    >
                        {/* Timeline line */}
                        {i !== FEED_ITEMS.length - 1 && (
                            <div className="absolute left-[13px] top-7 bottom-[-15px] w-px bg-slate-500/10 dark:bg-white/5" />
                        )}

                        <div className={`w-7 h-7 rounded flex items-center justify-center bg-slate-500/5 dark:bg-white/5 border border-slate-500/10 dark:border-white/10 flex-shrink-0 relative z-10`}>
                            <item.icon className="w-3.5 h-3.5 text-slate-500 dark:text-white/60" />
                            <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                                item.accent === 'cyan' ? 'bg-cyan-500' : 
                                item.accent === 'indigo' ? 'bg-indigo-500' :
                                item.accent === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4 mb-1">
                                <span className="text-[9px] font-black font-mono text-slate-800 dark:text-white uppercase tracking-wider truncate">{item.label}</span>
                                <span className="text-[9px] font-mono text-slate-400 dark:text-white/20">{item.time}</span>
                            </div>
                            <div className="p-2 rounded bg-slate-500/5 dark:bg-white/[0.02] border border-slate-500/10 dark:border-white/10">
                                <p className="text-[10px] text-slate-600 dark:text-white/60">Target identified: <span className="font-mono text-cyan-600 dark:text-cyan-400">{item.target}</span></p>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(b => (
                                            <div key={b} className={`h-1 w-2 rounded-full ${b <= 3 ? 'bg-cyan-500/50' : 'bg-slate-500/20'}`} />
                                        ))}
                                    </div>
                                    <span className="text-[8px] font-mono text-slate-400 dark:text-white/10 uppercase italic">Encrypted_V4</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="p-4 bg-slate-500/5 dark:bg-white/[0.01] border-t border-slate-500/10 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-mono text-slate-500 dark:text-white/40 uppercase">Global_Engagement_Metric</span>
                    <span className="text-[11px] font-black font-mono text-emerald-500">+12%</span>
                </div>
                <div className="h-1 w-full bg-slate-500/10 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: "75%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-linear-to-r from-cyan-500 to-indigo-500"
                    />
                </div>
            </div>
        </GlassCard>
    )
}
