"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Tag, Save, Store, Box } from "lucide-react";
import { RfidScanner } from "./rfid-scanner";
import { toast } from "sonner";
import { RfidHeader } from "../types";

interface EditHeaderProps {
  headerId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export function EditHeader({ headerId, onCancel, onSuccess }: EditHeaderProps) {
  const [header, setHeader] = useState<RfidHeader | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/scm/inventory-management/rfid-tagging/headers/${headerId}/tags`);
        if (!res.ok) throw new Error("Failed to load header details");
        const data = await res.json();
        setHeader(data.header);
        setExistingTags((data.tags || []).map((t: Record<string, unknown>) => t.rfid));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error loading batch");
        onCancel();
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [headerId, onCancel]);

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading batch details...</div>;
  }

  if (!header) return null;

  const isPosted = !!header.posted_at;

  const branch = header.branch as Record<string, unknown>;
  const product = header.product as Record<string, unknown>;
  const branchName = String(branch ? (branch.branch_name || branch.branchName || branch.name || header.branch_id) : header.branch_id);
  const productName = String(product ? (product.description || product.product_name || product.product_code || header.product_id) : header.product_id);

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Batches
        </Button>
        <div className="text-sm font-bold text-muted-foreground">
          Batch <span className="text-primary font-mono bg-primary/10 px-2 py-1 rounded-md">{header.reference_no}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h3 className="font-bold flex items-center gap-2 border-b pb-3">
            <Store className="h-5 w-5 text-primary" />
            Branch
          </h3>
          <p className="text-sm font-medium">{branchName}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h3 className="font-bold flex items-center gap-2 border-b pb-3">
            <Box className="h-5 w-5 text-primary" />
            Product
          </h3>
          <p className="text-sm font-medium">{productName}</p>
        </div>
        <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
          <h3 className="font-bold flex items-center gap-2 border-b pb-3">
            <Tag className="h-5 w-5 text-primary" />
            Current Inventory
          </h3>
          <p className="text-sm font-medium">
            {header.running_inventory !== undefined ? `${header.running_inventory} Units` : 'Loading...'}
          </p>
        </div>
      </div>

      <div className="bg-card p-8 rounded-2xl border shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {isPosted ? "Scanned Tags" : "Scan New Tags"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isPosted ? "This batch is posted and cannot be modified." : "Tags are automatically saved as you scan them."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-muted-foreground">Total Tags</p>
            <p className="text-3xl font-black text-primary">{existingTags.length}</p>
          </div>
        </div>

        <RfidScanner 
          initialTags={existingTags} 
          onTagScanned={async (tag) => {
            const res = await fetch(`/api/scm/inventory-management/rfid-tagging/headers/${headerId}/tags`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rfid_tags: [tag] }),
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || "Failed to save tag to database");
            }
            setExistingTags(prev => [...prev, tag]);
            toast.success(`Tag saved: ${tag}`);
          }}
          onTagRemoved={async (tag) => {
            const res = await fetch(`/api/scm/inventory-management/rfid-tagging/headers/${headerId}/tags?rfid=${encodeURIComponent(tag)}`, {
              method: "DELETE",
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || "Failed to remove tag from database");
            }
            setExistingTags(prev => prev.filter(t => t !== tag));
            toast.success(`Tag removed: ${tag}`);
          }}
          disabled={isPosted}
        />

        {!isPosted && (
          <div className="mt-8 flex justify-end">
            <Button 
              size="lg" 
              onClick={onSuccess} 
              className="gap-2 font-bold shadow-lg shadow-primary/20"
            >
              <Save className="h-5 w-5" />
              Done Scanning
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
