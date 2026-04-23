"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TerminalUnitProps {
    label: string
    value: string | number
    progress?: number
    status?: "active" | "warning" | "error" | "idle"
    subtext?: string
}

export function TerminalUnit({
    label,
    value,
    progress,
    status = "active",
    subtext,
}: TerminalUnitProps) {
    const [stamp, setStamp] = React.useState("0000")
    React.useEffect(() => {
        setStamp(new Date().getTime().toString().slice(-4))
    }, [])
    const statusColor = {
        active: "text-cyan-600 dark:text-cyan-400",
        warning: "text-amber-600 dark:text-amber-400",
        error: "text-rose-600 dark:text-rose-400",
        idle: "text-slate-500",
    }[status]

    const bgBarColor = {
        active: "bg-cyan-500/10 dark:bg-cyan-500/20",
        warning: "bg-amber-500/10 dark:bg-amber-500/20",
        error: "bg-rose-500/10 dark:bg-rose-500/20",
        idle: "bg-slate-500/10 dark:bg-slate-500/20",
    }[status]

    const fgBarColor = {
        active: "bg-cyan-500",
        warning: "bg-amber-500",
        error: "bg-rose-500",
        idle: "bg-slate-500",
    }[status]

    return (
        <div className="space-y-1.5 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                    <p className="text-[9px] font-mono font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">{label}</p>
                    <p className={cn("text-base sm:text-lg font-mono font-black tracking-tight", statusColor)}>{value}</p>
                </div>
                {subtext && (
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-mono text-slate-400 dark:text-white/20 uppercase tracking-tighter">{subtext}</p>
                    </div>
                )}
            </div>

            {progress !== undefined && (
                <div className="space-y-1">
                    <div className={cn("h-1 w-full overflow-hidden rounded-full", bgBarColor)}>
                        <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${progress}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            className={cn("h-full", fgBarColor)}
                        />
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-slate-400 dark:text-white/30 uppercase tracking-tighter">
                        <span>L-EXEC: {progress}%</span>
                        <span className="hidden xs:inline">STAMP_{stamp}</span>
                        <span>NODE_SYNC_V4</span>
                    </div>
                </div>
            )}
        </div>
    )
}
