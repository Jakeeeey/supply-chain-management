"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { StockAdjustmentAttachment } from "../types/stock-adjustment.schema";

interface AttachmentUploadProps {
  value?: StockAdjustmentAttachment[];
  onChange: (value: StockAdjustmentAttachment[]) => void;
  disabled?: boolean;
}

export function AttachmentUpload({
  value = [],
  onChange,
  disabled
}: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; filename: string; isImage: boolean; type?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSingleSize = 10 * 1024 * 1024; // 10MB
    const maxCumulativeSize = 15 * 1024 * 1024; // 15MB

    // Calculate current total size of already staged files
    const currentTotalSize = (value || []).reduce((sum, att) => {
      if (typeof att.attachment === 'object' && att.attachment !== null) {
        return sum + Number(att.attachment.filesize || 0);
      }
      return sum;
    }, 0);

    let pendingSize = 0;
    for (const file of files) {
      if (file.size > maxSingleSize) {
        toast.error(`File "${file.name}" is too large`, {
          description: "Maximum file size is 10MB per file.",
        });
        return;
      }
      pendingSize += file.size;
    }

    if (currentTotalSize + pendingSize > maxCumulativeSize) {
      toast.error("Cumulative size limit exceeded", {
        description: `Staging these files would exceed the total limit of 15MB (Current: ${(currentTotalSize / (1024 * 1024)).toFixed(2)}MB, Attempted: ${(pendingSize / (1024 * 1024)).toFixed(2)}MB).`,
      });
      return;
    }

    setIsUploading(true);
    try {
      const newAttachments: StockAdjustmentAttachment[] = [];
      
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder_name", "stock_adjustment_attachments");

        const res = await fetch("/api/scm/inventory-management/stock-adjustment-registration/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await res.json();
        // Store the full metadata object to keep track of filesize and name
        newAttachments.push({ attachment: data.data });
      }

      onChange([...(value || []), ...newAttachments]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Could not upload file(s)";
      toast.error("Upload failed", {
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (indexToRemove: number) => {
    const newValue = (value || []).filter((_, index) => index !== indexToRemove);
    onChange(newValue);
  };

  return (
    <div className="space-y-4 w-full">
      <div
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-all border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/[0.02] h-32 ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() =>
          !disabled && !isUploading && fileInputRef.current?.click()
        }
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              Uploading...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Click to upload attachments</p>
              <p className="text-[10px] text-muted-foreground">
                Documents, Images, PDFs (max. 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground px-1 mt-2">
          <span>Staged Attachments: {value.length} file(s)</span>
          <span>
            Total Size: {(value.reduce((sum, att) => {
              if (typeof att.attachment === 'object' && att.attachment !== null) {
                return sum + Number(att.attachment.filesize || 0);
              }
              return sum;
            }, 0) / (1024 * 1024)).toFixed(2)} MB / 15.00 MB
          </span>
        </div>
      )}

      {(value && value.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {value.map((att, index) => {
            const uuid = typeof att.attachment === 'object' ? att.attachment.id : att.attachment;
            const isImage = typeof att.attachment === 'object' && att.attachment.type?.startsWith('image');
            const filename = typeof att.attachment === 'object' ? att.attachment.filename_download : uuid;
            const sizeInMb = typeof att.attachment === 'object' && att.attachment.filesize 
              ? (Number(att.attachment.filesize) / (1024 * 1024)).toFixed(2)
              : null;
            
            const directusBase = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
            const cleanBase = directusBase.trim().replace(/\/$/, "");
            const fileUrl = `${cleanBase}/assets/${uuid}`;
            
            return (
              <div key={index} className="flex items-center justify-between gap-3 p-3 bg-card border rounded-md shadow-sm relative">
                <button
                  type="button"
                  onClick={() => setPreviewFile({
                    url: fileUrl,
                    filename,
                    isImage: !!isImage,
                    type: typeof att.attachment === 'object' ? att.attachment.type : undefined
                  })}
                  className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer text-left bg-transparent border-none p-0 focus:outline-none"
                  title="Click to preview file"
                >
                  <div className="h-10 w-10 shrink-0 bg-muted rounded flex items-center justify-center text-muted-foreground">
                    {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground hover:text-primary transition-colors">{filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sizeInMb && (
                        <span className="text-[9px] text-muted-foreground font-semibold">
                          {sizeInMb} MB
                        </span>
                      )}
                      <span className="text-[9px] text-primary font-bold uppercase tracking-wider">
                        Click to view
                      </span>
                    </div>
                  </div>
                </button>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive bg-card border border-destructive/20 rounded-md transition-all shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(index);
                    }}
                    title="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 bg-card border border-border rounded-xl shadow-2xl">
            <DialogHeader className="border-b pb-3 flex flex-row items-center justify-between">
              <DialogTitle className="text-base font-bold text-foreground truncate max-w-[80%]">
                {previewFile.filename}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 rounded-lg p-4 min-h-[300px] max-h-[60vh]">
              {previewFile.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFile.url}
                  alt={previewFile.filename}
                  className="max-w-full max-h-full object-contain rounded-md shadow-md"
                />
              ) : previewFile.type === "application/pdf" ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.filename}
                  className="w-full h-full min-h-[50vh] border-0 rounded-md"
                />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-semibold text-foreground">
                    Preview not available for this file type
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You can still download or view the file in a new tab.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t mt-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setPreviewFile(null)}
                className="font-bold text-xs"
              >
                Close
              </Button>
              <a
                href={previewFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-9 px-4 rounded-md text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
              >
                Open in New Tab
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
