"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCcw } from "lucide-react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku-creation/hooks/useSKUs";
import { ApprovalTable } from "@/modules/supply-chain-management/product-management/sku-approval/components/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { EditDescriptionModal } from "@/modules/supply-chain-management/product-management/sku-masterlist/components/modals/EditDescriptionModal";
import { RejectRemarksModal } from "@/modules/supply-chain-management/product-management/sku-approval/components/modals/RejectRemarksModal";
import { SKU } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";

export default function SKUApprovalPage() {
  const { 
    pendingApprovalData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    pendingSorting,
    setPendingSorting,
    setSearch,
    
    masterData,
    isLoading, 
    error, 
    refresh, 
    approveSKU,
    rejectSKU,
  } = useSKUs();
  
  const [mounted, setMounted] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [rejectingSKU, setRejectingSKU] = useState<SKU | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePagination = useCallback(({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
    setPendingPage(pageIndex);
    setPendingLimit(pageSize);
  }, [setPendingPage, setPendingLimit]);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPendingPage(0);
  }, [setSearch, setPendingPage]);

  const handleApproveAndActivate = async (id: number | string) => {
    try {
      await approveSKU(id);
      toast.success("SKU Activated and Master Record Created");
    } catch (err: any) {
      toast.error("Activation failed: " + err.message);
    }
  };

  const handleReject = async (sku: SKU) => {
    setRejectingSKU(sku);
  };

  const handleConfirmReject = async (id: number | string, remarks: string) => {
    setIsUpdating(true);
    try {
      await rejectSKU(id, remarks);
      toast.success("Record returned to Draft status with remarks");
      refresh();
      setRejectingSKU(null);
    } catch (err: any) {
      toast.error("Process failed: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveDescription = async (id: number | string, description: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/scm/product-management/sku-creation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update description");

      toast.success("Description updated successfully");
      refresh();
      setEditingSKU(null);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while updating");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!mounted || (isLoading && !pendingApprovalData.length)) {
    return <ModuleSkeleton hasActions={false} rowCount={5} />;
  }

  if (error) {
    return (
      <ErrorPage 
        code="Connection Error"
        title="Approval Queue Unavailable"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div>
        <ApprovalTable 
          title="Items Pending Approval"
          data={pendingApprovalData} 
          totalCount={pendingTotal}
          pageIndex={pendingPage}
          pageSize={pendingLimit}
          onPaginationChange={handlePagination}
          sorting={pendingSorting}
          onSortingChange={setPendingSorting}
          onSearch={handleSearch}
          masterData={masterData}
          isLoading={isLoading} 
          onApprove={handleApproveAndActivate as any}
          onReject={handleReject as any}
          onEdit={setEditingSKU}
        />

      <EditDescriptionModal
        sku={editingSKU}
        isOpen={!!editingSKU}
        onClose={() => setEditingSKU(null)}
        onSave={handleSaveDescription}
        isLoading={isUpdating}
        masterData={masterData}
      />

      <RejectRemarksModal
        sku={rejectingSKU}
        isOpen={!!rejectingSKU}
        onClose={() => setRejectingSKU(null)}
        onConfirm={handleConfirmReject}
        isLoading={isUpdating}
      />
    </div>
  );
}
