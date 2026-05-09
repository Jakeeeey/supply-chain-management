"use client"

import * as React from "react"
import { motion } from "framer-motion"

interface SparklineProps {
    data: number[]
    accent?: "cyan" | "indigo" | "rose" | "emerald"
}

export function Sparkline({ data, accent = "cyan" }: SparklineProps) {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min
    
    // Normalize data points to 0-100 range
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100
        const y = 80 - ((d - min) / range) * 60 // Keep some vertical padding
        return `${x},${y}`
    }).join(" ")

    const color = {
        cyan: "#06b6d4",
        indigo: "#6366f1",
        rose: "#f43f5e",
        emerald: "#10b981",
    }[accent]

    return (
        <div className="h-10 w-full overflow-hidden">
            <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
                {/* Area Gradient */}
                <defs>
                    <linearGradient id={`grad-${accent}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Area under the line */}
                <motion.path 
                    d={`M 0,100 L ${points} L 100,100 Z`}
                    fill={`url(#grad-${accent})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                />

                {/* The Sparkline */}
                <motion.polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />
            </svg>
        </div>
    )
}
