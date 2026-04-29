"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
    CheckCircle2,
    Activity,
    Terminal,
    Link2,
    ShieldCheck
} from "lucide-react"

import { SUBSYSTEMS } from "@/modules/cms/constants/subsystems"

import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/command-center/GlassCard"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function ServicesPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden selection:bg-cyan-500/30">
            {/* Background Auras */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] right-[-5%] w-[40%] h-[40%] bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[20%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10">
                {/* HERO SECTION */}
                <section className="pt-32 pb-24 px-6 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto text-center space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Badge variant="outline" className="px-4 py-1 rounded-full border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-black uppercase tracking-widest text-[10px]">
                                ERP V2 ARCHITECTURE // SUBSYSTEM DEEP DIVE
                            </Badge>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9] text-slate-900 dark:text-white"
                        >
                            Unified Digital <br />
                            <span className="text-cyan-600 dark:text-cyan-400">ERP System</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="max-w-3xl mx-auto text-xl font-medium text-slate-600 dark:text-white/40 leading-relaxed italic"
                        >
                            Explore the technical core of the VOS-WEB-V2 ecosystem. From human capital dynamics to fiscal orchestration, each module is engineered for high-density information management and real-time operational oversight.
                        </motion.p>
                    </div>
                </section>

                {/* SUBSYSTEMS GRID */}
                <section className="pb-32 px-6">
                    <div className="max-w-7xl mx-auto space-y-12">
                        {SUBSYSTEMS.map((sub, i) => (
                            <motion.div
                                key={sub.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-10%" }}
                                transition={{ duration: 0.6, delay: i * 0.05 }}
                            >
                                <GlassCard className="p-8 md:p-12 border-slate-200 dark:border-white/5 overflow-hidden group" accent={sub.accent as "cyan" | "emerald" | "amber" | "indigo" | "violet" | "rose"}>
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
                                        {/* Content Left */}
                                        <div className="lg:col-span-7 space-y-8">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-14 h-14 rounded-2xl flex items-center justify-center border",
                                                    sub.accent === "cyan" ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400" :
                                                        sub.accent === "emerald" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                                            sub.accent === "amber" ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                                                sub.accent === "indigo" ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400" :
                                                                    sub.accent === "violet" ? "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400" :
                                                                        "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                                                )}>
                                                    <sub.icon className="w-7 h-7" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white leading-none">
                                                        {sub.title}
                                                    </h3>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/20">SUBSYSTEM // {sub.id}</span>
                                                </div>
                                            </div>

                                            <p className="text-lg text-slate-600 dark:text-white/50 leading-relaxed font-medium italic">
                                                {sub.description}
                                            </p>

                                            <div className="pt-6 border-t border-slate-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                                        <Activity className="w-3 h-3 text-cyan-500" /> Core Analytics
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {sub.analytics.map((item, idx) => (
                                                            <li key={idx} className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40 font-medium italic group/item">
                                                                <CheckCircle2 className="w-3 h-3 text-cyan-500/50 group-hover/item:text-cyan-500 transition-colors" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                                        <Terminal className="w-3 h-3 text-cyan-500" /> Data Entities
                                                    </h4>
                                                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 font-mono text-[10px] text-slate-500 dark:text-cyan-500/80 leading-relaxed">
                                                        {sub.entities.map((ent, idx) => (
                                                            <div key={idx} className="flex gap-2">
                                                                <span className="text-cyan-500/40 select-none">{">"}</span> {ent}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Visual Right (Subtle abstraction) */}
                                        <div className="lg:col-span-5 hidden lg:flex items-center justify-center relative">
                                            <div className="absolute inset-0 bg-linear-to-br from-cyan-500/5 to-transparent rounded-3xl" />
                                            <sub.icon className="w-48 h-48 text-slate-900/5 dark:text-white/5 absolute -rotate-12 group-hover:scale-110 transition-transform duration-700" />
                                            <div className="bg-white dark:bg-slate-900/40 p-1 rounded-full border border-slate-200 dark:border-white/10 shadow-2xl relative z-10">
                                                <div className="w-32 h-32 rounded-full flex items-center justify-center bg-linear-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-950 border border-slate-200 dark:border-white/5">
                                                    <sub.icon className="w-8 h-8 text-slate-900 dark:text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* DATA SYNERGY SECTION */}
                <section className="py-32 px-6 bg-slate-100 dark:bg-slate-950/40 border-t border-slate-200 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-cyan-500/5 blur-[180px] rounded-full pointer-events-none" />

                    <div className="max-w-7xl mx-auto space-y-20 relative z-10">
                        <div className="text-center space-y-4">
                            <motion.h2
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white leading-none"
                            >
                                INTEGRATED <span className="text-cyan-500">SYNERGY</span>
                            </motion.h2>
                            <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-white/40 font-medium italic">
                                VOS-WEB-V2 operates as a single, cohesive engine where subsystems feed into one another in a continuous feedback loop.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                {
                                    title: "Procure-to-Pay",
                                    path: "SCM ↔ Finance",
                                    desc: "SCM purchase orders automatically generate Accounts Payable entries, informing Treasury of incoming cash requirements."
                                },
                                {
                                    title: "Order-to-Cash",
                                    path: "CRM ↔ SCM ↔ Finance",
                                    desc: "Sales cycles verify credit, reserve stock, generate receivables, and update GL balances in a concurrent workflow."
                                },
                                {
                                    title: "Labor Transformation",
                                    path: "HRM ↔ Finance ↔ BI",
                                    desc: "Raw attendance data translates to payroll liabilities while BI calculates labor cost-per-unit for margin analysis."
                                },
                                {
                                    title: "Compliance Oversight",
                                    path: "Audit ↔ All Modules",
                                    desc: "The Audit engine tracks critical events site-wide, ensuring total transparency across every sensitive transaction."
                                }
                            ].map((loop, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <GlassCard className="p-8 h-full border-slate-200 dark:border-white/5 transition-all group hover:border-cyan-500/50" accent="cyan">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <Link2 className="w-5 h-5 text-cyan-500" />
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-500/60">{loop.path}</h4>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white leading-tight">{loop.title}</h3>
                                                <p className="text-sm text-slate-500 dark:text-white/40 font-medium leading-relaxed italic">{loop.desc}</p>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-20 text-center">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="inline-block p-10 rounded-[3rem] bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 backdrop-blur-3xl"
                            >
                                <div className="space-y-6 max-w-2xl">
                                    <ShieldCheck className="w-12 h-12 text-cyan-500 mx-auto" />
                                    <h3 className="text-3xl font-black italic uppercase text-slate-900 dark:text-white">Hardened Resilience</h3>
                                    <p className="text-lg text-slate-600 dark:text-white/50 font-medium italic">
                                        Beyond connectivity, the system is designed for compliance. Audit logs track every action site-wide, ensuring total operational safety.
                                    </p>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                        <Button className="rounded-full h-14 px-10 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform active:scale-95">
                                            Request Tech Spec
                                        </Button>
                                        <Button variant="outline" className="rounded-full h-14 px-10 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm">
                                            Security Whitepaper
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
