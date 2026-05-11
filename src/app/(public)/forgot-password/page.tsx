"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    Mail,
    ArrowRight,
    LayoutDashboard,
    ShieldCheck,
    ArrowLeft,
    KeyRound,
    RefreshCw
} from "lucide-react"
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type Variants } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/command-center/GlassCard"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [step, setStep] = React.useState<1 | 2>(1)
    const [loading, setLoading] = React.useState(false)
    const [email, setEmail] = React.useState("")
    const [otp, setOtp] = React.useState("")
    const [sessionToken, setSessionToken] = React.useState("")

    // Countdown timers
    const [otpExpiry, setOtpExpiry] = React.useState(300) // 5 minutes
    const [resendCooldown, setResendCooldown] = React.useState(0) // 1 minute cooldown after resend
    const [otpAttempts, setOtpAttempts] = React.useState(0) // Track failed attempts

    // Mouse Parallax (matching login page)
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })

    // OTP Expiry Timer
    React.useEffect(() => {
        if (step !== 2 || otpExpiry <= 0) return
        const timer = setInterval(() => {
            setOtpExpiry(prev => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [step, otpExpiry])

    // Resend Cooldown Timer
    React.useEffect(() => {
        if (resendCooldown <= 0) return
        const timer = setInterval(() => {
            setResendCooldown(prev => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [resendCooldown])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim()) return

        setLoading(true)
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            })
            const data = await res.json()

            if (!res.ok) {
                toast.error("Error", { description: data.message || "Failed to send OTP." })
                return
            }

            setSessionToken(data.sessionToken)
            setStep(2)
            setOtpExpiry(300)
            setResendCooldown(60)
            toast.success("OTP Sent", { description: "Check your email for the verification code." })
        } catch {
            toast.error("Network Error", { description: "Please check your connection." })
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!otp.trim() || otp.length < 6) return

        setLoading(true)
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp, sessionToken }),
            })
            const data = await res.json()

            if (!res.ok) {
                const newAttempts = otpAttempts + 1
                setOtpAttempts(newAttempts)

                if (newAttempts >= 5) {
                    toast.error("Maximum Attempts Reached", {
                        description: "You have exceeded the maximum number of attempts. Redirecting to login..."
                    })
                    setTimeout(() => {
                        router.push("/login")
                    }, 3000)
                    return
                }

                toast.error("Verification Failed", {
                    description: `Invalid OTP code. ${5 - newAttempts} attempts remaining.`
                })
                return
            }

            toast.success("Success", { description: "OTP verified. Redirecting to reset password..." })
            router.push(`/reset-password/reset-password?token=${data.resetToken}`)
        } catch {
            toast.error("Network Error", { description: "Please check your connection." })
        } finally {
            setLoading(false)
        }
    }

    const handleResendOTP = async () => {
        if (resendCooldown > 0) return

        setLoading(true)
        try {
            const res = await fetch("/api/auth/resend-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionToken }),
            })
            const data = await res.json()

            if (!res.ok) {
                toast.error("Error", { description: data.message || "Failed to resend OTP." })
                return
            }

            setSessionToken(data.sessionToken)
            setResendCooldown(60)
            setOtpExpiry(300)
            toast.success("OTP Resent", { description: "Check your email for a new code." })
        } catch {
            toast.error("Network Error", { description: "Please check your connection." })
        } finally {
            setLoading(false)
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

    const stepVariants: Variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0
        })
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
                                    Forgot <span className="text-cyan-500 dark:text-cyan-400">Password</span>
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-white/20 text-center">
                                    {step === 1 ? "Account Recovery Step 01" : "Identity Verification Step 02"}
                                </p>
                            </div>

                            <div className="p-8 relative min-h-[300px] flex flex-col">
                                <AnimatePresence mode="wait" custom={step === 2 ? 1 : -1}>
                                    {step === 1 ? (
                                        <motion.div
                                            key="step1"
                                            custom={-1}
                                            variants={stepVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            className="w-full space-y-6"
                                        >
                                            <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed text-center font-medium">
                                                Enter the email address associated with your account and we&apos;ll send you a 6-digit verification code.
                                            </p>

                                            <form onSubmit={handleSendOTP} className="space-y-6">
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

                                                <Button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full h-14 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase tracking-[0.2em] text-xs transition-all hover:shadow-[0_15px_30px_-5px_rgba(6,182,212,0.4)] active:scale-[0.98] group/btn"
                                                >
                                                    {loading ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                                            Sending...
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span>Send Code</span>
                                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                        </div>
                                                    )}
                                                </Button>

                                                <button
                                                    type="button"
                                                    onClick={() => router.push("/login")}
                                                    className="w-full text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 hover:text-cyan-500 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <ArrowLeft className="w-3 h-3" />
                                                    Back to Login
                                                </button>
                                            </form>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="step2"
                                            custom={1}
                                            variants={stepVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            className="w-full space-y-6"
                                        >
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                                                        Email Verification
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${otpAttempts >= 4
                                                        ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                                        : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                                        }`}>
                                                        {Math.max(0, 5 - otpAttempts)} Attempts Left
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-white/40 leading-relaxed text-center font-medium">
                                                    We sent a code to <span className="text-slate-900 dark:text-white font-bold">{email}</span>. Code expires in <span className="text-cyan-500 font-bold font-mono">{formatTime(otpExpiry)}</span>.
                                                </p>
                                            </div>

                                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                                <div className="space-y-2.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 ml-1">6-Digit Verification Code</Label>
                                                    <div className="relative group/field">
                                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20 group-focus-within/field:text-cyan-500 transition-colors" />
                                                        <Input
                                                            type="text"
                                                            required
                                                            maxLength={6}
                                                            placeholder="000000"
                                                            value={otp}
                                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                            className="h-12 pl-12 rounded-xl bg-white/60 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all font-mono font-black text-xl tracking-[0.5em] text-center pr-12"
                                                        />
                                                    </div>
                                                </div>

                                                <Button
                                                    type="submit"
                                                    disabled={loading || otp.length < 6 || otpExpiry <= 0}
                                                    className="w-full h-14 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase tracking-[0.2em] text-xs transition-all hover:shadow-[0_15px_30px_-5px_rgba(6,182,212,0.4)] active:scale-[0.98] group/btn"
                                                >
                                                    {loading ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                                                            Verifying...
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span>Verify Code</span>
                                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                        </div>
                                                    )}
                                                </Button>

                                                <div className="flex flex-col items-center gap-4 pt-2">
                                                    <button
                                                        type="button"
                                                        disabled={resendCooldown > 0 || loading}
                                                        onClick={handleResendOTP}
                                                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20 hover:text-cyan-500 disabled:opacity-50 disabled:hover:text-slate-400 transition-colors flex items-center gap-2"
                                                    >
                                                        <RefreshCw className={`w-3 h-3 ${loading && "animate-spin"}`} />
                                                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setStep(1)}
                                                        className="text-[9px] font-bold text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white transition-colors"
                                                    >
                                                        Entered wrong email? Change it
                                                    </button>
                                                </div>
                                            </form>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="p-5 bg-slate-500/5 border-t border-slate-200 dark:border-white/5 flex items-center justify-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-500" />
                                <span className="text-[9px] font-black tracking-widest text-slate-400 dark:text-white/30 uppercase">Secure Recovery Active</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </motion.main>
        </div>

    )
}
