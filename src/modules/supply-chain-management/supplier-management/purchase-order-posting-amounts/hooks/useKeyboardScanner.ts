"use client";

import * as React from "react";

type Options = {
    enabled: boolean;
    onScan: (value: string) => void;
    minLength?: number;
    endKey?: "Enter" | "Tab";
    maxDelayMs?: number; // max delay between chars to consider it a scan
};

export function useKeyboardScanner({
                                       enabled,
                                       onScan,
                                       minLength = 4,
                                       endKey = "Enter",
                                       maxDelayMs = 60,
                                   }: Options) {
    const bufferRef = React.useRef<string>("");
    const lastTsRef = React.useRef<number>(0);

    React.useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();

            // If user is typing slowly, reset buffer
            if (lastTsRef.current && now - lastTsRef.current > maxDelayMs) {
                bufferRef.current = "";
            }
            lastTsRef.current = now;

            if (e.key === endKey) {
                const value = bufferRef.current.trim();
                bufferRef.current = "";
                if (value.length >= minLength) onScan(value);
                return;
            }

            // Ignore control keys
            if (e.key.length !== 1) return;

            bufferRef.current += e.key;
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [enabled, endKey, maxDelayMs, minLength, onScan]);
}
