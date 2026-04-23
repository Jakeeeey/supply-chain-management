"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

const AUDIT_EVENTS = [
    { type: "PAYROLL", action: "BATCH_APPROVED", id: "PR-204" },
    { type: "ASSET", action: "DISPOSED_FAIL", id: "AS-991" },
    { type: "INVOICE", action: "VOID_AUTH", id: "IV-442" },
    { type: "SYSTEM", action: "RBAC_UPDATE", id: "SYS-01" },
    { type: "CRM", action: "LIMIT_RECYCLED", id: "CL-332" },
]

export function MatrixAuditLog() {
    const [events, setEvents] = React.useState(AUDIT_EVENTS)

    React.useEffect(() => {
        const interval = setInterval(() => {
            setEvents(prev => {
                const newEvent = {
                    ...AUDIT_EVENTS[Math.floor(Math.random() * AUDIT_EVENTS.length)],
                    time: new Date().toLocaleTimeString([], { hour12: false })
                }
                return [newEvent, ...prev.slice(0, 5)]
            })
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="space-y-4 font-mono">
            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Real_Time_Audit_Relay</h4>
            
            <div className="h-[200px] overflow-hidden flex flex-col gap-2 relative">
                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none opacity-50" />
                <AnimatePresence initial={false}>
                    {events.map((event, i) => (
                        <motion.div
                            key={`${event.id}-${i}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="text-[9px] flex items-center gap-3 py-1 group border-l border-white/5 pl-3 transition-colors hover:bg-rose-500/5 hover:border-rose-500/30"
                        >
                            <span className="text-slate-400 dark:text-white/20" suppressHydrationWarning>[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                            <span className="text-rose-500 font-bold p-0.5 rounded bg-rose-500/10 border border-rose-500/20">{event.type}</span>
                            <span className="text-slate-700 dark:text-white/60">{event.action}</span>
                            <span className="text-cyan-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">{event.id}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none opacity-50" />
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-500/10 dark:border-white/5">
                <span className="text-[9px] text-slate-500 dark:text-white/40 uppercase">Assurance_Relay_Active</span>
                <div className="flex gap-1 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-1 h-1 rounded-full bg-rose-500" />
                    ))}
                </div>
            </div>
        </div>
    )
}
