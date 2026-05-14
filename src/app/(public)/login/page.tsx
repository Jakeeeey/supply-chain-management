// src/app/login/page.tsx
"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
    Eye,
    EyeOff,
    Lock,
    Mail,
    ArrowRight,
    ShieldCheck,
    LayoutDashboard,
    Clock,
} from "lucide-react"
import { motion, useMotionValue, useSpring, useTransform, type Variants } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { GlassCard } from "@/components/command-center/GlassCard"
import { ScanningOverlay } from "@/components/command-center/ScanningOverlay"

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

    if (
        httpStatus === 403 ||
        m === "password_reset_required"
    ) {
        return "Password reset required. An administrator has forced a password update for your account."
    }

    if (m === "account_blocked") {
        return "Your account has been permanently blocked due to security concerns. Please contact support."
    }

    if (m === "account_locked") {
        return "Your account has been temporarily locked due to too many failed attempts."
    }

    if (
        httpStatus === 429 ||
        httpStatus === 423 ||
        m.includes("too many attempts") ||
        m === "account_locked"
    ) {
        return "Your account has been temporarily locked due to too many failed attempts. Please wait for the countdown to expire."
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

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [showPw, setShowPw] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const [email, setEmail] = React.useState("")
    const [hashPassword, setHashPassword] = React.useState("")
    const [remember, setRemember] = React.useState(false)
    const [isLocked, setIsLocked] = React.useState(false)
    const [lockoutEndTime, setLockoutEndTime] = React.useState<number | string | null>(null)
    const [timeLeft, setTimeLeft] = React.useState(0)
    const [isRedirecting, setIsRedirecting] = React.useState(false)
    const [userName, setUserName] = React.useState("")

    // Mouse Parallax for Background
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })


    // --- Remember Me: Load saved email from localStorage ---
    React.useEffect(() => {
        const savedEmail = localStorage.getItem("remembered_email")
        if (savedEmail) {
            setEmail(savedEmail)
            setRemember(true)
        }
    }, [])

    // --- Countdown Timer Logic ---
    // Synchronize the countdown timer
    React.useEffect(() => {
        if (!isLocked || !lockoutEndTime) {
            setTimeLeft(0)
            return
        }

        const calculateEndTs = () => {
            if (typeof lockoutEndTime === 'string') {
                const safeStr = lockoutEndTime.replace(' ', 'T') + (lockoutEndTime.endsWith('Z') ? '' : 'Z');
                const ts = new Date(safeStr).getTime();
                return isNaN(ts) ? (Date.now() + 300000) : ts;
            }
            return lockoutEndTime;
        }

        const endTs = calculateEndTs();

        const updateTimer = () => {
            const now = Date.now()
            const diff = Math.max(0, Math.ceil((endTs - now) / 1000))
            setTimeLeft(diff)

            if (diff <= 0) {
                setIsLocked(false)
                setLockoutEndTime(null)
                return true; // Finished
            }
            return false;
        }

        // Run immediately
        if (updateTimer()) return;

        const timer = setInterval(() => {
            if (updateTimer()) clearInterval(timer);
        }, 1000)

        return () => clearInterval(timer)
    }, [isLocked, lockoutEndTime])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const validate = React.useCallback((): boolean => {
        if (!String(email).trim()) return false
        if (!String(hashPassword).trim()) return false
        return true
    }, [email, hashPassword])

    /**
     * Silently request the browser's geolocation.
     * Returns coords if the user allows, or null if they deny/skip.
     * This NEVER blocks or forces — it's best-effort only.
     */
    const getLocationSilently = (): Promise<{ latitude: number; longitude: number } | null> => {
        return new Promise((resolve) => {
            if (!navigator?.geolocation) {
                resolve(null)
                return
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => resolve(null),   // User denied — silently continue without coords
                { enableHighAccuracy: true, timeout: 8_000, maximumAge: 0 }
            )
        })
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        try {
            // Request location silently in the background.
            // If the user allows → precise coords go to the API.
            // If the user denies → API falls back to IP geolocation on the server.
            const coords = await getLocationSilently()

            const payload: Record<string, unknown> = { email, hashPassword, remember }
            if (coords) {
                payload.latitude = coords.latitude
                payload.longitude = coords.longitude
            }

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const data = await res.json().catch(() => null)

            if ((res.status === 429 || res.status === 423) &&
                (data?.message === "TOO_MANY_ATTEMPTS" || data?.message === "ACCOUNT_LOCKED")) {

                // Priority for setting end time:
                // 1. Raw DB string (best for parity)
                // 2. Relative duration + local time (best for clock desync)
                // 3. Server timestamp (fallback)
                if (data.lockUntilRaw) {
                    setLockoutEndTime(data.lockUntilRaw)
                } else if (data.lockDurationMs) {
                    setLockoutEndTime(Date.now() + data.lockDurationMs)
                } else {
                    setLockoutEndTime(data.lockedUntil)
                }

                setIsLocked(true)
                return
            }

            if (!res.ok || !data?.ok) {
                const raw = String(data?.message ?? "Sign in failed.")
                const remaining = data?.remainingAttempts

                if (raw === "ACCOUNT_BLOCKED" || (res.status === 403 && raw.includes("blocked"))) {
                    toast.error("Account Blocked", {
                        description: "Your account has been permanently blocked due to too many failed login attempts. Please contact your system administrator.",
                        duration: 10000
                    })
                    return
                }

                let description = normalizeLoginErrorMessage(raw, res.status)
                const remainingToBlock = data?.remainingUntilBlock
                const totalAttempts = data?.attempts

                if (typeof totalAttempts === "number" && totalAttempts >= 5) {
                    if (typeof remainingToBlock === "number") {
                        description = `${description} You have ${remainingToBlock} ${remainingToBlock === 1 ? 'attempt' : 'attempts'} remaining until your account is permanently blocked.`
                    }
                } else if (typeof remaining === "number" && remaining > 0 && res.status === 401) {
                    description = `${description} You have ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining before temporary lockout.`
                }

                if (raw === "PASSWORD_RESET_REQUIRED" || res.status === 403) {
                    toast.warning("Action Required", {
                        description: description,
                        duration: 8000
                    })
                    return
                }

                toast.error("Sign in failed", { description })
                return
            }

            toast.success("Welcome back!", { description: "Signing you in..." })

            // --- Remember Me: Persist or clear email in localStorage ---
            if (remember) {
                localStorage.setItem("remembered_email", email)
            } else {
                localStorage.removeItem("remembered_email")
            }

            setUserName(data.user?.firstName || "User")
            setIsRedirecting(true)

            // Extended delay to allow the 1.5s zoom-fade to finish perfectly (4.5 seconds)
            await new Promise(resolve => setTimeout(resolve, 4500))

            let next = searchParams.get("next") || "/main-dashboard"
            if (!next.startsWith("/")) next = "/main-dashboard"
            window.location.href = next
        } catch (err: unknown) {
            const errorInfo = err as { message?: string }
            const raw = errorInfo?.message ? String(errorInfo.message) : "Network error."
            toast.error("Error", { description: normalizeLoginErrorMessage(raw) })
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

            {/* --- LOGIN HUD --- */}
            <motion.main
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="container mx-auto px-4 pt-32 pb-12 min-h-[calc(100svh-120px)] flex flex-col items-center justify-center relative z-10 w-full"
            >
                {isRedirecting ? (
                    <LoginSuccessLoader userName={userName} />
                ) : (
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
                                        Account <span className="text-cyan-500 dark:text-cyan-400">Login</span>
                                    </h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-white/20 text-center">
                                        Secure Authentication Portal
                                    </p>
                                </div>

                                <div className="p-8 flex flex-col justify-center w-full">
                                    <form onSubmit={onSubmit} className="space-y-6">
                                        {/* Email */}
                                        <div className="space-y-2.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 ml-1">Email Address</Label>
                                            <div className="relative group/field">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20 group-focus-within/field:text-cyan-500 transition-colors" />
                                                <Input
                                                    id="login-email"
                                                    name="email"
                                                    type="email"
                                                    required
                                                    placeholder="your@email.com"
                                                    autoComplete="username"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="h-12 pl-12 rounded-xl bg-white/60 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-white/10 focus-visible:ring-1 focus-visible:ring-cyan-500/50 transition-all font-bold text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="space-y-2.5">
                                            <div className="flex items-center justify-between ml-1">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Password</Label>

                                            </div>
                                            <div className="relative group/field">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/20 group-focus-within/field:text-cyan-500 transition-colors" />
                                                <Input
                                                    id="login-password"
                                                    name="password"
                                                    type={showPw ? "text" : "password"}
                                                    required
                                                    placeholder="••••••••"
                                                    autoComplete="current-password"
                                                    value={hashPassword}
                                                    onChange={(e) => {
                                                        setHashPassword(e.target.value)
                                                    }}
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

                                        {/* Remember me & Forgot Password */}
                                        <div className="flex items-center justify-between ml-1">
                                            <div className="flex items-center gap-2.5">
                                                <Checkbox
                                                    id="rememberMe"
                                                    checked={remember}
                                                    onCheckedChange={(v) => setRemember(Boolean(v))}
                                                    className="w-3.5 h-3.5 border-slate-300 dark:border-white/10 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                                />
                                                <label htmlFor="rememberMe" className="text-[10px] font-bold text-slate-500 dark:text-white/40 cursor-pointer">Stay signed in on this device</label>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => router.push("/forgot-password")}
                                                className="text-[10px] font-bold text-slate-400 dark:text-white/20 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                                            >
                                                Forgot Password?
                                            </button>
                                        </div>

                                        {/* Submit */}
                                        <Button
                                            id="login-submit"
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
                )}
            </motion.main>

            {/* --- LOCKOUT HUD --- */}
            {isLocked && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-2xl">
                    <GlassCard
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-sm p-8 text-center !rounded-[2rem] border-border"
                        accent="rose"
                    >
                        <div className="mx-auto w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
                            <Clock className="w-8 h-8 text-rose-500 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black italic tracking-tighter text-foreground uppercase leading-none mb-2">
                            Access <span className="text-rose-500">Locked</span>
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-8 leading-relaxed">
                            Security protocol triggered
                        </p>

                        <div className="bg-card backdrop-blur-xl rounded-2xl p-6 mb-8 border border-border relative overflow-hidden group">
                            <ScanningOverlay />
                            <div className="text-[9px] font-black uppercase tracking-[0.5em] text-rose-500/60 mb-2">Cool-down in progress</div>
                            <div className="text-4xl font-mono font-black text-rose-500 tabular-nums drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        <Button
                            onClick={() => setIsLocked(false)}
                            className="w-full h-12 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 border border-border font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            Deactivate Overlay
                        </Button>
                    </GlassCard>
                </div>
            )}
        </div>
    )
}

function LoginSuccessLoader({ userName }: { userName: string }) {
    const [progress, setProgress] = React.useState(0)
    const [isJumping, setIsJumping] = React.useState(false)

    React.useEffect(() => {
        const startTime = Date.now()
        const duration = 2600 // Boot finishes at 2.6s, giving 400ms for icons to pack up before 3.0s jump

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const nextProgress = Math.min((elapsed / duration) * 100, 100)
            setProgress(nextProgress)
            if (nextProgress >= 100) clearInterval(interval)
        }, 30)
        return () => clearInterval(interval)
    }, [])

    const isPackingUp = progress >= 100 // Bar is full, hide everything except the name

    React.useEffect(() => {
        if (isPackingUp) {
            // Exactly 400ms after pack up starts, the name jumps (hitting absolute 3.0s mark)
            const jumpTimer = setTimeout(() => setIsJumping(true), 400)
            return () => clearTimeout(jumpTimer)
        }
    }, [isPackingUp])

    return (
        <div className="relative w-full max-w-[440px] flex flex-col items-center">
            <div className="flex flex-col items-center justify-center gap-10 w-full relative z-10">
                {/* [TOP] CORE HUD HUB */}
                <motion.div
                    animate={
                        isPackingUp
                            ? { y: -30, scale: 0.8, opacity: 0 }
                            : { y: [-4, 4, -4], scale: 1, opacity: 1 }
                    }
                    transition={
                        isPackingUp
                            ? { duration: 0.5, ease: [0.36, 0, 0.66, -0.56] } // Snappy back-in exit
                            : { y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }
                    }
                    className="relative"
                >
                    <motion.div
                        animate={{
                            rotate: 360,
                            scale: isJumping ? 2 : 1
                        }}
                        transition={{
                            rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                            scale: { duration: 1.2 }
                        }}
                        className="absolute -inset-12 border border-cyan-500/10 rounded-full"
                    />
                    <motion.div
                        animate={{
                            rotate: -360,
                            scale: isJumping ? 3 : 1
                        }}
                        transition={{
                            rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                            scale: { duration: 1.2 }
                        }}
                        className="absolute -inset-20 border border-cyan-500/5 rounded-full border-dashed"
                    />

                    <div className="relative p-8 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-[0_0_60px_rgba(6,182,212,0.3)]">
                        <LayoutDashboard className="w-14 h-14 text-cyan-400" />
                        <ScanningOverlay />

                        {/* Internal Resonance Ring */}
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-[inherit] border-2 border-cyan-500/20"
                        />
                    </div>
                </motion.div>

                {/* [CENTER] IDENTITY REVEAL */}
                <div className="text-center space-y-4">
                    <motion.div
                        key={progress > 45 ? "welcome" : "init"}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{
                            opacity: isJumping ? 0 : 1,
                            y: isJumping ? -20 : 0,
                            scale: isJumping ? 8 : 1
                        }}
                        transition={{
                            duration: isJumping ? 1.5 : 0.4, // Slowed down zoom-fade precisely matched to the remaining 1.5s window
                            ease: isJumping ? [0.22, 1, 0.36, 1] : "easeInOut"
                        }}
                        className="flex flex-col items-center"
                    >
                        {progress > 45 ? (
                            <div className="space-y-1">
                                <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                                    Welcome Back, <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">{userName}</span>
                                </h2>
                                <motion.p
                                    animate={{ opacity: isPackingUp ? 0 : 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-[9px] font-black text-cyan-500/50 uppercase tracking-[0.6em] animate-pulse"
                                >
                                    Bio-Link Confirmed
                                </motion.p>
                            </div>
                        ) : (
                            <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                                System <span className="text-cyan-400">Initializing</span>
                            </h2>
                        )}
                    </motion.div>

                    <motion.div
                        animate={{ opacity: isPackingUp ? 0 : 1 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center gap-2"
                    >
                        <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent rounded-full" />
                        <p className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-[0.5em]">
                            {progress > 45 ? "Priority Protocol Active" : "VOS Secure Core v7.2"}
                        </p>
                    </motion.div>
                </div>

                {/* [BOTTOM] PROGRESS CALIBRATION */}
                <motion.div
                    animate={isPackingUp ? { y: 30, scale: 0.8, opacity: 0 } : { y: 0, scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.36, 0, 0.66, -0.56] }}
                    className="w-full space-y-4 px-10"
                >
                    <div className="h-1.5 w-full bg-slate-200/50 dark:bg-slate-900/60 rounded-full overflow-hidden relative shadow-inner">
                        <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-cyan-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                        />
                    </div>
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                            />
                            <span className="text-[10px] font-black uppercase text-cyan-400/70 tracking-widest">
                                {progress < 25 ? "Syncing Modules..." :
                                    progress < 50 ? "Encrypting Uplink..." :
                                        progress < 75 ? "Neural Mapping..." : "Jump Sequence Initiated"}
                            </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-white/40 tabular-nums">
                            {Math.round(progress)}%
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* [SUB] SECURITY FOOTER */}
            {!isJumping && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -bottom-24 left-0 right-0 flex justify-center"
                >
                    <div className="px-5 py-2 rounded-full bg-white/40 dark:bg-black/40 border border-slate-200 dark:border-white/10 backdrop-blur-xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-white/40">Secure Session Verified // Level 04 Access</span>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
