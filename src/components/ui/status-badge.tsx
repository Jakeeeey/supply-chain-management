// src/components/ui/status-badge.tsx
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "success" | "warning" | "info" | "destructive";

export function StatusBadge({
    children,
    tone = "neutral",
    className,
}: {
    children: React.ReactNode;
    tone?: StatusTone;
    className?: string;
}) {
    const toneClass =
        tone === "success"
            ? "badge-success"
            : tone === "warning"
                ? "badge-warning"
                : tone === "info"
                    ? "badge-info"
                    : tone === "destructive"
                        ? "badge-destructive"
                        : "badge-neutral";

    return <Badge className={cn(toneClass, className)}>{children}</Badge>;
}
