"use client";

import { useState, useEffect } from "react";
import { BranchSelector } from "./branch-selector";
import { ProductSelector } from "./product-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { RfidTaggingPayload } from "../types";
import { X, Tag, Play } from "lucide-react";

interface CreateHeaderProps {
  onCancel: () => void;
  onSuccess: (newHeaderId?: number) => void;
}

export function CreateHeader({ onCancel, onSuccess }: CreateHeaderProps) {
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningInventory, setRunningInventory] = useState<number | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      if (selectedBranch && selectedProduct) {
        try {
          const res = await fetch(`/api/scm/inventory-management/rfid-tagging/headers/inventory?branch_id=${selectedBranch}&product_id=${selectedProduct}`);
          if (res.ok) {
            const data = await res.json();
            setRunningInventory(data.running_inventory);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setRunningInventory(null);
      }
    }
    fetchInventory();
  }, [selectedBranch, selectedProduct]);

  const handleCreateBatch = async () => {
    if (!selectedBranch || !selectedProduct) {
      toast.error("Please select both a branch and a product");
      return;
    }

    setIsSubmitting(true);
    try {
      const referenceNo = `RFID-BATCH-${Date.now()}`;
      const payload: RfidTaggingPayload = {
        branch_id: selectedBranch,
        product_id: selectedProduct,
        reference_no: referenceNo,
        rfid_tags: [], // Start with empty tags
      };

      const res = await fetch("/api/scm/inventory-management/rfid-tagging/headers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = "Failed to create batch";
        try {
          const errData = await res.json();
          if (errData.message) errMsg = errData.message;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      toast.success(`Successfully created batch! You can now start tagging.`);
      onSuccess(data.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">New Tagging Batch</h2>
          <p className="text-sm text-muted-foreground">Select a product and branch to create a new batch</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <Card className="border border-border/50 shadow-sm bg-card overflow-hidden rounded-xl mt-2">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-end">
              <div className="flex-1">
                <BranchSelector onSelect={setSelectedBranch} disabled={isSubmitting} />
              </div>
              <div className="flex-1">
                <ProductSelector onSelect={setSelectedProduct} disabled={isSubmitting} />
              </div>
            </div>

            {selectedBranch && selectedProduct && (
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Tag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Current Running Inventory</p>
                    <p className="text-xs text-muted-foreground">Based on selected branch and product</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-primary">
                    {runningInventory !== null ? `${runningInventory} Units` : 'Loading...'}
                  </p>
                </div>
              </div>
            )}

            <div className="border-t pt-6 mt-6 flex justify-end">
              <Button 
                size="lg"
                onClick={handleCreateBatch} 
                disabled={!selectedBranch || !selectedProduct || isSubmitting}
                className="font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                <Play className="h-4 w-4" />
                {isSubmitting ? "Creating Batch..." : "Create Batch & Start Tagging"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
