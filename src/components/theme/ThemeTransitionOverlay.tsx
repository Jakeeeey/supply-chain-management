"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

// ─────────────────────────────────────────────
// Context so ModeToggle can trigger the animation
// ─────────────────────────────────────────────
interface ThemeTransitionCtx {
    triggerTransition: (nextTheme: string) => void
}

const ThemeTransitionContext = React.createContext<ThemeTransitionCtx>({
    triggerTransition: () => { },
})

export function useThemeTransition() {
    return React.useContext(ThemeTransitionContext)
}

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const BAND_COUNT = 4
const STAGGER = 0.045    // delay between each band
const SWEEP_DURATION = 1.2//how fast each band travels

// ─────────────────────────────────────────────
// Provider — wraps the app, renders the overlay
// ─────────────────────────────────────────────
export function ThemeTransitionProvider({ children }: { children: React.ReactNode }) {
    const { setTheme, resolvedTheme } = useTheme()
    const [phase, setPhase] = React.useState<"idle" | "in" | "hold" | "out">("idle")
    const [pendingTheme, setPendingTheme] = React.useState<string | null>(null)
    const [targetTheme, setTargetTheme] = React.useState<string>("dark")

    function triggerTransition(nextTheme: string) {
        const effective = nextTheme === "system"
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : nextTheme
        if (effective === resolvedTheme || phase !== "idle") return

        setTargetTheme(effective)
        setPendingTheme(nextTheme)
        setPhase("in")
    }

    // When all bands have swept in → swap theme → sweep out
    const totalInTime = (BAND_COUNT - 1) * STAGGER + SWEEP_DURATION
    React.useEffect(() => {
        if (phase === "in") {
            const t = setTimeout(() => {
                if (pendingTheme) setTheme(pendingTheme)
                setPhase("hold")
                setTimeout(() => setPhase("out"), 700)
            }, totalInTime * 1000 + 20)
            return () => clearTimeout(t)
        }
        if (phase === "out") {
            const totalOutTime = (BAND_COUNT - 1) * STAGGER + SWEEP_DURATION
            const t = setTimeout(() => {
                setPhase("idle")
                setPendingTheme(null)
            }, totalOutTime * 1000 + 100)
            return () => clearTimeout(t)
        }
    }, [phase, pendingTheme, setTheme, totalInTime])

    const isGoingDark = targetTheme === "dark"
    const active = phase !== "idle"

    // Band colors — dark sweep uses deep slate tones, light sweep uses pearl whites
    const bands = isGoingDark
        ? ["#020617", "#030a1a", "#041020", "#051528", "#020617"]
        : ["#f8fafc", "#f1f5f9", "#e8edf5", "#f1f5f9", "#f8fafc"]

    // Text color contrast
    const textColor = isGoingDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)"
    const subColor = isGoingDark ? "rgba(6,182,212,0.7)" : "rgba(6,182,212,0.9)"

    return (
        <ThemeTransitionContext.Provider value={{ triggerTransition }}>
            {children}

            <AnimatePresence>
                {active && (
                    <motion.div
                        key="theme-veil"
                        className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
                    >
                        {/* Diagonal band sweep */}
                        {bands.map((color, i) => {
                            const entryDelay = i * STAGGER
                            const exitDelay = (BAND_COUNT - 1 - i) * STAGGER

                            return (
                                <motion.div
                                    key={i}
                                    className="absolute top-0 bottom-0"
                                    style={{
                                        left: `${(i / BAND_COUNT) * 100 - 5}%`,
                                        width: `${100 / BAND_COUNT + 5}%`,
                                        background: color,
                                        // skew gives the diagonal slash look
                                        skewX: "-8deg",
                                        transformOrigin: "top left",
                                    }}
                                    initial={{ y: "-105%" }}
                                    animate={
                                        phase === "in" || phase === "hold"
                                            ? { y: "0%" }
                                            : { y: "105%" }
                                    }
                                    transition={{
                                        duration: SWEEP_DURATION,
                                        delay: phase === "in" ? entryDelay : exitDelay,
                                        ease: [0.76, 0, 0.24, 1],
                                    }}
                                />
                            )
                        })}

                        {/* Center text — visible only during hold, fades out immediately on outro */}
                        <motion.div
                            className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: phase === "hold" ? 1 : 0,
                            }}
                            transition={{ duration: phase === "hold" ? 0.1 : 0.25, ease: "easeOut" }}
                        >
                            <div className="flex flex-col items-center gap-1 select-none">
                                <span
                                    className="text-[9px] font-black uppercase tracking-[0.4em]"
                                    style={{ color: subColor }}
                                >
                                    Switching to
                                </span>
                                <span
                                    className="text-3xl font-black uppercase tracking-tighter leading-none"
                                    style={{ color: textColor }}
                                >
                                    {isGoingDark ? "Dark Mode" : "Light Mode"}
                                </span>
                            </div>

                            {/* Animated bar */}
                            <motion.div
                                className="h-[2px] rounded-full"
                                style={{ background: subColor }}
                                initial={{ width: 0 }}
                                animate={{ width: phase === "hold" ? "80px" : 0 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ThemeTransitionContext.Provider>
    )
}
