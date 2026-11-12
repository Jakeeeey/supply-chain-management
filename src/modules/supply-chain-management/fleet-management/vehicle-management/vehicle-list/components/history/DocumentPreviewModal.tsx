"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, FileText, Loader2, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

export interface DocumentPreviewTarget {
  fileId: string;
  fileName?: string | null;
  documentType?: string | null;
  documentNo?: string | null;
  remarks?: string | null;
}

interface DocumentPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentPreviewTarget | null;
}

export function DocumentPreviewModal({
  open,
  onOpenChange,
  document: doc,
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = React.useState(true);
  const [zoom, setZoom] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      setZoom(100);
      setRotation(0);
      setLoadError(false);
    }
  }, [open, doc?.fileId]);

  if (!doc) return null;

  const fileUrl = `/api/scm/fleet-management/vehicle-management/vehicle-list/assets/${encodeURIComponent(doc.fileId)}`;
  const ext = (doc.fileName || "").split(".").pop()?.toLowerCase() || "";
  const isPdf = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif", "heic", "svg"].includes(ext) || !isPdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[94vw] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b flex flex-row items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <DialogTitle className="text-sm font-semibold truncate max-w-[320px] sm:max-w-md">
                {doc.fileName || `Document #${doc.fileId}`}
              </DialogTitle>
              {doc.documentType && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                  {doc.documentType}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3">
              {doc.documentNo && <span>No: {doc.documentNo}</span>}
              {doc.remarks && <span>• {doc.remarks}</span>}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-1.5 mr-6">
            {isImage && !loadError && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-[11px] font-mono text-muted-foreground w-10 text-center">
                  {zoom}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.min(250, z + 25))}
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </>
            )}

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs ml-1"
            >
              <a href={fileUrl} target="_blank" rel="noreferrer" download={doc.fileName || true}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
            >
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </DialogHeader>

        {/* Viewer Body */}
        <div className="relative flex-1 min-h-[420px] max-h-[76vh] bg-muted/30 overflow-auto flex items-center justify-center p-4">
          {loading && !loadError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading preview...</span>
            </div>
          )}

          {loadError ? (
            <div className="text-center space-y-3 p-6">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-medium text-foreground">Preview cannot be displayed directly.</p>
              <p className="text-xs text-muted-foreground">The file might be restricted or in an unsupported format.</p>
              <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                <a href={fileUrl} target="_blank" rel="noreferrer" download={doc.fileName || true}>
                  <Download className="h-3.5 w-3.5" />
                  Download File
                </a>
              </Button>
            </div>
          ) : isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              title={doc.fileName || "PDF Document"}
              className="w-full h-full min-h-[560px] rounded border bg-background"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setLoadError(true);
              }}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={doc.fileName || "Document"}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-in-out",
                }}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-md shadow-xs"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setLoadError(true);
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

