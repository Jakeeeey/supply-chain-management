"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku-creation/hooks/useSKUs";
import { SKUTable } from "@/modules/supply-chain-management/product-management/sku-creation/components/data-table/SKUTable";
import { SKUModal } from "@/modules/supply-chain-management/product-management/sku-creation/components/modals/SKUModal";
import { Button } from "@/components/ui/button";
import { SKU } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SKUCreationModule() {
  const { 
    approvedData,
    approvedTotal,
    approvedPage,
    setApprovedPage,
    approvedLimit,
    setApprovedLimit,
    
    draftData,
    draftsTotal,
    draftsPage,
    setDraftsPage,
    draftsLimit,
    setDraftsLimit,
    
    masterData,
    isLoading, 
    error, 
    refresh, 
    createDraft, 
    updateDraft, 
    submitForApproval,
    approveSKU,
    deleteDraft,
    checkDuplicate,
  } = useSKUs();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState<SKU | undefined>();
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdd = () => {
    setSelectedSKU(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (sku: SKU) => {
    setSelectedSKU(sku);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this record? This cannot be undone.")) {
      try {
        await deleteDraft(id);
        toast.success("Record deleted successfully");
      } catch (err: any) {
        toast.error("Deletion failed: " + err.message);
      }
    }
  };

  const handleSubmitForm = async (sku: SKU) => {
    setSaving(true);
    try {
      const id = (selectedSKU as any)?.id || (selectedSKU as any)?.product_id;
      
      if (!id) {
         const isDuplicate = await checkDuplicate(sku.product_name);
         if (isDuplicate) {
           const proceed = confirm("A similar product name already exists in the system. Are you sure you want to create this SKU?");
           if (!proceed) {
             setSaving(false);
             return;
           }
         }
      }

      if (id) {
        await updateDraft(id, sku);
        toast.success("Record updated successfully");
      } else {
        await createDraft(sku);
        toast.success("Draft created successfully");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error("Operation failed: " + err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToManager = async (id: number) => {
    try {
      await submitForApproval(id);
      toast.success("Submitted for manager review");
    } catch (err: any) {
      toast.error("Submission failed: " + err.message);
    }
  };

  const handleApproveAndActivate = async (id: number) => {
    try {
      await approveSKU(id);
      toast.success("SKU Activated and Master Record Created");
    } catch (err: any) {
      toast.error("Activation failed: " + err.message);
    }
  };

  if (!mounted) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTitle>System Connection Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4">
              <Button onClick={refresh} variant="outline" size="sm">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add SKU
          </Button>
        </div>
      </div>
      <div className="mt-6">
        <SKUTable 
          title="Pending Approval & Draft Records"
          data={draftData} 
          totalCount={draftsTotal}
          pageIndex={draftsPage}
          pageSize={draftsLimit}
          onPaginationChange={({ pageIndex, pageSize }) => {
              setDraftsPage(pageIndex);
              setDraftsLimit(pageSize);
          }}
          masterData={masterData}
          isLoading={isLoading} 
          onEdit={handleEdit} 
          onDelete={handleDelete as any} 
          onSubmitForApproval={handleSubmitToManager as any}
          onApprove={handleApproveAndActivate as any}
        />
      </div>

      <SKUModal 
        open={isModalOpen} 
        setOpen={setIsModalOpen} 
        initialData={selectedSKU} 
        masterData={masterData}
        onSubmit={handleSubmitForm} 
        loading={saving}
      />
    </div>
  );
}
