"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { Separator } from "@/components/ui/separator";

import type { AppFooterProps } from "./types";

export default function AppFooter(props: AppFooterProps) {
    const {
        appName,
        systemName,
        versionText = "v1.0",
        leftSlot,
        rightSlot,
        showVersion = true,
    } = props;

    return (
        <footer className="border-t bg-background">
            <Separator />
            <div
                className={cn(
                    "flex items-center justify-between gap-2 px-3 py-3 text-xs text-muted-foreground sm:px-4"
                )}
            >
                <div className="min-w-0 truncate">
                    {leftSlot ? (
                        leftSlot
                    ) : (
                        <>
                            <span className="font-medium text-foreground">{appName}</span>{" "}
                            <span>•</span> <span>{systemName}</span>
                        </>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {rightSlot ? rightSlot : null}
                    {showVersion ? <span className="opacity-80">{versionText}</span> : null}
                </div>
            </div>a
        </footer>
    );
}
