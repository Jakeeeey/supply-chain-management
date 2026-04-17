"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import vosLogo from '@/components/command-center/assets/vos.png'

export function Preloader() {
    const [isLoading, setIsLoading] = useState(true)
    const pathname = usePathname()

    const [prevPathname, setPrevPathname] = useState(pathname)

    if (pathname !== prevPathname) {
        setPrevPathname(pathname)
        setIsLoading(true)
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false)
        }, 2400) // Loader stays up for 3s to let resources load and bar fill
        return () => clearTimeout(timer)
    }, [pathname])

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    key="preloader"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        {/* Image Logo Wrapper */}
                        <div className="relative w-32 h-32 md:w-40 md:h-40 mb-8 rounded-2xl overflow-hidden p-4 bg-slate-900/[0.02] dark:bg-white/[0.02] border border-slate-900/5 dark:border-white/5 shadow-2xl backdrop-blur-xl">
                            <Image
                                src={vosLogo}
                                alt="VOS Logo"
                                fill
                                className="object-contain p-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                priority
                            />
                            {/* Sweeping Flare */}
                            <motion.div
                                animate={{ x: ["-150%", "250%"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
                                className="absolute inset-0 z-20 w-1/3 bg-gradient-to-r from-transparent via-slate-900/10 dark:via-white/10 to-transparent skew-x-[-20deg]"
                            />
                        </div>

                        {/* Title Text */}
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white"
                        >
                            VOS-<span className="text-cyan-500">WEB</span>
                        </motion.h1>

                        {/* Progress Bar Container */}
                        <div className="mt-10 relative w-64 h-1 bg-slate-900/5 dark:bg-white/5 rounded-full overflow-hidden border border-slate-900/5 dark:border-white/5">
                            <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute left-0 top-0 h-full bg-linear-to-r from-cyan-500 to-indigo-500"
                            />
                        </div>

                        {/* Telemetry Log */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-4 flex gap-2 text-[9px] font-mono text-slate-900/40 dark:text-white/30 uppercase tracking-widest font-bold"
                        >
                            <span>Loading Workspace Assets</span>
                            <motion.span
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                ...
                            </motion.span>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
