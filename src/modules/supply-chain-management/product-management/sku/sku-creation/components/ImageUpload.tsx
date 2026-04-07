"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  onUpload?: (formData: FormData) => Promise<{ id: string }>;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  disabled,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type", {
        description: "Please upload an image file (PNG, JPG, etc.)",
      });
      return;
    }

    // Validate size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 5MB",
      });
      return;
    }

    if (onUpload) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await onUpload(formData);
        onChange(result.id);
        toast.success("Image uploaded successfully");
      } catch (error: unknown) {
        toast.error("Upload failed", {
          description:
            error instanceof Error ? error.message : "Could not upload image",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const imageUrl = value
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${value}`
    : null;

  return (
    <div className="space-y-4 w-full">
      <div
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-all ${
          imageUrl
            ? "border-muted bg-muted/20 h-48"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/[0.02] h-40"
        } ${disabled || isUploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() =>
          !disabled && !isUploading && fileInputRef.current?.click()
        }
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
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
        ) : imageUrl ? (
          <div className="relative w-full h-full group">
            <Image
              src={imageUrl}
              alt="Product Image"
              fill
              className="object-contain p-2 rounded-md"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Click to upload image</p>
              <p className="text-[10px] text-muted-foreground">
                PNG, JPG or WebP (max. 5MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
