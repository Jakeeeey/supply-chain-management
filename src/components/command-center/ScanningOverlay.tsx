"use client"

import * as React from "react"
import { motion } from "framer-motion"

export function ScanningOverlay() {
    return (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-[inherit]">
            {/* The Scanning Line */}
            <motion.div 
                animate={{ 
                    top: ["-10%", "110%"],
                    opacity: [0, 1, 1, 0]
                }}
                transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "linear" 
                }}
                className="absolute left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/50 dark:via-cyan-500/30 to-transparent shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            />
            
            {/* Grid Pattern Overlay */}
            <div 
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{ 
                    backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), 
                                     linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                }}
            />
        </div>
    )
}
