"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  FileText,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttachmentViewerModalProps {
  open: boolean;
  fileUrl: string;
  filename?: string;
  isImage?: boolean;
  onClose: () => void;
}

const MIN_ZOOM = 25;
const MAX_ZOOM = 300;
const ZOOM_STEP = 25;

export function AttachmentViewerModal({
  open,
  fileUrl,
  filename,
  isImage = false,
  onClose,
}: AttachmentViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  // Track the last "open + file" combo so we can reset when a new file opens.
  // Calling setState during render (not inside useEffect) is the React-recommended
  // pattern for resetting derived state based on a prop change.
  const [prevOpenFile, setPrevOpenFile] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset zoom/rotation each time a different file is opened
  if (open && fileUrl !== prevOpenFile) {
    setPrevOpenFile(fileUrl);
    setZoom(100);
    setRotation(0);
  }
  if (!open && prevOpenFile !== "") {
    setPrevOpenFile("");
  }

  // Esc to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  const rotateLeft = () => setRotation((r) => r - 90);
  const rotateRight = () => setRotation((r) => r + 90);

  /** Open in a new tab with the image centered on a dark background */
  const openInNewTab = () => {
    if (isImage) {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${filename ?? "Attachment"}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%; height: 100%;
      background: #18181b;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      max-width: 95vw;
      max-height: 95vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6);
    }
  </style>
</head>
<body>
  <img src="${fileUrl}" alt="${filename ?? "Attachment"}" />
</body>
</html>`;
      const newTab = window.open("", "_blank");
      if (newTab) {
        newTab.document.write(html);
        newTab.document.close();
      }
    } else {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!open) return null;

  const isRotated90 = Math.abs(rotation % 180) === 90;

  return (
    /* Backdrop */
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Attachment Viewer"
    >
      {/* ── Card ── */}
      <div
        className="bg-background rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ width: "min(600px, 95vw)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              {isImage ? (
                <ImageIcon className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </div>
            <span
              className="text-sm font-semibold text-foreground truncate"
              title={filename}
            >
              {filename || "Attachment"}
            </span>
          </div>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-5 bg-muted/20 min-h-0">
          {isImage ? (
            <div
              className="transition-transform duration-200 ease-out origin-center"
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom / 100})`,
                maxWidth: isRotated90 ? "70vh" : "100%",
                maxHeight: isRotated90 ? "100%" : "60vh",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={filename || "Attachment"}
                className="rounded-xl shadow-lg object-contain select-none block"
                style={{
                  maxWidth: isRotated90 ? "70vh" : "100%",
                  maxHeight: isRotated90 ? "100%" : "60vh",
                }}
                draggable={false}
              />
            </div>
          ) : (
            <div
              className="transition-transform duration-200 ease-out origin-center w-full"
              style={{ transform: `rotate(${rotation}deg) scale(${zoom / 100})` }}
            >
              <iframe
                src={fileUrl}
                title={filename || "Attachment"}
                className="w-full rounded-xl shadow-lg bg-white"
                style={{ height: "55vh", minHeight: "300px", border: "none" }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-3 bg-background">
          {/* Zoom + Rotate controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={rotateLeft}
              title="Rotate Left"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={rotateRight}
              title="Rotate Right"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              title="Zoom Out"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-semibold text-muted-foreground w-10 text-center tabular-nums select-none">
              {zoom}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              title="Zoom In"
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 px-5 rounded-lg font-semibold text-sm"
            >
              Close
            </Button>
            <Button
              onClick={openInNewTab}
              className="h-9 px-5 rounded-lg font-semibold text-sm gap-2 bg-primary hover:bg-primary/90"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
