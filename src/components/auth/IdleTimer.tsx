"use client";

import * as React from "react";
import { toast } from "sonner";

const IDLE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const WARNING_BEFORE = 15 * 60 * 1000; // 15 minute warning (at 23h 45m)

export function IdleTimer() {
    const [isIdle, setIsIdle] = React.useState(false);
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const warningRef = React.useRef<NodeJS.Timeout | null>(null);

    const logout = React.useCallback(async () => {
        try {
            // Attempt silent logout
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {
            // Ignore error
        }
        toast.info("Session Expired", {
            description: "You have been logged out due to inactivity.",
            duration: 10000,
        });
        window.location.href = "/login";
    }, []);

    const resetTimerRef = React.useRef<() => void>(() => { });

    const resetTimer = React.useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);

        // Don't restart if already idle
        if (isIdle) return;

        // Set warning at 23 hours 45 minutes
        warningRef.current = setTimeout(() => {
            toast.warning("Inactivity Warning", {
                description: "Your session will expire in 15 minutes due to inactivity. Move your mouse or type to stay logged in.",
                duration: 15 * 60 * 1000,
                action: {
                    label: "I'm back",
                    onClick: () => resetTimerRef.current(),
                },
            });
        }, IDLE_TIMEOUT - WARNING_BEFORE);

        // Set logout at 24 hours
        timeoutRef.current = setTimeout(() => {
            setIsIdle(true);
            logout();
        }, IDLE_TIMEOUT);
    }, [isIdle, logout]);

    React.useEffect(() => {
        resetTimerRef.current = resetTimer;
    }, [resetTimer]);

    React.useEffect(() => {
        const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

        const handleActivity = () => {
            if (isIdle) return;
            resetTimer();
        };

        events.forEach((e) => window.addEventListener(e, handleActivity));
        resetTimer(); // Initialize

        return () => {
            events.forEach((e) => window.removeEventListener(e, handleActivity));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningRef.current) clearTimeout(warningRef.current);
        };
    }, [isIdle, resetTimer]);

    return null; // Side-effect only component
}
