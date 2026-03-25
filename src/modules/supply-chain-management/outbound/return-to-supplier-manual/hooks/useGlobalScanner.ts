"use client";

import { useEffect, useRef } from "react";

interface GlobalScannerOptions {
  onScan: (value: string) => void;
  enabled?: boolean;
}

/**
 * Hook to capture global keyboard input (for barcode scanners).
 * Scanners usually act as keyboards but type very fast and end with "Enter".
 */
export function useGlobalScanner({ onScan, enabled = true }: GlobalScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Skip if the user is typing in a controlled input that SHOULD HAVE FOCUS
      // (like Remarks text area)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      // We allow interaction if the input is NOT our target scan inputs 
      // but we need to be careful. Usually, scanners are fast.
      // If the target is an input, we only allow global capture if the key speed is "scanner speed".
      
      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Scan speed threshold (usually < 50ms per key)
      const isFast = diff < 50 || bufferRef.current.length === 0;

      if (e.key === "Enter") {
        if (bufferRef.current.length > 2) {
          onScan(bufferRef.current);
          bufferRef.current = "";
          e.preventDefault();
        }
        return;
      }

      // Capture printable characters
      if (e.key.length === 1) {
        // If the user is typing manually in a real input (not fast), we clear the buffer and don't capture.
        if (isInput && !isFast) {
          bufferRef.current = "";
          return;
        }

        // If it's fast OR we are not in an input, buffer it.
        bufferRef.current += e.key;
        
        // Prevent default only if we are reasonably sure it's a scan and NOT in a real input
        // or if it's super fast.
        if (!isInput && bufferRef.current.length > 0) {
           // e.preventDefault(); // Might be too aggressive
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onScan]);

  return null;
}
