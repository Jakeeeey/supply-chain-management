// src/components/theme/ThemeTransitionOverlay.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export default function ThemeTransitionOverlay({
                                                   active,
                                                   durationMs = 5000,
                                               }: {
    active: boolean;
    durationMs?: number;
}) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                "pointer-events-none fixed inset-0 z-[9999] bg-black/0 opacity-0",
                active && "opacity-100"
            )}
            style={{
                transition: `opacity ${durationMs}ms ease`,
                // subtle dim to make the transition feel premium
                backgroundColor: "rgba(0,0,0,0.10)",
            }}
        />
    );
}
