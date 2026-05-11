"use client"

import * as React from "react"
import { Lock, Eye, EyeOff, LayoutDashboard, ShieldCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, useMotionValue, useSpring, useTransform, type Variants } from "framer-motion"
import { GlassCard } from "@/components/command-center/GlassCard"

export default function ResetPasswordPage() {
    return (
        <React.Suspense fallback={<div className="min-h-svh flex items-center justify-center font-black tracking-widest text-xs uppercase animate-pulse">Loading...</div>}>
            <ResetPasswordForm />
        </React.Suspense>
    )
}

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")

    const [newPassword, setNewPassword] = React.useState("")
    const [confirmPassword, setConfirmPassword] = React.useState("")

    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [status, setStatus] = React.useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [showNewPassword, setShowNewPassword] = React.useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

    // Mouse Parallax (matching login page)
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })

    // Dynamic visual feedback for password requirements
    const reqs = [
        { id: 'length', text: 'At least 15 characters', met: newPassword.length >= 15 },
        { id: 'upper', text: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
        { id: 'lower', text: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
        { id: 'digit', text: 'One digit (0-9)', met: /[0-9]/.test(newPassword) },
        { id: 'special', text: 'One special character (!@#$%^&*()_+~=[]{};:\'"\\|,.<>?`~)', met: /[!@#$%^&*()_+~=\[\]{};:'"\\|,.<>?`\-]/.test(newPassword) }
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (newPassword !== confirmPassword) {
            setStatus({ type: 'error', message: "Passwords do not match" })
            return
        }

        if (reqs.some(req => !req.met)) {
            setStatus({ type: 'error', message: "Password does not meet all requirements" })
            return
        }

        if (!token) {
            setStatus({ type: 'error', message: "Reset token is missing. Please check your email link." })
            return
        }

        setIsSubmitting(true)
        setStatus(null)

        try {
            const res = await fetch(`/api/auth/reset-password?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            })

            const data = await res.json()

            if (res.ok) {
                setStatus({ type: 'success', message: "Password reset successful! You can now log in." })
                setTimeout(() => {
                    router.push("/login")
                }, 3000)
            } else {
                setStatus({ type: 'error', message: data.message || "Failed to reset password" })
            }
        } catch {
            setStatus({ type: 'error', message: "An unexpected error occurred. Please try again." })
        } finally {
            setIsSubmitting(false)
        }
    }

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
    }

    const moduleVariants: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
    }

    return (
        <div className="relative w-full min-h-svh flex flex-col overflow-hidden font-sans selection:bg-cyan-500/30 bg-slate-50 dark:bg-slate-950">
            {/* --- IMMERSIVE BACKGROUND SYSTEM --- */}

            {/* Layer 1: Subtle radial gradient for light mode depth */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.04),transparent)] dark:hidden" />

            {/* --- DIRECTUS-INSPIRED FLUID GRADIENT SYSTEM --- */}

            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#020617]">
                {/* Layer 1: The Moving Fluid Core */}
                <div className="absolute inset-0 z-0 opacity-40 dark:opacity-60">
                    <motion.div
                        animate={{
                            x: [0, 180, -120, 0],
                            y: [0, 200, 100, 0],
                            scale: [1, 1.5, 0.7, 1],
                            rotate: [0, 180, 360]
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] bg-indigo-500/40 dark:bg-indigo-600/30 blur-[80px] rounded-full will-change-transform"
                    />

                    <motion.div
                        animate={{
                            x: [0, -200, 150, 0],
                            y: [0, -180, 250, 0],
                            scale: [1.4, 0.8, 1.6, 1.4],
                            rotate: [360, 180, 0]
                        }}
                        transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 1 }}
                        className="absolute -bottom-[20%] -right-[10%] w-[80%] h-[80%] bg-cyan-500/40 dark:bg-cyan-600/30 blur-[90px] rounded-full will-change-transform"
                    />

                    <motion.div
                        animate={{
                            x: [0, 100, -150, 0],
                            y: [100, -100, 100],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-violet-500/30 dark:bg-violet-600/20 blur-[70px] rounded-full will-change-transform"
                    />
                </div>

                {/* Layer 2: Static Glass "Blades" (Perfectly Symmetrical & Centered) */}
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                    {/* Left Diagonal Blade */}
                    <div className="absolute top-0 -left-[15%] w-[45%] h-full bg-white/[0.05] dark:bg-white/[0.01] backdrop-blur-[40px] dark:backdrop-blur-[80px] border border-indigo-500/10 dark:border-white/10 -rotate-12 shadow-[20px_0_100px_rgba(0,0,0,0.05)]" />

                    {/* Right Diagonal Blade (Mirror) */}
                    <div className="absolute top-0 -right-[15%] w-[45%] h-full bg-white/[0.05] dark:bg-white/[0.01] backdrop-blur-[40px] dark:backdrop-blur-[80px] border border-cyan-500/10 dark:border-white/10 rotate-12 shadow-[-20px_0_100px_rgba(0,0,0,0.05)]" />

                    {/* Horizontal Symmetrical Panel */}
                    <div className="absolute top-[25%] left-0 right-0 h-[25%] bg-white/[0.02] dark:bg-white/[0.01] backdrop-blur-[20px] border-y border-indigo-500/5 dark:border-white/5" />
                </div>

                {/* Layer 3: Interaction & Grain */}
                <motion.div
                    style={{
                        x: useTransform(springX, [-500, 500], [-20, 20]),
                        y: useTransform(springY, [-500, 500], [-20, 20]),
                    }}
                    className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent)] will-change-transform"
                />

                <div className="absolute inset-0 z-30 opacity-[0.1] dark:opacity-[0.15] pointer-events-none mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }}
                />
            </div>

            {/* --- MAIN HUD --- */}
            <motion.main
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="container mx-auto px-4 pt-32 pb-12 min-h-[calc(100svh-120px)] flex flex-col items-center justify-center relative z-10 w-full"
            >
                <div className="w-full max-w-[440px] space-y-6">
                    {/* Branding */}
                    <motion.div variants={moduleVariants} className="flex flex-col items-center gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.15)] border border-cyan-500/20">
                            <LayoutDashboard className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase leading-none">VOS ERP</h1>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-[0.3em] mt-1">Management System</p>
                        </div>
                    </motion.div>

                    {/* Form Card */}
                    <GlassCard variants={moduleVariants} className="relative overflow-hidden p-0 shadow-2xl border-white/20 dark:border-white/10" accent="indigo">
                        <div className="flex flex-col h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                            <div className="p-8 border-b border-slate-200 dark:border-white/5 flex flex-col items-center gap-2">
                                <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic text-center leading-none">
                                    Reset <span className="text-cyan-500 dark:text-cyan-400">Password</span>
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-white/20 text-center">
                                    Secure Credential Update
                                </p>
                            </div>

                            <div className="p-8 flex flex-col justify-center w-full">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Status Message */}
                                    {status && (
                                        <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                            status.type === 'success' 
                                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                        }`}>
                                            {status.message}
                                        </div>
                                    )}

                                    {/* New Password */}
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 ml-1">New Password</Label>
                                        <div className="relative group/field">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20 group-focus-within/field:text-cyan-500 transition-colors" />
                                            <Input
                                                type={showNewPassword ? "text" : "password"}
                                                required
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="h-12 pl-12 pr-12 rounded-xl bg-white/60 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all font-bold text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white transition-colors"
                                            >
                                                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Requirements */}
                                    <div className="bg-slate-500/5 dark:bg-black/20 rounded-xl p-4 border border-slate-200 dark:border-white/5">
                                        <div className="text-[9px] font-black text-slate-500 dark:text-white/20 uppercase tracking-[0.2em] mb-3">
                                            Security Requirements
                                        </div>
                                        <ul className="space-y-2">
                                            {reqs.map((req) => (
                                                <li key={req.id} className="flex items-center gap-2.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${req.met ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/10'}`} />
                                                    <span className={`text-[11px] font-bold transition-colors ${req.met ? 'text-slate-700 dark:text-white/60' : 'text-slate-400 dark:text-white/20'}`}>
                                                        {req.text}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Confirm New Password */}
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 ml-1">Confirm New Password</Label>
                                        <div className="relative group/field">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20 group-focus-within/field:text-cyan-500 transition-colors" />
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                required
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="h-12 pl-12 pr-12 rounded-xl bg-white/60 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all font-bold text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-14 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase tracking-[0.2em] text-xs transition-all hover:shadow-[0_15px_30px_-5px_rgba(6,182,212,0.4)] active:scale-[0.98] group/btn"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                                Resetting...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span>Update Password</span>
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
        </div>

    )
}
