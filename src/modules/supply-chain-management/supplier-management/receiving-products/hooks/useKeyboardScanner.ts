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

            // ✅ User request: Only rely on "Enter" key to complete the scan.
            // Removed strict `maxDelayMs` check to prevent missing characters when the RFID scanner types unevenly.
            // if (lastTsRef.current && now - lastTsRef.current > maxDelayMs) {
            //     bufferRef.current = "";
            // }
            lastTsRef.current = now;

            if (e.key === endKey) {
                e.preventDefault(); // prevent form submit
                const value = bufferRef.current.trim();
                bufferRef.current = "";

                // Reject if too short
                if (value.length < minLength) return;

                // ✅ User Request: "maging mabilis , para makasabay sa bilis ng rfid reader."
                // Removed `processingRef` and `cooldownMs` locks to allow full-speed concurrent rapid scanning.

                lastScanTsRef.current = now;

                // Fire scan immediately without blocking the next scan
                onScan(value);
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
