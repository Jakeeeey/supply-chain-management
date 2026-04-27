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

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "Enter") {
        const tag = buffer.current.trim();
        buffer.current = "";
        if (tag) onScan(tag);
      } else if (e.key.length === 1) {
        buffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan, enabled]);
}
