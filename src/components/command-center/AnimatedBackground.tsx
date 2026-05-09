"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function AnimatedBackground({ className }: { className?: string }) {
    return (
        <div className={cn("fixed inset-0 -z-10 overflow-hidden pointer-events-none", className)}>
            {/* Base Layer */}
            <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 transition-colors duration-1000" />
            <div className="absolute inset-0 bg-indigo-50/20 dark:bg-transparent" />
            <div className="absolute inset-0 bg-slate-900/[0.02] dark:bg-transparent" /> {/* Subtle Dark Ambient Drift */}
            
            {/* Animated Mesh Blobs - Prismatic Spectrum */}
            <div className="absolute inset-0 z-0">
                {/* Darker Anchor Blob (NEW) */}
                <motion.div
                    animate={{ x: [0, 80, 0], y: [0, 40, 0], opacity: [0.02, 0.05, 0.02] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/3 left-1/3 w-[40%] h-[40%] bg-slate-900/10 dark:bg-transparent blur-[160px] rounded-full"
                />

                {/* Cyan Blob (Cool) */}
                <motion.div
                    animate={{ x: [0, 150, -80, 0], y: [0, -80, 150, 0], scale: [1, 1.3, 0.8, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-600/10 dark:bg-cyan-500/40 blur-[120px] rounded-full"
                />

                {/* Indigo Blob (Cool) */}
                <motion.div
                    animate={{ x: [0, -150, 80, 0], y: [0, 150, -80, 0], scale: [1, 0.8, 1.3, 1] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/10 dark:bg-indigo-500/40 blur-[130px] rounded-full"
                />

                {/* Rose Blob (Warm Refraction) */}
                <motion.div
                    animate={{ x: [-100, 100, -100], y: [50, -50, 50], opacity: [0.03, 0.08, 0.03] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[10%] right-[10%] w-[50%] h-[50%] bg-rose-600/10 dark:bg-rose-500/20 blur-[140px] rounded-full"
                />

                {/* Amber Blob (Warm Refraction) */}
                <motion.div
                    animate={{ x: [80, -80, 80], y: [-40, 40, -40], opacity: [0.03, 0.07, 0.03] }}
                    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[20%] left-[5%] w-[45%] h-[45%] bg-amber-600/8 dark:bg-amber-500/15 blur-[120px] rounded-full"
                />
            </div>

            {/* Technical Mesh Layer (Blueprint Geometry) */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.35] dark:opacity-[0.6]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="technical-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-slate-900/15 dark:text-cyan-500/20" />
                        <circle cx="0" cy="0" r="1.5" className="fill-slate-900/25 dark:fill-cyan-500/30" />
                    </pattern>
                    <linearGradient id="mesh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" className="text-cyan-700 dark:text-cyan-400" />
                        <stop offset="50%" stopColor="currentColor" className="text-rose-600/50 dark:text-rose-400/50" />
                        <stop offset="100%" stopColor="currentColor" className="text-indigo-700 dark:text-indigo-400" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#technical-grid)" />
                
                {/* Secondary HUD Geometric Accents */}
                <motion.circle 
                    cx="85%" cy="15%" r="120" 
                    fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 8"
                    className="text-slate-900/15 dark:text-white/10"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                />
                <motion.circle 
                    cx="15%" cy="85%" r="180" 
                    fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="20 40"
                    className="text-slate-900/15 dark:text-white/10"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                />

                {/* Animated Scanner Lines */}
                <motion.line
                    x1="0" y1="0" x2="100%" y2="0"
                    stroke="url(#mesh-grad)"
                    strokeWidth="2"
                    strokeDasharray="200, 1000"
                    animate={{ y: ["0%", "100%", "0%"] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
            </svg>

            {/* Floating Glass Shards (Depth) */}
            <div className="absolute inset-0">
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            y: [0, -40, 0],
                            x: [0, 20, 0],
                            opacity: [0.02, 0.05, 0.02],
                            rotate: [0, 10, 0]
                        }}
                        transition={{
                            duration: 10 + i * 2,
                            repeat: Infinity,
                            delay: i * 3,
                            ease: "easeInOut"
                        }}
                        className="absolute w-32 h-64 bg-white/20 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 dark:border-white/5"
                        style={{
                            top: `${20 + i * 15}%`,
                            left: `${10 + (i * 20) % 80}%`,
                            transform: `rotate(${i * 45}deg)`
                        }}
                    />
                ))}
            </div>

            {/* Grain/Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none mix-blend-overlay" 
                 style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />
        </div>
    )
}
