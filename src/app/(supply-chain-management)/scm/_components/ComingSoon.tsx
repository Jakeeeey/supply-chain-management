// src/app/(supply-chain-management)/scm/_components/ComingSoon.tsx
import * as React from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export type ComingSoonProps = {
    title?: string;
    description?: string;

    /**
     * Backward compatibility (not rendered):
     * Some pages might still pass these props from earlier versions.
     */
    moduleLabel?: string;
    statusLabel?: string;
    scope?: string[];
    showPreview?: boolean;
};

export default function ComingSoon({
                                       title = "Not Available Yet",
                                       description = "This page is currently unavailable. It will appear once the feature is ready and enabled.",
                                   }: ComingSoonProps) {
    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
            <Card className="relative overflow-hidden">
                {/* subtle theme-aligned background */}
                <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_300px_at_50%_0%,hsl(var(--muted))_0%,transparent_60%),radial-gradient(600px_220px_at_80%_70%,hsl(var(--accent))_0%,transparent_65%)] opacity-60" />

                <CardHeader className="space-y-3 text-center">
                    <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
                        {title}
                    </CardTitle>
                    <CardDescription className="mx-auto max-w-xl text-sm leading-relaxed md:text-base">
                        {description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                    <div className="relative overflow-hidden rounded-2xl border bg-background/40 p-8 md:p-10">
                        {/* inner glow */}
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_220px_at_50%_20%,hsl(var(--muted))_0%,transparent_60%)] opacity-50" />

                        {/* Lock + Document SVG (theme-aware via currentColor) */}
                        <svg
                            viewBox="0 0 360 220"
                            role="img"
                            aria-label="Not Available Yet"
                            className="relative mx-auto h-52 w-full max-w-lg text-muted-foreground/80 md:h-60"
                            fill="none"
                        >
                            {/* soft panel */}
                            <rect
                                x="22"
                                y="22"
                                width="316"
                                height="176"
                                rx="18"
                                className="fill-background"
                                opacity="0.55"
                            />
                            <rect
                                x="22"
                                y="22"
                                width="316"
                                height="176"
                                rx="18"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                opacity="0.22"
                            />

                            {/* document */}
                            <rect
                                x="98"
                                y="44"
                                width="164"
                                height="128"
                                rx="14"
                                stroke="currentColor"
                                strokeWidth="2"
                                opacity="0.85"
                            />

                            {/* folded corner */}
                            <path
                                d="M238 44v22c0 7.7 6.3 14 14 14h22"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                                opacity="0.85"
                            />
                            <path
                                d="M238 44h12c16 0 28 12 28 28v12"
                                stroke="currentColor"
                                strokeWidth="2"
                                opacity="0.22"
                            />

                            {/* document lines */}
                            <path
                                d="M118 88h122"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                opacity="0.45"
                            />
                            <path
                                d="M118 112h102"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                opacity="0.45"
                            />
                            <path
                                d="M118 136h84"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                opacity="0.45"
                            />

                            {/* lock (overlay bottom-right) */}
                            <g opacity="0.92">
                                <rect
                                    x="238"
                                    y="126"
                                    width="66"
                                    height="54"
                                    rx="12"
                                    className="fill-background"
                                    opacity="0.9"
                                />
                                <rect
                                    x="238"
                                    y="126"
                                    width="66"
                                    height="54"
                                    rx="12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    opacity="0.85"
                                />

                                <path
                                    d="M254 126v-10c0-14 10-24 22-24s22 10 22 24v10"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity="0.85"
                                />

                                <path
                                    d="M271 151a8.5 8.5 0 1 1 17 0c0 3.5-2.1 6.5-5.3 7.7v8.3h-6.4v-8.3a8.5 8.5 0 0 1-5.3-7.7Z"
                                    className="fill-muted-foreground/20"
                                />
                                <path
                                    d="M271 151a8.5 8.5 0 1 1 17 0c0 3.5-2.1 6.5-5.3 7.7v8.3h-6.4v-8.3a8.5 8.5 0 0 1-5.3-7.7Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    opacity="0.28"
                                />
                            </g>
                        </svg>
                    </div>

                    {/* ✅ Updated bottom text (generic, more professional) */}
                    <p className="mt-4 text-center text-xs text-muted-foreground">
                        This section is not enabled in the current build.
                        <span className="block">
              If you expected content here, please contact your administrator.
            </span>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
