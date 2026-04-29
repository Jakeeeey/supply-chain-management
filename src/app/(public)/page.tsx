"use client"

import * as React from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Image from "next/image"
import {
    Shield,
    Settings,
    Cpu,
    Binary
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { MissionStatsGrid } from "@/components/command-center/MissionStatsGrid"
import { GlassCard } from "@/components/command-center/GlassCard"

import { SUBSYSTEMS } from "@/modules/cms/constants/subsystems"

import { HorizontalScrollContainer, HorizontalPanel } from "@/components/command-center/HorizontalScrollContainer"
import { CommandSidebar } from "@/components/command-center/CommandSidebar"

// Specialized Visualizers
import { WorkforcePulse } from "@/components/command-center/visualizers/WorkforcePulse"
import { LiquidityMeter } from "@/components/command-center/visualizers/LiquidityMeter"
import { AssetLifecycle } from "@/components/command-center/visualizers/AssetLifecycle"
import { InventoryTreadmill } from "@/components/command-center/visualizers/InventoryTreadmill"
import { ReceivablesAging } from "@/components/command-center/visualizers/ReceivablesAging"
// import { RiskRadar } from "@/components/command-center/visualizers/RiskRadar"
import { MatrixAuditLog } from "@/components/command-center/visualizers/MatrixAuditLog"

// Previous Visualizers (Now repurposed)
import { ConnectionNode } from "@/components/command-center/ConnectionNode"
import { AnalyticsWorkbench } from "@/components/command-center/AnalyticsWorkbench"
import { GlobalHealthViz } from "@/components/command-center/GlobalHealthViz"

// Interactive Modal
import { ModuleDetailModal, type ModuleDetailModalProps } from "@/components/command-center/ModuleDetailModal"

export default function LandingPage() {
    const { scrollY } = useScroll()

    // Modal State
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    interface ModuleData {
        description: string;
        stats: { label: string; value: string; trend?: string }[];
    }

    const [activeModule, setActiveModule] = React.useState<{
        name: string;
        accent: "cyan" | "indigo" | "rose" | "emerald" | "amber" | "violet";
        data: ModuleData;
    } | null>(null)

    const openModule = (name: string, accent: ModuleDetailModalProps["accent"], data: ModuleData) => {
        setActiveModule({ name, accent, data })
        setIsModalOpen(true)
    }

    const [activePanel, setActivePanel] = React.useState(0)
    const isNavigating = React.useRef(false)

    // Force scroll to top on refresh
    React.useEffect(() => {
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
        if (window.lenis) {
            // @ts-expect-error - lenis is dynamically injected
            window.lenis.scrollTo(0, { immediate: true });
        }
    }, []);

    // Sidebar Navigation Logic
    const scrollToPanel = (index: number) => {
        isNavigating.current = true;

        if (index === 0) {
            setActivePanel(0);
            if (window.lenis) {
                // @ts-expect-error - lenis is dynamically injected
                window.lenis.scrollTo(0, {
                    duration: 1.2,
                    onComplete: () => {
                        isNavigating.current = false;
                    }
                });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => { isNavigating.current = false; }, 1200);
            }
        } else {
            // Set the state, and the HorizontalScrollContainer will detect the prop change
            // and trigger its internal goToSection() which has the mathematically exact ScrollTrigger targets.
            setActivePanel(index);

            // Release lock after transition duration
            setTimeout(() => {
                isNavigating.current = false;
            }, 1500);
        }
    }

    // Update active panel based on scroll (Hero to Horizontal transition)
    React.useEffect(() => {
        const handleScroll = () => {
            if (isNavigating.current) return;

            const y = window.scrollY;
            const vh = window.innerHeight;

            // Only handle the "Hero vs Content" logic here.
            // Content panels (1-6) are handled by HorizontalScrollContainer callback.
            if (y < vh * 0.5) {
                if (activePanel !== 0) setActivePanel(0);
            } else if (activePanel === 0 && y >= vh * 0.5) {
                setActivePanel(1);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activePanel]);

    // Hero Scroll Parallax
    const opacity = useTransform(scrollY, [0, 400], [1, 0])
    const scale = useTransform(scrollY, [0, 400], [1, 0.9])
    const y = useTransform(scrollY, [0, 400], [0, 100])
    const bgY = useTransform(scrollY, [0, 1000], [0, 300])

    const MODULE_DATA = React.useMemo(() => {
        const data: Record<string, ModuleData> = {}
        SUBSYSTEMS.forEach(sub => {
            data[sub.id] = {
                description: sub.description,
                stats: sub.stats
            }
        })
        return data
    }, [])

    return (
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-cyan-500/30 overflow-hidden">

            <ModuleDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                moduleName={activeModule?.name || ""}
                accent={activeModule?.accent || "cyan"}
                data={activeModule?.data || { description: "", stats: [] }}
            />

            <CommandSidebar 
                activePanel={activePanel}
                onPanelSelect={scrollToPanel}
                subsystems={SUBSYSTEMS}
            />

            {/* 1. HERO UNIT */}
            <section id="hero" className="relative h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950">
                <motion.div style={{ y: bgY }} className="absolute inset-0 z-0 block dark:hidden">
                    <Image src="/images/hero_dashboard_light.png" alt="Backdrop" fill sizes="100vw" priority unoptimized quality={100} className="object-cover opacity-60 antialiased [image-rendering:high-quality] [transform:translateZ(0)]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 via-transparent to-slate-50" />
                </motion.div>
                <motion.div style={{ y: bgY }} className="absolute inset-0 z-0 hidden dark:block opacity-30 grayscale-[0.5] contrast-125">
                    <Image src="/images/hero_dashboard.png" alt="Backdrop" fill sizes="100vw" priority unoptimized quality={100} className="object-cover antialiased [image-rendering:high-quality] [transform:translateZ(0)]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/20 to-slate-950" />
                </motion.div>

                <motion.div
                    style={{ opacity, scale, y }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="container mx-auto px-6 relative z-10 text-center will-change-transform will-change-opacity pt-20"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-[0.2em] mb-10 backdrop-blur-xl"
                    >
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        VOS-WEB-V2 // Next-Gen ERP Command Center
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="text-5xl sm:text-6xl md:text-[7rem] font-black tracking-tighter mb-6 leading-[0.85] uppercase italic text-slate-900 dark:text-white"
                    >
                        VOS-WEB: <br />
                        <span className="text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] pr-4 break-words">ERP CONTROL</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="text-lg md:text-2xl text-slate-600 dark:text-white/50 mb-16 max-w-3xl mx-auto leading-relaxed font-medium"
                    >
                        Six integrated subsystems. One unified command surface. <br />
                        HRM · Finance · SCM · CRM · BI · Audit — all in real time.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="max-w-6xl mx-auto"
                    >
                        <MissionStatsGrid />
                    </motion.div>
                </motion.div>
            </section>

            {/* GSAP HORIZONTAL SCROLL TRIGGER */}
            <HorizontalScrollContainer activePanel={activePanel} onIndexChange={setActivePanel}>

                {/* 2. HRM — Human Resource Management (CYAN) */}
                <HorizontalPanel className="px-6 md:px-12 lg:px-24 overflow-hidden">
                    {/* Background Aura */}
                    <div className="absolute inset-0 z-0">
                        <Image
                            src="/hrm_tech_bg_1776080411521.png"
                            fill
                            sizes="100vw"
                            alt=""
                            unoptimized
                            className="object-cover blur-[120px] opacity-15 animate-orb-pulse will-change-transform"
                        />
                    </div>

                {/* Watermark Typography */}
                <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <motion.h3
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5 }}
                        className="text-[10rem] md:text-[14rem] font-black uppercase tracking-tighter italic text-slate-950/[0.03] dark:text-white/[0.02] whitespace-nowrap rotate-90 translate-x-[15%]"
                    >
                        HUMAN_RESOURCE
                    </motion.h3>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 pt-20 lg:pt-32 px-4 md:px-0"
                >
                    <div className="lg:col-span-7 order-2 lg:order-1 w-full relative">
                        <GlassCard className="p-6 lg:p-8 cursor-pointer relative z-10" accent="cyan" onClick={() => openModule("HRM", "cyan", MODULE_DATA.HRM)}>
                            <WorkforcePulse />
                        </GlassCard>
                    </div>
                    <div className="lg:col-span-5 space-y-6 order-1 lg:order-2 text-left lg:text-right">
                        <div className="space-y-6">
                            <h2 className="text-4xl md:text-[4rem] font-black uppercase tracking-tighter italic leading-[0.9] text-slate-900 dark:text-white">
                                Human <br className="hidden md:block" /><span className="text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.2)] md:pr-4">Resource</span>
                            </h2>
                            <p className="text-lg font-medium text-slate-600 dark:text-white/40 leading-relaxed max-w-md ml-auto italic">
                                The core engine for managing organizational human capital and workforce operations. It manages the entire employee lifecycle—from initial recruitment and onboarding to Daily operations.
                            </p>

                            <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-widest text-right">
                                <span className="px-3 py-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10">Employee Admin</span>
                                <span className="px-3 py-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10">Workforce Hub</span>
                                <span className="px-3 py-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10">User & RBAC</span>
                                <span className="px-3 py-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/10">Reporting Engine</span>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-cyan-500/10">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600/60 mb-2">SYNERGY NODE (HRM ↔ PAYROLL)</p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-white/30 uppercase max-w-[280px] ml-auto">
                                Attendance and workforce scheduling data feed directly into the payroll engine, ensuring 100% precision.
                            </p>
                        </div>

                        <Button
                            onClick={() => openModule("HRM", "cyan", MODULE_DATA.HRM)}
                            className="rounded-full bg-cyan-500/10 border border-cyan-500/50 text-cyan-700 dark:text-cyan-400 font-black uppercase tracking-widest text-[10px] px-10 h-12 hover:bg-cyan-500 hover:text-white transition-all shadow-[0_0_30px_rgba(6,182,212,0.1)]"
                        >
                            Open Telemetry
                        </Button>
                    </div>
                </motion.div>
            </HorizontalPanel>

            {/* 3. FINANCIAL MANAGEMENT (EMERALD) */}
            <HorizontalPanel className="px-6 md:px-12 lg:px-24 overflow-hidden">
                {/* Background Aura */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/finance_tech_bg_1776080430564.png"
                        fill
                        sizes="100vw"
                        alt=""
                        unoptimized
                        className="object-cover blur-[100px] opacity-12 animate-orb-pulse will-change-transform"
                    />
                </div>

                {/* Watermark Typography */}
                <div className="absolute inset-0 z-0 flex items-center justify-center lg:items-start lg:pt-32 pointer-events-none select-none overflow-hidden">
                    <motion.h3
                        initial={{ opacity: 0, y: -100 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.5 }}
                        className="text-[10rem] md:text-[15rem] font-black uppercase tracking-tighter italic text-slate-950/[0.03] dark:text-white/[0.02] whitespace-nowrap"
                    >
                        FINANCIAL_MANAGEMENT
                    </motion.h3>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.99 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-7xl mx-auto space-y-8 lg:space-y-12 relative z-10 pt-20 lg:pt-32 px-4 md:px-0"
                >
                    <div className="flex flex-col lg:flex-row items-end justify-between gap-6 border-b border-emerald-500/10 pb-6 lg:pb-8">
                        <h2 className="text-4xl md:text-[4.5rem] font-black uppercase tracking-tighter italic leading-[0.8] text-slate-900 dark:text-white w-full lg:w-auto">
                            Financial <br className="hidden md:block" /><span className="text-emerald-600 dark:text-emerald-400 text-4xl sm:text-5xl md:text-[5.5rem] drop-shadow-[0_0_10px_rgba(16,185,129,0.2)] md:pr-6 break-words">MANAGEMENT</span>
                        </h2>
                        <div className="space-y-4 text-left lg:text-right w-full lg:w-auto">
                            <p className="max-w-md text-slate-600 dark:text-white/40 text-lg md:text-xl font-medium italic leading-relaxed">
                                A high-precision subsystem managing the organizational economic vitality and asset lifecycle. Transforming activities into verifiable statements.
                            </p>
                            <div className="flex flex-wrap justify-end gap-2">
                                {["Treasury", "General Ledger", "Asset Lifecycle", "Accounts Payable", "Pricing Engine"].map(t => (
                                    <span key={t} className="text-[9px] font-black px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 uppercase tracking-tighter">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                        <div className="lg:col-span-5 h-full">
                            <GlassCard className="p-6 lg:p-8 cursor-pointer relative z-10 h-full" accent="emerald" onClick={() => openModule("FIN", "emerald", MODULE_DATA.FIN)}>
                                <LiquidityMeter />
                            </GlassCard>
                        </div>
                        <div className="lg:col-span-7 h-full">
                            <GlassCard className="p-6 lg:p-8 cursor-pointer relative z-10 h-full" accent="emerald" onClick={() => openModule("FIN", "emerald", MODULE_DATA.FIN)}>
                                <AssetLifecycle />
                            </GlassCard>
                        </div>
                    </div>
                </motion.div>
            </HorizontalPanel>

            {/* 4. SUPPLY CHAIN MANAGEMENT (AMBER) */}
            <HorizontalPanel className="px-6 md:px-12 lg:px-24 overflow-hidden bg-slate-100/50 dark:bg-slate-900/10">
                {/* Background Map Wash */}
                <div className="absolute inset-x-0 bottom-0 top-1/4 z-0">
                    <Image
                        src="/scm_tech_bg_v2_1776080502518.png"
                        fill
                        sizes="100vw"
                        alt=""
                        unoptimized
                        className="object-cover blur-[80px] opacity-20 animate-orb-pulse will-change-transform"
                    />
                </div>

                {/* Watermark Typography */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <motion.h3
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.5 }}
                        className="text-[10rem] sm:text-[15rem] md:text-[25rem] font-black uppercase tracking-tighter italic text-slate-950/[0.03] dark:text-white/[0.02] whitespace-nowrap"
                    >
                        SUPPLY_CHAIN
                    </motion.h3>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 relative z-10 pt-20 lg:pt-32 px-4 md:px-0"
                >
                    <div className="space-y-8 order-2 lg:order-1">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-[4.5rem] font-black uppercase tracking-tighter italic leading-[0.9] text-slate-900 dark:text-white">
                                Supply <br /><span className="text-amber-600 dark:text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)] md:pr-4">Chain</span>
                            </h2>
                            <p className="text-xl font-medium text-slate-600 dark:text-white/40 leading-relaxed italic max-w-md">
                                The orchestration layer for inventory and logistics. End-to-end visibility from the moment a PO is created until final delivery is completed.
                            </p>
                            <div className="grid grid-cols-2 gap-4 max-w-xs">
                                <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5">
                                    <h5 className="text-[9px] font-black text-amber-600 uppercase mb-1">Logistics Traceability</h5>
                                    <p className="text-[10px] leading-tight text-white/40">Monitoring route optimization and dispatch status in real-time.</p>
                                </div>
                                <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5">
                                    <h5 className="text-[9px] font-black text-amber-600 uppercase mb-1">Inventory Control</h5>
                                    <p className="text-[10px] leading-tight text-white/40">Physical counts and offsetting preventing stock-outs.</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-md group hover:bg-amber-500/10 transition-colors">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-amber-600/60 mb-1">Fleet_Active</span>
                                <span className="text-2xl lg:text-3xl font-black italic text-amber-600 dark:text-amber-500 tracking-tighter font-mono">14/15</span>
                            </div>
                            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-md group hover:bg-amber-500/10 transition-colors">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-amber-600/60 mb-1">Turnover_Index</span>
                                <span className="text-2xl lg:text-3xl font-black italic text-amber-600 dark:text-amber-500 tracking-tighter font-mono">14.2X</span>
                            </div>
                        </div>
                        <GlassCard className="p-6 lg:p-8 cursor-pointer relative z-10" accent="amber" onClick={() => openModule("SCM", "amber", MODULE_DATA.SCM)}>
                            <InventoryTreadmill />
                        </GlassCard>
                    </div>
                    <div className="lg:pt-20 order-1 lg:order-2 pb-8 lg:pb-0">
                        <div className="relative">
                            <div className="absolute -inset-10 bg-amber-500/10 blur-[100px] rounded-full" />
                            <GlobalHealthViz />
                        </div>
                    </div>
                </motion.div>
            </HorizontalPanel>

            {/* 5. CUSTOMER RELATIONSHIP (INDIGO) */}
            <HorizontalPanel className="px-6 md:px-12 lg:px-24 overflow-hidden">
                {/* Background Aura */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/crm_tech_bg_1776080448439.png"
                        fill
                        sizes="100vw"
                        alt=""
                        unoptimized
                        className="object-cover blur-[140px] opacity-15 animate-orb-pulse will-change-transform"
                    />
                </div>

                {/* Watermark Typography */}
                <div className="absolute inset-0 z-0 flex items-center justify-center lg:items-start lg:pt-32 pointer-events-none select-none overflow-hidden">
                    <motion.h3
                        initial={{ opacity: 0, scale: 1.2 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5 }}
                        className="text-[10rem] md:text-[15rem] font-black uppercase tracking-tighter italic text-slate-950/[0.03] dark:text-white/[0.02] whitespace-nowrap"
                    >
                        CRM_PIPELINE
                    </motion.h3>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center relative z-10 pt-20 lg:pt-32 px-4 md:px-0"
                >
                    <div className="lg:col-span-6 space-y-8 order-2 lg:order-1">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-[4.5rem] font-black uppercase tracking-tighter italic leading-[0.9] text-slate-900 dark:text-white">
                                Customer <br className="hidden md:block" /><span className="text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.2)] md:pr-6 break-words">RELATIONSHIP</span>
                            </h2>
                            <p className="font-medium text-slate-600 dark:text-white/40 text-xl leading-relaxed max-w-md italic">
                                Directing revenue pipeline and streamlining customer interactions. Billing engine tracking every order from quote to cash conversion.
                            </p>

                            <div className="flex items-center gap-6 pt-4 border-t border-indigo-500/10 scale-90 origin-left">
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black text-indigo-500 font-mono italic">360°</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/50">Client Hub</span>
                                </div>
                                <div className="flex flex-col border-l border-indigo-500/10 pl-6">
                                    <span className="text-3xl font-black text-indigo-500 font-mono italic">100%</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/50">AR Visibility</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={() => openModule("CRM", "indigo", MODULE_DATA.CRM)}
                            className="rounded-full bg-indigo-500/10 border border-indigo-500/50 text-indigo-700 dark:text-indigo-400 font-black uppercase tracking-widest text-[10px] px-12 h-14 hover:bg-indigo-500 hover:text-white transition-all shadow-[0_0_40px_rgba(99,102,241,0.15)]"
                        >
                            Executive Insights
                        </Button>
                    </div>
                    <div className="lg:col-span-6 flex items-center justify-center order-1 lg:order-2 pb-8 lg:pb-0">
                        <div className="relative w-full max-w-md lg:max-w-lg aspect-square">
                            <div className="absolute inset-0 bg-indigo-500/30 blur-[150px] rounded-full animate-pulse" />
                            <ConnectionNode />
                            <div className="absolute -bottom-8 -right-4 lg:-bottom-10 lg:-right-10 w-48 lg:w-64">
                                <GlassCard className="p-4 lg:p-6 relative z-10" accent="indigo" onClick={() => openModule("CRM", "indigo", MODULE_DATA.CRM)}>
                                    <ReceivablesAging />
                                </GlassCard>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </HorizontalPanel>

            {/* 6. BUSINESS INTELLIGENCE (VIOLET) */}
            <HorizontalPanel className="px-6 md:px-12 lg:px-24 overflow-hidden relative">
                {/* Background Aura */}
                <div className="absolute inset-x-0 bottom-0 top-0 z-0 flex items-center justify-center">
                    <Image
                        src="/bi_tech_bg_1776080465405.png"
                        fill
                        sizes="100vw"
                        alt=""
                        unoptimized
                        className="object-cover blur-[100px] opacity-20 animate-orb-pulse will-change-transform"
                    />
                </div>

                {/* Watermark Typography */}
                <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <motion.h3
                        initial={{ opacity: 0, rotate: -5 }}
                        whileInView={{ opacity: 1, rotate: 0 }}
                        transition={{ duration: 1.5 }}
                        className="text-[6rem] sm:text-[10rem] md:text-[18rem] font-black uppercase tracking-tighter italic text-slate-950/[0.03] dark:text-white/[0.02] whitespace-nowrap"
                    >
                        BUSINESS_INTELLIGENCE
                    </motion.h3>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 1.02 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-7xl mx-auto space-y-12 lg:space-y-16 relative z-10 pt-20 lg:pt-32 px-4 md:px-0"
                >
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="p-3 lg:p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 backdrop-blur-xl animate-bounce-slow">
                            <Cpu className="w-8 h-8 lg:w-10 lg:h-10 text-violet-500" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black uppercase tracking-tighter italic leading-none text-slate-900 dark:text-white">
                            System <br className="hidden md:block" /><span className="text-violet-600 dark:text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.2)] md:pr-6">Intelligence</span>
                        </h2>
                        <p className="max-w-md lg:max-w-xl text-slate-600 dark:text-white/40 text-lg lg:text-2xl font-medium italic leading-relaxed">
                            Aggregated analytics stream correlating stock, sales, and fiscal performance nodes.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-stretch">
                        <div className="flex flex-col gap-12 justify-center">
                            <div className="p-10 rounded-2xl bg-violet-500/5 border border-violet-500/10 backdrop-blur-3xl shadow-2xl hover:bg-violet-500/10 transition-colors cursor-pointer group">
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-40 group-hover:opacity-100 transition-opacity">Neural_Net_Status</h4>
                                <p className="text-4xl font-black italic tracking-tighter text-violet-600 dark:text-violet-400 font-mono">94.8% <span className="text-xs uppercase font-medium tracking-normal opacity-50 block mt-2 text-violet-500">Integrity Optimized</span></p>
                            </div>
                        </div>
                        <div className="lg:col-span-2 relative">
                            <GlassCard className="p-4 lg:p-10 relative z-20 h-full flex items-center justify-center bg-slate-900/5 dark:bg-slate-900/40 w-full overflow-hidden" accent="violet" onClick={() => openModule("BI", "violet", MODULE_DATA.BI)}>
                                <div className="w-full scale-100 xl:scale-110 overflow-hidden px-2"><AnalyticsWorkbench /></div>
                            </GlassCard>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] aspect-square bg-violet-600/5 blur-[120px] rounded-full z-0 pointer-events-none" />
                        </div>
                    </div>
                </motion.div>
            </HorizontalPanel>

            {/* 7. AUDIT RESULTS & FINDINGS (ROSE) */}
            <HorizontalPanel className="px-6 md:px-12 lg:px-24 overflow-hidden relative">
                {/* Background Aura */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/arf_tech_bg_1776080481672.png"
                        fill
                        sizes="100vw"
                        alt=""
                        unoptimized
                        className="object-cover blur-[150px] opacity-10 animate-orb-pulse will-change-transform"
                    />
                </div>

                {/* Watermark Typography */}
                <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <motion.h3
                        initial={{ opacity: 0, skewX: -10 }}
                        whileInView={{ opacity: 1, skewX: 0 }}
                        transition={{ duration: 1.5 }}
                        className="text-[10rem] sm:text-[15rem] md:text-[25rem] font-black uppercase tracking-tighter italic text-slate-950/[0.03] dark:text-white/[0.02] whitespace-nowrap"
                    >
                        AUDIT_RESULT_FINDINGS
                    </motion.h3>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center relative z-10 pt-20 lg:pt-32 px-4 md:px-0"
                >
                    <div className="lg:col-span-12 mb-4 lg:mb-8 border-b border-rose-500/20 pb-4 lg:pb-8 flex flex-col lg:flex-row items-center lg:items-end justify-between text-center lg:text-left gap-6">
                        <div className="flex flex-col lg:flex-row items-center gap-6">
                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                <Shield className="w-10 h-10 lg:w-12 lg:h-12 text-rose-500" />
                            </div>
                            <h2 className="text-4xl md:text-[4.5rem] font-black uppercase tracking-tighter italic leading-[0.85] text-slate-900 dark:text-white">
                                Governance <br className="hidden md:block" /><span className="text-rose-600 dark:text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.2)] md:pr-6">Assurance</span>
                            </h2>
                        </div>
                        <p className="max-w-md lg:text-right text-slate-600 dark:text-white/40 text-lg lg:text-xl italic font-medium">
                            The assurance layer providing the necessary oversight to ensure organizational integrity through immutable logs.
                        </p>
                    </div>

                    <div className="lg:col-span-5 space-y-8">
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { t: "Audit Tracking", d: "Management of internal and external processes, including scope and scheduling." },
                                { t: "Findings Repository", d: "Recording, tracking, and resolving compliance gaps with structured remediation." },
                                { t: "Activity Streams", d: "Real-time logs of critical system actions for non-repudiable auditing." }
                            ].map((item, i) => (
                                <div key={i} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                                    <h5 className="text-[10px] font-black text-rose-500 uppercase italic mb-1 tracking-widest">{item.t}</h5>
                                    <p className="text-xs text-slate-500 dark:text-white/40">{item.d}</p>
                                </div>
                            ))}
                        </div>
                        <Button
                            onClick={() => openModule("ARF", "rose", MODULE_DATA.ARF)}
                            className="rounded-full bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] px-10 h-12 lg:px-12 lg:h-14 hover:bg-rose-600 transition-all shadow-[0_10px_40px_-10px_rgba(244,63,94,0.5)] active:scale-95 w-full lg:w-auto mt-4"
                        >
                            Security Audit Log
                        </Button>
                    </div>
                    <div className="lg:col-span-7">
                        <GlassCard className="p-4 lg:p-6 cursor-pointer relative z-10 border-rose-500/30 overflow-hidden" accent="rose" onClick={() => openModule("ARF", "rose", MODULE_DATA.ARF)}>
                            <MatrixAuditLog />
                        </GlassCard>
                    </div>
                </motion.div>
            </HorizontalPanel>

            {/* 8. ENGINEERING CORE — RE React 19 / NEXT.JS 16 (SLATE) */}
            <HorizontalPanel className="px-6 md:px-12 lg:px-24 overflow-hidden relative">
                {/* Background Tech Wash */}
                <div className="absolute inset-x-0 bottom-0 top-0 z-0 flex items-center justify-center pointer-events-none">
                    <motion.img
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1.1, opacity: 0.15 }}
                        transition={{ duration: 3 }}
                        src="/bi_tech_bg_1776080465405.png"
                        className="w-[120%] h-[120%] object-cover blur-[100px] grayscale brightness-150 invert dark:invert-0"
                    />
                </div>
                {/* Radial Center Pulse */}
                <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-500/10 via-transparent to-transparent opacity-100" />

                <motion.div
                    initial={{ opacity: 0, scale: 1.1 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center space-y-16 relative z-10 pt-24 lg:pt-32"
                >
                    <div className="text-center space-y-6">
                        <Binary className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                        <h2 className="text-4xl sm:text-5xl md:text-[6rem] font-black uppercase tracking-tighter italic leading-none text-slate-900 dark:text-white">
                            THE <span className="text-slate-600 dark:text-slate-400">CORE</span> ENGINE
                        </h2>
                        <p className="text-2xl font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            Deterministic Speed // High-Density Architecture
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                        {[
                            { t: "React 19 / Next.js 16", d: "Built on the latest rendering architecture for unmatched system speed." },
                            { t: "Headless Backend", d: "Decoupled architecture allowing for rapid schema changes and flexibility." },
                            { t: "Computation Engine", d: "High-performance processing of complex bimonthly logistics payout matrices." },
                            { t: "Type-Safe Accuracy", d: "Strict TypeScript validation ensuring 100% precision in financial logic." }
                        ].map((eng, i) => (
                            <GlassCard key={i} className="p-8 group hover:bg-slate-500/5 transition-all" accent="violet">
                                <h4 className="text-lg font-black italic font-mono text-slate-800 dark:text-slate-200 mb-4 group-hover:text-cyan-500 transition-colors uppercase leading-tight">
                                    {eng.t}
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-white/40 font-medium leading-relaxed">
                                    {eng.d}
                                </p>
                            </GlassCard>
                        ))}
                    </div>

                    <div className="p-8 rounded-3xl bg-slate-200/50 dark:bg-slate-950/50 border border-slate-900/10 dark:border-white/10 backdrop-blur-3xl w-full max-w-2xl text-center">
                        <span className="block text-xs font-black uppercase tracking-[0.5em] text-cyan-600 dark:text-cyan-500 mb-4">Core // Philosophy</span>
                        <p className="text-slate-700 dark:text-slate-400 italic text-lg leading-relaxed font-medium">
                            Engineered for power users to manage complex organizational data. Efficiency over whitespace.
                            Mission control philosophy meets luxury tech aesthetics.
                        </p>
                    </div>
                </motion.div>
            </HorizontalPanel>

        </HorizontalScrollContainer>

            {/* FOOTER */ }
    <footer className="relative py-32 px-6 border-t border-slate-900/5 dark:border-white/5 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-12 relative z-10">
            <div className="p-6 rounded-full bg-slate-900/[0.02] dark:bg-white/[0.02] border border-slate-900/5 dark:border-white/5 backdrop-blur-xl hover:scale-110 transition-transform">
                <Settings className="w-12 h-12 text-cyan-600 dark:text-cyan-500 animate-spin-slow" />
            </div>
            <div className="space-y-6">
                <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white">Ready to Deploy?</h3>
                <p className="max-w-xl mx-auto text-slate-600 dark:text-white/50 text-xl font-medium">
                    VOS-WEB-V2 is built for enterprise scale. <br />
                    HRM · Finance · SCM · CRM · BI · Audit — on a single platform.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
                <Button className="rounded-full h-14 px-10 bg-cyan-500 hover:bg-cyan-400 text-slate-50 dark:text-slate-950 font-black uppercase tracking-widest text-sm shadow-[0_0_30px_-5px_rgba(6,182,212,0.5)]">
                    Establish Integration
                </Button>
                <Button variant="outline" className="rounded-full h-14 px-10 border-slate-900/10 dark:border-white/10 hover:bg-slate-900/5 dark:hover:bg-white/5 font-black uppercase tracking-widest text-sm text-slate-900 dark:text-white transition-colors">
                    View Documentation
                </Button>
            </div>
        </div>
            </footer>
        </div>
    )
}

