"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GalleryImage,
  SKU,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageUpload } from "../../../sku-creation/components/ImageUpload";
import { skuService } from "../../../sku-creation/services/sku";

interface SKUGalleryModalProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ParentRef {
  id?: number;
  product_id?: number;
  main_image?: string | null;
}

function isParentRef(value: unknown): value is ParentRef {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function SKUGalleryModal({
  sku,
  isOpen,
  onClose,
}: SKUGalleryModalProps) {
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const parentRef = isParentRef(sku?.parent_id) ? sku.parent_id : null;
  const isChild = !!sku?.parent_id;
  const parentId = parentRef
    ? parentRef.id ?? parentRef.product_id
    : sku?.parent_id;

  const fetchGallery = useCallback(async () => {
    if (!sku) return;
    setIsLoading(true);
    try {
      const targetId = parentId || sku.id || sku.product_id;
      const res = await fetch(
        `/api/scm/product-management/sku/${targetId}/gallery`,
      );
      const result = await res.json();
      if (res.ok) setGallery(result.data || []);
      else throw new Error(result.error || "Failed to fetch gallery");
    } catch (error: unknown) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to fetch gallery",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sku, parentId]);

  useEffect(() => {
    if (isOpen && sku) fetchGallery();
    else setGallery([]);
  }, [isOpen, sku, fetchGallery]);

  const handleUpload = async (formData: FormData) => {
    if (!sku) return { id: "" };
    const id = sku.id || sku.product_id;
    const uploadRes = await skuService.uploadImage(formData, "gallery");
    const res = await fetch(`/api/scm/product-management/sku/${id}/gallery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: uploadRes.id }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to link image");
    }
    fetchGallery();
    return uploadRes;
  };

  const handleDelete = async (recordId: number) => {
    if (!sku) return;
    const id = sku.id || sku.product_id;
    setIsDeleting(recordId);
    try {
      const res = await fetch(
        `/api/scm/product-management/sku/${id}/gallery/${recordId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setGallery((prev) => prev.filter((img) => img.image_id !== recordId));
        toast.success("Image removed from gallery");
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete image");
      }
    } catch (error: unknown) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to delete image",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const displayMainImage = sku?.main_image || parentRef?.main_image || null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Product Gallery</DialogTitle>
          <DialogDescription>
            {sku?.product_name}
            {isChild && (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Inherited from Parent
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Primary image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Primary Image</p>
              <Badge variant="secondary">Primary</Badge>
            </div>
            <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden flex items-center justify-center">
              {displayMainImage ? (
                <Image
                  src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${displayMainImage}?width=500&height=300&fit=contain`}
                  alt="Primary product image"
                  fill
                  className="object-contain p-4"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 opacity-30" />
                  <span className="text-xs">No primary image set</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Gallery grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Gallery Images</p>
              {gallery.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {gallery.length} image{gallery.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {!isChild && (
                <div className="aspect-square">
                  <ImageUpload
                    value={null}
                    onChange={() => {}}
                    onUpload={handleUpload}
                  />
                </div>
              )}

              {isLoading &&
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}

              {!isLoading &&
                gallery.map((img) => (
                  <div
                    key={img.image_id}
                    className="relative group aspect-square rounded-md border bg-muted overflow-hidden"
                  >
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/${img.image}?width=200&height=200&fit=cover`}
                      alt="Gallery image"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {!isChild && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(img.image_id)}
                          disabled={isDeleting === img.image_id}
                        >
                          {isDeleting === img.image_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {gallery.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-md">
                No gallery images added yet.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

