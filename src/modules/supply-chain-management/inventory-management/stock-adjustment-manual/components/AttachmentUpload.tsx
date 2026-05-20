"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { StockAdjustmentAttachment } from "../types/stock-adjustment-manual.schema";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate size (e.g., 10MB max per file)
    const invalidFiles = files.filter(f => f.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error("File too large", {
        description: "Maximum file size is 10MB per file.",
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

        const res = await fetch("/api/scm/inventory-management/stock-adjustment-manual/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await res.json();
        newAttachments.push({ attachment: data.data.id });
      }

      onChange([...(value || []), ...newAttachments]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error: any) {
      toast.error("Upload failed", {
        description: error.message || "Could not upload file(s)",
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

      {(value && value.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {value.map((att, index) => {
            const uuid = typeof att.attachment === 'object' ? att.attachment.id : att.attachment;
            const isImage = typeof att.attachment === 'object' && att.attachment.type?.startsWith('image');
            const filename = typeof att.attachment === 'object' ? att.attachment.filename_download : uuid;
            
            return (
              <div key={index} className="flex items-center gap-3 p-3 bg-card border rounded-md shadow-sm relative group">
                <div className="h-10 w-10 shrink-0 bg-muted rounded flex items-center justify-center text-muted-foreground">
                  {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{filename}</p>
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity absolute right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(index);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
