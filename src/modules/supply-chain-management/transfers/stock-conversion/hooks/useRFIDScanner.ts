import { useEffect, useRef } from "react";

interface RFIDScannerOptions {
  onScan: (tag: string) => void;
  enabled?: boolean;
}

/**
 * Global RFID scanner hook that listens for keyboard events.
 * Scanners typically act as HID devices that dump text and press Enter.
 */
export function useRFIDScanner({ onScan, enabled = true }: RFIDScannerOptions) {
  const buffer = useRef("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const clearBuffer = () => {
      buffer.current = "";
    };

    const resetTimeout = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(clearBuffer, 2000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "Enter") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const tag = buffer.current.trim();
        buffer.current = "";
        if (tag) onScan(tag);
      } else if (e.key.length === 1) {
        buffer.current += e.key;
        resetTimeout();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onScan, enabled]);
}
