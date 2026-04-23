"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
    Target,
    Sparkles,
    ArrowRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden selection:bg-cyan-500/30">
            {/* Background Auras */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/5 dark:bg-violet-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10">
                {/* HERO SECTION */}
                <section className="relative pt-32 pb-20 px-6">
                    <div className="max-w-7xl mx-auto text-center space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Badge variant="outline" className="px-4 py-1 rounded-full border-cyan-500/30 text-cyan-600 dark:text-cyan-400 font-black uppercase tracking-widest text-[10px]">
                                OUR IDENTITY // VERTEX TECHNOLOGIES
                            </Badge>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9] text-slate-900 dark:text-white"
                        >
                            Empowering <br />
                            <span className="text-cyan-600 dark:text-cyan-400">Communities & Businesses</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="max-w-3xl mx-auto text-xl md:text-2xl font-medium text-slate-600 dark:text-white/40 leading-relaxed italic"
                        >
                            We build secure, scalable systems that improve efficiency, transparency, and sustainable growth—from LGUs to Enterprise-grade ERPs.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6"
                        >
                            <Button className="rounded-full h-14 px-10 bg-cyan-600 dark:bg-cyan-500 hover:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_-10px_rgba(6,182,212,0.3)]">
                                Establishment Integration
                            </Button>
                            <Button variant="outline" className="rounded-full h-14 px-10 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-black uppercase tracking-widest text-sm text-slate-900 dark:text-white transition-colors">
                                Our Solutions <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </motion.div>
                    </div>
                </section>

                {/* MISSION SECTION (CORE) */}
                <section className="py-24 px-6 border-y border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/20 backdrop-blur-md">
                    <div className="max-w-4xl mx-auto space-y-12 text-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none text-slate-900 dark:text-white">
                                OUR <span className="text-cyan-500">MISSION</span>
                            </h2>
                            <p className="text-xl text-slate-600 dark:text-white/50 leading-relaxed font-medium italic border-l-4 border-cyan-500/30 pl-8 text-left">
                                To empower LGUs and enterprises by replacing complex workflows with simple, reliable, and innovative software solutions. We drive measurable impact, allowing our partners to focus on what they do best: serving citizens and growing businesses.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                                <div className="p-8 rounded-3xl bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-4 text-left">
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                        <Target className="w-6 h-6 text-cyan-600 dark:text-cyan-500" />
                                    </div>
                                    <h4 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Core Focus</h4>
                                    <p className="text-sm text-slate-500 dark:text-white/40 leading-relaxed font-medium">Public sector modernization & Enterprise efficiency through high-density data management.</p>
                                </div>
                                <div className="p-8 rounded-3xl bg-white/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 space-y-4 text-left">
                                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                        <Sparkles className="w-6 h-6 text-violet-600 dark:text-violet-500" />
                                    </div>
                                    <h4 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Hardened Tech</h4>
                                    <p className="text-sm text-slate-500 dark:text-white/40 leading-relaxed font-medium">Engineered architecture with Next.js 15 and React 19 for unmatched system speed.</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* STATS SECTION */}
                {/*  <section className="py-24 px-6 overflow-hidden relative">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-cyan-500/5 blur-[120px]" />
                    </div>
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                        {[
                            { label: "Projects Delivered", value: "150+", sub: "Public & Private Sector" },
                            { label: "Satisfaction Rate", value: "98%", sub: "Long-term Partnerships" },
                            { label: "Team Expertise", value: "20+ Yrs", sub: "Combined Knowledge" }
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="text-center space-y-2 group"
                            >
                                <span className="block text-5xl md:text-7xl font-black italic text-slate-900 dark:text-white tracking-widest group-hover:text-cyan-500 transition-colors">
                                    {stat.value}
                                </span>
                                <div className="space-y-1">
                                    <h5 className="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-500">{stat.label}</h5>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/20 tracking-tighter">{stat.sub}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>*/}

                {/* LEADERSHIP TEAM */}
                {/*           <section className="py-24 px-6 bg-slate-50 dark:bg-slate-950/20">
                    <div className="max-w-7xl mx-auto space-y-16">
                        <div className="flex flex-col md:flex-row items-end justify-between gap-6 border-b border-slate-200 dark:border-white/5 pb-8">
                            <div className="space-y-2">
                                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white leading-none">
                                    LEADERSHIP <span className="text-cyan-500">TEAM</span>
                                </h2>
                                <p className="text-xs font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.3em]">Architecting Reliability</p>
                            </div>
                            <p className="max-w-md text-slate-600 dark:text-white/40 text-lg italic font-medium text-right leading-snug">
                                We are a team of engineers, designers, and product leaders focused on building reliable systems.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { name: "Engr. Raymond Tabelin, PCpE", title: "Chief Technology Officer (CTO)", bio: "Drives technology strategy, ensuring solutions align with business goals." },
                                { name: "Andrei Jam Siapno", title: "IT Operations Manager", bio: "Maintains secure, reliable infrastructure and operational excellence." },
                                { name: "Erman Ace M. Cerujano", title: "Lead Product Manager", bio: "Leading digital reforms to make services efficient and citizen-focused." },
                                { name: "Bradley P. Mosuela", title: "Project Manager", bio: "Oversees planning and delivery for user-friendly solutions." },
                                { name: "Joy Roseth Gutierrez", title: "Account Manager", bio: "Client liaison ensuring smooth onboarding and partner success." },
                                { name: "Jonas S. Penullar", title: "Tech Support", bio: "Ensures system stability and provides vital user support." }
                            ].map((leader, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    viewport={{ once: true }}
                                >
                                    <GlassCard className="p-8 h-full border-slate-200 dark:border-white/5 group hover:border-cyan-500/50 transition-all duration-500" accent="cyan">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <h4 className="text-xl font-black italic uppercase text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-500 transition-colors">{leader.name}</h4>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-500/60 pb-2 border-b border-slate-200 dark:border-white/5 italic">{leader.title}</p>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-white/40 font-medium leading-relaxed italic">{leader.bio}</p>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>*/}

                {/* FINAL BRAND TAGLINE */}
                <section className="py-24 px-6 text-center">
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-white/10 italic"
                    >
                        Architecting the Future of Public Service & Enterprise Digitalization
                    </motion.p>
                </section>
            </div>
        </div>
    )
}
