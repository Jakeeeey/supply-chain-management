// src/app/login/page.tsx
"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { 
    Eye, 
    EyeOff, 
    Lock, 
    Mail, 
    ArrowRight, 
    ShieldCheck, 
    LayoutDashboard
} from "lucide-react"
import { motion, useMotionValue, useSpring, useTransform, type Variants } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { GlassCard } from "@/components/command-center/GlassCard"

function normalizeLoginErrorMessage(rawMsg: string, httpStatus?: number) {
    const msg = String(rawMsg || "")
    const m = msg.toLowerCase()

    if (
        httpStatus === 401 ||
        m.includes("http 401") ||
        m.includes("unauthorized") ||
        m.includes("invalid credentials")
    ) {
        return "Incorrect email or password."
    }

    if (
        m.includes("cannot reach spring api") ||
        m.includes("econnrefused") ||
        m.includes("fetch failed") ||
        m.includes("network error") ||
        m.includes("timeout") ||
        m.includes("aborted")
    ) {
        return "We're having trouble connecting to the server. Please try again."
    }

    return msg
}


export default function LoginPage() {
    return (
        <React.Suspense fallback={<div className="min-h-svh flex items-center justify-center font-black tracking-widest text-xs uppercase animate-pulse">Loading...</div>}>
            <LoginForm />
        </React.Suspense>
    )
}

function LoginForm() {
    const searchParams = useSearchParams()

    const [showPw, setShowPw] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const [email, setEmail] = React.useState("")
    const [hashPassword, setHashPassword] = React.useState("")
    const [remember, setRemember] = React.useState(false)

    // Mouse Parallax for Background
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })

    const gridX = useTransform(springX, [-500, 500], [30, -30])
    const gridY = useTransform(springY, [-500, 500], [30, -30])

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        mouseX.set(clientX - centerX)
        mouseY.set(clientY - centerY)
    }

    const validate = React.useCallback((): boolean => {
        if (!String(email).trim()) return false
        if (!String(hashPassword).trim()) return false
        return true
    }, [email, hashPassword])

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setLoading(true)

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, hashPassword, remember }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok || !data?.ok) {
                const raw = String(data?.message ?? `Sign in failed.`)
                const msg = normalizeLoginErrorMessage(raw, res.status)
                toast.error("Sign in failed", { description: msg })
                return
            }
            toast.success("Welcome back!", { description: "Signing you in..." })
            let next = searchParams.get("next") || "/main-dashboard"
            if (!next.startsWith("/")) next = "/main-dashboard"
            window.location.href = next
        } catch (err: unknown) {
            const errorInfo = err as { message?: string };
            const raw = errorInfo?.message ? String(errorInfo.message) : "Network error."
            toast.error("Error", { description: normalizeLoginErrorMessage(raw) })
        } finally {
            setLoading(false)
        }
    }

    // Animation Variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.3 }
        }
    }

    const moduleVariants: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
        }
    }

    return (
        <div 
            onMouseMove={handleMouseMove}
            className="relative w-full min-h-svh flex flex-col overflow-hidden font-sans selection:bg-cyan-500/30"
        >
            {/* --- IMMERSIVE BACKGROUND SYSTEM --- */}
            
            {/* Layer 0: Background Base */}
            <div className="absolute inset-0 -z-50 bg-slate-50 dark:bg-slate-950" />

            {/* Layer 1: Subtle radial gradient for light mode depth */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.06),transparent)] dark:hidden" />
            
            {/* Layer 2: Grid Overlay */}
            <motion.div 
                style={{ x: gridX, y: gridY }}
                className="absolute inset-0 z-0 opacity-30 pointer-events-none"
            >
                <div 
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.12) 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }}
                />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan" />
            </motion.div>

            {/* Layer 4: Dynamic Orbs */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div 
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3], x: [0, 120, 0], y: [0, -60, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1/4 -right-1/4 w-full h-full bg-cyan-600/20 blur-[200px] rounded-full" 
                />
                <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2], x: [0, -100, 0], y: [0, 120, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 1 }}
                    className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-indigo-600/20 blur-[200px] rounded-full" 
                />
            </div>

            {/* --- LOGIN HUD --- */}

            <motion.main 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="container mx-auto px-4 pt-32 pb-12 min-h-[calc(100svh-120px)] flex flex-col items-center justify-center relative z-10 w-full"
            >
                <div className="w-full max-w-[440px] space-y-6">
                    {/* [TOP] SYSTEM BRANDING ACCENT */}
                    <motion.div variants={moduleVariants} className="flex flex-col items-center gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.2)] border border-cyan-500/20">
                            <LayoutDashboard className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase leading-none">VOS ERP</h1>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.3em] mt-1">Management System</p>
                        </div>
                    </motion.div>

                    {/* [CENTER] LOGIN FORM */}
                    <GlassCard variants={moduleVariants} className="relative overflow-hidden p-0 shadow-2xl" accent="indigo">
                        <div className="flex flex-col h-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                            <div className="p-8 border-b border-slate-200 dark:border-white/5 flex flex-col items-center gap-2">
                                <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic text-center leading-none">
                                    Account <span className="text-cyan-500 dark:text-cyan-400">Login</span>
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-white/20 text-center">
                                    Secure Authentication Portal
                                </p>
                            </div>

                            <div className="p-8 flex flex-col justify-center w-full">
                                <form onSubmit={onSubmit} className="space-y-6">
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 ml-1">Email Address</Label>
                                        <div className="relative group/field">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20 group-focus-within/field:text-cyan-500 transition-colors" />
                                            <Input 
                                                type="email"
                                                required
                                                placeholder="your@email.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="h-12 pl-12 rounded-xl bg-white/60 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Password</Label>
                                            <button type="button" className="text-[9px] font-bold text-slate-400 dark:text-white/20 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors" disabled>Forgot?</button>
                                        </div>
                                        <div className="relative group/field">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20 group-focus-within/field:text-cyan-500 transition-colors" />
                                            <Input 
                                                type={showPw ? "text" : "password"}
                                                required
                                                placeholder="••••••••"
                                                value={hashPassword}
                                                onChange={(e) => setHashPassword(e.target.value)}
                                                className="h-12 pl-12 pr-12 rounded-xl bg-white/60 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all font-bold text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(!showPw)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white transition-colors"
                                            >
                                                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 ml-1">
                                        <Checkbox 
                                            id="persists"
                                            checked={remember}
                                            onCheckedChange={(v) => setRemember(Boolean(v))}
                                            className="w-3.5 h-3.5 border-slate-300 dark:border-white/10 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                        />
                                        <label htmlFor="persists" className="text-[10px] font-bold text-slate-500 dark:text-white/40 cursor-pointer">Stay signed in on this device</label>
                                    </div>

                                    <Button 
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-14 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase tracking-[0.2em] text-xs transition-all hover:shadow-[0_15px_30px_-5px_rgba(6,182,212,0.4)] active:scale-[0.98] group/btn"
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                                Signing In...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span>Sign In</span>
                                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                            </div>
                                        )}
                                    </Button>
                                </form>
                            </div>

                            <div className="p-5 bg-slate-500/5 border-t border-slate-200 dark:border-white/5 flex items-center justify-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-500" />
                                <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-white/30 uppercase">Secure Encryption Active</span>
                            </div>
                        </div>
                    </GlassCard>

                </div>
            </motion.main>
            
            <style jsx global>{`
                @keyframes scan {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(100vh); }
                }
                .animate-scan {
                    animation: scan 7s linear infinite;
                }
            `}</style>
        </div>
    )
}
