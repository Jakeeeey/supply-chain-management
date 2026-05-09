"use client"

import * as React from "react"
import { HTMLMotionProps, motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode
    accent?: "cyan" | "indigo" | "rose" | "emerald" | "amber" | "violet"
}

export function GlassCard({ 
    children, 
    className, 
    accent = "cyan", 
    initial = { opacity: 0, y: 30 },
    whileInView = { opacity: 1, y: 0 },
    viewport = { once: true, margin: "-20px" },
    transition = { duration: 0.5, ease: "easeOut" },
    ...props 
}: GlassCardProps) {

    const accentConfigs = {
        cyan: {
            glow: "from-cyan-600/10 dark:from-cyan-400/20",
            border: "group-hover:border-cyan-500/30",
            orb: "bg-cyan-600 dark:bg-cyan-400"
        },
        indigo: {
            glow: "from-indigo-600/10 dark:from-indigo-400/20",
            border: "group-hover:border-indigo-500/30",
            orb: "bg-indigo-600 dark:bg-indigo-400"
        },
        rose: {
            glow: "from-rose-600/10 dark:from-rose-400/20",
            border: "group-hover:border-rose-500/30",
            orb: "bg-rose-600 dark:bg-rose-400"
        },
        emerald: {
            glow: "from-emerald-600/10 dark:from-emerald-400/20",
            border: "group-hover:border-emerald-500/30",
            orb: "bg-emerald-600 dark:bg-emerald-400"
        },
        amber: {
            glow: "from-amber-600/10 dark:from-amber-400/20",
            border: "group-hover:border-amber-500/30",
            orb: "bg-amber-600 dark:bg-amber-400"
        },
        violet: {
            glow: "from-violet-600/10 dark:from-violet-400/20",
            border: "group-hover:border-violet-500/30",
            orb: "bg-violet-600 dark:bg-violet-400"
        },
    }

    const config = accentConfigs[accent]

    return (
        <motion.div 
            initial={initial}
            whileInView={whileInView}
            viewport={viewport}
            transition={transition}
            className={cn(
                "relative group overflow-hidden rounded-3xl transition-all duration-700",
                "bg-radial-gradient from-white/40 to-white/10 dark:from-slate-950/60 dark:to-slate-950/40",
                "backdrop-blur-[16px] will-change-transform",
                "border border-slate-900/10 dark:border-white/10",
                "shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_0_rgba(0,0,0,0.4)]",
                "hover:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8)]",
                "hover:scale-[1.02] hover:bg-white/60 dark:hover:bg-slate-900/70",
                config.border,
                className
            )}
            {...props}
        >
            {/* Glossy Reflection (Top-Left) */}
            <div className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Inner Volumetric Lighting / Rim Light (Removed secondary ring) */}
            <div className="absolute inset-px pointer-events-none rounded-3xl z-20" />
            
            {/* Ambient Base Glow */}
            <div className={cn(
                "absolute -inset-px bg-linear-to-br opacity-10 dark:opacity-30 blur-2xl transition-opacity duration-700 pointer-events-none group-hover:opacity-30",
                config.glow,
                "to-transparent"
            )} />

            {/* Accent Highlight (Floating Orb) */}
            <motion.div 
                animate={{
                    x: [0, 20, 0],
                    y: [0, -20, 0],
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className={cn(
                    "absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[64px] opacity-10 transition-opacity duration-1000 group-hover:opacity-30",
                    config.orb
                )} 
            />

            <div className="relative z-10 h-full">
                {children}
            </div>
        </motion.div>
    )
}
