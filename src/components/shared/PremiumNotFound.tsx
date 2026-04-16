"use client";

import React from "react";
import Link from "next/link";
import { MoveLeft, Sparkles, LayoutPanelLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PremiumNotFoundProps {
    title?: string;
    subtitle?: string;
    description?: string;
}

export function PremiumNotFound({
    title = "Not Available Yet",
    subtitle = "FEATURE UNDER DEVELOPMENT",
    description = "This module is currently being finalized. Our team is working hard to bring this feature to life with the highest standards of precision and quality."
}: PremiumNotFoundProps) {
    return (
        <div className="relative flex h-full min-h-[85vh] w-full flex-col items-center justify-center overflow-hidden px-4">
            {/* Background Aesthetic Elements */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            
            {/* Animated Glows */}
            <div className="absolute -left-20 top-20 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px] animate-pulse" />
            <div className="absolute -right-20 bottom-20 h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[100px] animate-pulse delay-700" />

            <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
                {/* Icon Container with Glassmorphism */}
                <div className="group relative mb-8 flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rotate-45 rounded-3xl bg-primary/10 blur-xl transition-all duration-500 group-hover:bg-primary/20 group-hover:scale-125" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-background/50 shadow-2xl backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1">
                        <LayoutPanelLeft className="h-10 w-10 text-primary drop-shadow-[0_0_8px_rgba(234,22,57,0.4)]" />
                        <div className="absolute -right-1 -top-1">
                            <Sparkles className="h-5 w-5 text-amber-400 animate-bounce" />
                        </div>
                    </div>
                </div>

                {/* Typography Stack */}
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
                            {subtitle}
                        </span>
                    </div>

                    <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                        {title.split(" ").map((word, i) => (
                            <span key={i} className={cn(i === 2 && "text-transparent bg-clip-text bg-gradient-to-r from-primary to-rose-500")}>
                                {word}{" "}
                            </span>
                        ))}
                    </h1>

                    <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground/80 sm:text-base">
                        {description}
                    </p>
                </div>

                {/* Action Controls */}
                <div className="mt-12 flex flex-col items-center gap-6 sm:flex-row">
                    <Button
                        asChild
                        size="lg"
                        className="h-12 rounded-full px-8 font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_-10px_rgba(234,22,57,0.4)]"
                    >
                        <Link href="/hrm">
                            <MoveLeft className="mr-2 h-4 w-4" />
                            Return to Dashboard
                        </Link>
                    </Button>
                </div>

                {/* Status Indicator */}
                <div className="mt-16 flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                        System Build: Stable V2.0.4
                    </span>
                </div>
            </div>

            {/* Bottom Gradient Line */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        </div>
    );
}
