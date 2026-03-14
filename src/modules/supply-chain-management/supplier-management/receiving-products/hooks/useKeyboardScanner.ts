"use client";

import * as React from "react";

type Options = {
    enabled: boolean;
    onScan: (value: string) => void;
    minLength?: number;
    endKey?: "Enter" | "Tab";
    maxDelayMs?: number; // max delay between chars to consider it a scan
    cooldownMs?: number; // min delay between accepted scans
};

export function useKeyboardScanner({
    enabled,
    onScan,
    minLength = 6,
    endKey = "Enter",
    maxDelayMs = 50,
    cooldownMs = 300,
}: Options) {
    const bufferRef = React.useRef<string>("");
    const lastTsRef = React.useRef<number>(0);
    const lastScanTsRef = React.useRef<number>(0);
    const processingRef = React.useRef<boolean>(false);

    React.useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (e: KeyboardEvent) => {
            // Skip if an input/textarea is focused (user is typing lot/expiry)
            const tag = (document.activeElement?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select") return;

            const now = Date.now();

            // If too slow between chars, reset — not a scanner
            if (lastTsRef.current && now - lastTsRef.current > maxDelayMs) {
                bufferRef.current = "";
            }
            lastTsRef.current = now;

            if (e.key === endKey) {
                e.preventDefault(); // prevent form submit
                const value = bufferRef.current.trim();
                bufferRef.current = "";

                // Reject if too short, processing, or within cooldown
                if (value.length < minLength) return;
                if (processingRef.current) return;
                if (now - lastScanTsRef.current < cooldownMs) return;

                processingRef.current = true;
                lastScanTsRef.current = now;

                // Fire scan and unlock after resolve
                Promise.resolve(onScan(value)).finally(() => {
                    processingRef.current = false;
                });
                return;
            }

            // Ignore control keys
            if (e.key.length !== 1) return;

            bufferRef.current += e.key;
        };

        window.addEventListener("keydown", onKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
    }, [enabled, endKey, maxDelayMs, minLength, cooldownMs, onScan]);
}
