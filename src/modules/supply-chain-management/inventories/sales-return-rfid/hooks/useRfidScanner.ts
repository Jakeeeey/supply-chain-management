"use client";

import { useEffect, useRef } from "react";

interface RfidScannerOptions {
  onScan: (tag: string) => void;
  enabled?: boolean;
}

/**
 * Hook to capture global keyboard input from RFID scanners.
 * RFID scanners type very fast (<50ms per keystroke) and end with "Enter".
 */
export function useRfidScanner({ onScan, enabled = true }: RfidScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Scan speed threshold (usually <50ms per key)
      const isFast = diff < 50 || bufferRef.current.length === 0;

      if (e.key === "Enter") {
        if (bufferRef.current.length > 2) {
          onScan(bufferRef.current.trim());
          bufferRef.current = "";
          e.preventDefault();
        }
        return;
      }

      // Capture printable characters
      if (e.key.length === 1) {
        // If the user is typing manually in a real input (not fast), clear and skip
        if (isInput && !isFast) {
          bufferRef.current = "";
          return;
        }
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onScan]);

  return null;
}
