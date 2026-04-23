"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    LayoutDashboard, 
    Binary, 
    Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Subsystem } from "@/modules/cms/types/subsystems"

interface CommandSidebarProps {
    activePanel: number
    onPanelSelect: (index: number) => void
    subsystems: Subsystem[]
}

export function CommandSidebar({ activePanel, onPanelSelect, subsystems }: CommandSidebarProps) {

    const navItems = [
        { icon: LayoutDashboard, label: "HERO", color: "text-slate-400", accent: "slate" },
        ...subsystems.map(sub => ({
            icon: sub.icon,
            label: sub.id,
            color: sub.accent === "cyan" ? "text-cyan-500" :
                   sub.accent === "emerald" ? "text-emerald-500" :
                   sub.accent === "amber" ? "text-amber-500" :
                   sub.accent === "indigo" ? "text-indigo-500" :
                   sub.accent === "violet" ? "text-violet-500" : "text-rose-500",
            accent: sub.accent
        })),
        { icon: Binary, label: "CORE", color: "text-slate-400", accent: "slate" },
    ]

    return (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center gap-6 py-8 px-3 rounded-[2.5rem] border border-slate-200/20 dark:border-white/5 bg-white/20 dark:bg-slate-900/40 backdrop-blur-3xl shadow-2xl overflow-visible">
            
            {/* Logo/System Status Header */}
            <div className="flex flex-col items-center gap-1 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
                </div>
                <div className="h-4 flex items-center">
                    <span className="text-[7px] font-black tracking-[0.3em] text-cyan-500/60 uppercase">VOS-OS</span>
                </div>
            </div>

            {/* Vertical Rail Border Accent */}
            <div className="absolute left-1/2 -translate-x-1/2 top-24 bottom-32 w-px bg-linear-to-b from-transparent via-slate-200/30 dark:via-white/10 to-transparent" />

            {/* Navigation Items */}
            <div className="flex flex-col gap-5 relative z-10">
                {navItems.map((item, i) => {
                    const isActive = activePanel === i
                    
                    return (
                        <motion.button
                            key={item.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => onPanelSelect(i)}
                            className="group relative flex items-center justify-center"
                        >
                            {/* Active Indicator Glow (Left Rail) */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div 
                                        layoutId="sidebar-indicator"
                                        className="absolute -left-6 w-1 h-8 rounded-r-full bg-cyan-500 shadow-[2px_0_15px_rgba(6,182,212,0.8)]"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </AnimatePresence>

                            <div className={cn(
                                "relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500",
                                isActive 
                                    ? "bg-cyan-500/20 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]" 
                                    : "bg-slate-500/5 dark:bg-white/5 border border-transparent hover:border-slate-200/50 dark:hover:border-white/20 hover:bg-slate-500/10 dark:hover:bg-white/10"
                            )}>
                                <item.icon className={cn(
                                    "w-5 h-5 transition-all duration-300",
                                    isActive ? item.color : "text-slate-400 dark:text-white/30 group-hover:scale-110",
                                    !isActive && `group-hover:${item.color}`
                                )} />

                                {/* Scanning Line Animation (only on active) */}
                                {isActive && (
                                    <motion.div 
                                        initial={{ top: "0%" }}
                                        animate={{ top: "100%" }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-x-0 h-px bg-cyan-500/40 blur-[1px] z-20 pointer-events-none"
                                    />
                                )}
                            </div>

                            {/* Hover Tooltip */}
                            <div className="absolute left-16 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap shadow-xl">
                                {item.label}
                                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-8 border-transparent border-r-slate-900 dark:border-r-white" />
                            </div>
                        </motion.button>
                    )
                })}
            </div>

        </div>
    )
}
