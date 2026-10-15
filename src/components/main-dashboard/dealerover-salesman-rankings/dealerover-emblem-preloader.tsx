"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";

interface DealeroverEmblemPreloaderProps {
    /** Text displayed below the assembling emblem */
    label?: string;
    /** Subtext or progress message */
    sublabel?: string;
    /** Scale multiplier for the emblem */
    size?: "sm" | "md" | "lg";
    /** Optional callback invoked every time one complete assembly cycle finishes */
    onCycleComplete?: () => void;
}

export function DealeroverEmblemPreloader({
    label = "Loading Sales Rankings...",
    sublabel = "Please wait...",
    size = "md",
    onCycleComplete,
}: DealeroverEmblemPreloaderProps) {
    const sizeConfig = {
        sm: { emblemSize: 80 },
        md: { emblemSize: 120 },
        lg: { emblemSize: 160 },
    }[size];

    const onCycleCompleteRef = React.useRef(onCycleComplete);
    React.useEffect(() => {
        onCycleCompleteRef.current = onCycleComplete;
    }, [onCycleComplete]);

    // Refs for GSAP targets
    const haloRef        = React.useRef<HTMLDivElement>(null);
    const arc1Ref        = React.useRef<SVGPathElement>(null);
    const arc2Ref        = React.useRef<SVGPathElement>(null);
    const arc3Ref        = React.useRef<SVGPathElement>(null);
    const topHalfRef     = React.useRef<HTMLDivElement>(null);
    const bottomHalfRef  = React.useRef<HTMLDivElement>(null);
    const intactRef      = React.useRef<HTMLDivElement>(null);
    const flashRef       = React.useRef<HTMLDivElement>(null);
    const shimmerRef     = React.useRef<HTMLDivElement>(null);
    const containerRef   = React.useRef<HTMLDivElement>(null);

    // Run the GSAP timeline in a seamless cycle
    React.useEffect(() => {
        const ctx = gsap.context(() => {
            let activeTl: gsap.core.Timeline | null = null;

            function runCycle() {
                const tl = gsap.timeline({
                    onComplete: () => {
                        if (onCycleCompleteRef.current) {
                            onCycleCompleteRef.current();
                        }
                        runCycle();
                    },
                });
                activeTl = tl;

                // ── 0. Initial States ──
                tl.set([arc1Ref.current, arc2Ref.current, arc3Ref.current], { opacity: 0 });
                tl.set(flashRef.current, { opacity: 0, scale: 0.3 });
                tl.set(shimmerRef.current, { x: "-150%", opacity: 0 });
                tl.set(intactRef.current, { opacity: 0, scale: 1 });

                // ── 1. Halo pulse (gentle breathing) ──
                tl.fromTo(
                    haloRef.current,
                    { opacity: 0.15, scale: 0.8 },
                    { opacity: 0.6, scale: 1.25, duration: 1.1, ease: "power2.out" },
                    0
                ).to(
                    haloRef.current,
                    { opacity: 0.25, scale: 1, duration: 1.4, ease: "power2.inOut" },
                    1.1
                );

                // ── 2. Lightning Arc 1 ──
                tl.fromTo(
                    arc1Ref.current,
                    { strokeDashoffset: 200, strokeDasharray: 200, opacity: 0 },
                    { strokeDashoffset: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
                    0.05
                ).to(
                    arc1Ref.current,
                    { opacity: 0, duration: 0.35, ease: "power2.in" },
                    0.65
                );

                // ── 3. Lightning Arc 2 ──
                tl.fromTo(
                    arc2Ref.current,
                    { strokeDashoffset: 220, strokeDasharray: 220, opacity: 0 },
                    { strokeDashoffset: 0, opacity: 1, duration: 0.45, ease: "power3.out" },
                    0.25
                ).to(
                    arc2Ref.current,
                    { opacity: 0, duration: 0.3, ease: "power2.in" },
                    0.8
                );

                // ── 4. Impact spark ──
                tl.fromTo(
                    arc3Ref.current,
                    { opacity: 0, scale: 0.5, transformOrigin: "50% 50%" },
                    { opacity: 1, scale: 1.4, duration: 0.2, ease: "power3.out" },
                    0.75
                ).to(
                    arc3Ref.current,
                    { opacity: 0, scale: 2, duration: 0.25, ease: "power2.in" },
                    0.95
                );

                // ── 5. Halves snap in ──
                tl.fromTo(
                    topHalfRef.current,
                    { x: -28, y: -24, rotationZ: -12, rotationX: 20, opacity: 0, scale: 0.85 },
                    {
                        x: 0, y: 0, rotationZ: 0, rotationX: 0,
                        opacity: 1, scale: 1,
                        duration: 0.85,
                        ease: "expo.out",
                    },
                    0.05
                );

                tl.fromTo(
                    bottomHalfRef.current,
                    { x: 28, y: 24, rotationZ: 12, rotationX: -20, opacity: 0, scale: 0.85 },
                    {
                        x: 0, y: 0, rotationZ: 0, rotationX: 0,
                        opacity: 1, scale: 1,
                        duration: 0.85,
                        ease: "expo.out",
                    },
                    0.05
                );

                // ── 6. Impact Flash & Intact Emblem Swap (Seamless seam fix) ──
                tl.fromTo(
                    flashRef.current,
                    { opacity: 0, scale: 0.4 },
                    { opacity: 0.8, scale: 1.15, duration: 0.15, ease: "power3.out" },
                    0.82
                ).to(
                    flashRef.current,
                    { opacity: 0, scale: 1.8, duration: 0.35, ease: "power2.out" },
                    0.97
                );

                // At the peak of the flash (0.88s), reveal the seamless intact emblem and hide the split halves
                tl.to(intactRef.current, { opacity: 1, duration: 0.12, ease: "none" }, 0.88);
                tl.to([topHalfRef.current, bottomHalfRef.current], { opacity: 0, duration: 0.12, ease: "none" }, 0.88);

                // ── 7. Shimmer Sweep (Smooth gradient sweep, NO abrupt 0.01s pop) ──
                tl.fromTo(
                    shimmerRef.current,
                    { x: "-140%", opacity: 0 },
                    { x: "-20%", opacity: 0.5, duration: 0.35, ease: "power1.out" },
                    1.05
                ).to(
                    shimmerRef.current,
                    { x: "140%", opacity: 0, duration: 0.45, ease: "power1.in" },
                    1.4
                );

                // ── 8. Smooth loop transition: fade out intact emblem before next cycle begins ──
                // Holds until 2.3s, then smoothly dissolves so the next assembly doesn't pop/snap back
                tl.to(
                    intactRef.current,
                    { opacity: 0, scale: 0.95, duration: 0.4, ease: "power2.inOut" },
                    2.35
                );
            }

            runCycle();

            return () => {
                if (activeTl) {
                    activeTl.kill();
                }
            };
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div
            ref={containerRef}
            className="flex flex-col items-center justify-center select-none pointer-events-none w-full py-10"
        >
            <div
                className="relative flex items-center justify-center"
                style={{
                    width: sizeConfig.emblemSize * 1.5,
                    height: sizeConfig.emblemSize * 1.5,
                    perspective: 1000,
                }}
            >
                {/* 1. Ambient golden halo */}
                <div
                    ref={haloRef}
                    className="absolute rounded-full bg-gradient-to-tr from-amber-500/25 via-yellow-400/30 to-amber-600/10 blur-2xl pointer-events-none"
                    style={{
                        width: sizeConfig.emblemSize * 1.4,
                        height: sizeConfig.emblemSize * 1.4,
                        opacity: 0.15,
                    }}
                />

                {/* 2. Lightning arcs SVG */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                    viewBox="0 0 200 200"
                >
                    <defs>
                        <linearGradient id="lgGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%"   stopColor="#FEF08A" stopOpacity="0.95" />
                            <stop offset="50%"  stopColor="#F59E0B" stopOpacity="1"    />
                            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8"  />
                        </linearGradient>
                        <filter id="lgGlow">
                            <feGaussianBlur stdDeviation="2.5" result="glow" />
                            <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <path
                        ref={arc1Ref}
                        d="M 60,65 Q 80,40 100,50 T 130,45"
                        fill="none"
                        stroke="url(#lgGold)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        filter="url(#lgGlow)"
                        style={{ opacity: 0 }}
                    />
                    <path
                        ref={arc2Ref}
                        d="M 140,80 Q 110,105 90,120 T 70,145"
                        fill="none"
                        stroke="url(#lgGold)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        filter="url(#lgGlow)"
                        style={{ opacity: 0 }}
                    />
                    <path
                        ref={arc3Ref}
                        d="M 85,95 L 105,100 L 100,115 L 125,110"
                        fill="none"
                        stroke="#FFFBEB"
                        strokeWidth="2"
                        strokeLinecap="round"
                        filter="url(#lgGlow)"
                        style={{ opacity: 0 }}
                    />
                </svg>

                {/* 3. Emblem halves + intact emblem + effects */}
                <div
                    className="relative flex items-center justify-center transform-gpu"
                    style={{ width: sizeConfig.emblemSize, height: sizeConfig.emblemSize }}
                >
                    {/* Top half */}
                    <div
                        ref={topHalfRef}
                        className="absolute inset-0 pointer-events-none transform-gpu will-change-transform"
                        style={{
                            clipPath: "polygon(0% 0%, 100% 0%, 100% 50%, 52% 50%, 28% 78%, 0% 84%)",
                            opacity: 0,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/dealerover-emblem.svg"
                            alt=""
                            aria-hidden="true"
                            className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(245,158,11,0.45)]"
                        />
                    </div>

                    {/* Bottom half */}
                    <div
                        ref={bottomHalfRef}
                        className="absolute inset-0 pointer-events-none transform-gpu will-change-transform"
                        style={{
                            clipPath: "polygon(100% 100%, 0% 100%, 0% 82%, 28% 76%, 52% 48%, 100% 48%)",
                            opacity: 0,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/dealerover-emblem.svg"
                            alt=""
                            aria-hidden="true"
                            className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(245,158,11,0.45)]"
                        />
                    </div>

                    {/* Intact Seamless Emblem (Active once halves assemble, removing any 1px seams) */}
                    <div
                        ref={intactRef}
                        className="absolute inset-0 pointer-events-none transform-gpu"
                        style={{ opacity: 0 }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/dealerover-emblem.svg"
                            alt=""
                            aria-hidden="true"
                            className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(245,158,11,0.45)]"
                        />
                    </div>

                    {/* Impact flash */}
                    <div
                        ref={flashRef}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-white blur-md pointer-events-none"
                        style={{ opacity: 0 }}
                    />

                    {/* Shimmer sweep */}
                    <div
                        ref={shimmerRef}
                        className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
                        style={{ opacity: 0 }}
                    >
                        <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-12 blur-[2px]" />
                    </div>
                </div>
            </div>

            {/* Text */}
            <div className="flex flex-col items-center mt-4 text-center px-4">
                <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
                    className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {label}
                </motion.span>
                {sublabel && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.55 }}
                        transition={{ duration: 0.45, delay: 0.4, ease: "easeOut" }}
                        className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 tracking-tight"
                    >
                        {sublabel}
                    </motion.span>
                )}
            </div>
        </div>
    );
}
