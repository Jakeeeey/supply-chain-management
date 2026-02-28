"use client";

import { useState, useEffect, useCallback } from "react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku/sku-creation/hooks/useSKUs";
import { ApprovalTable } from "@/modules/supply-chain-management/product-management/sku/sku-approval/components/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { EditDescriptionModal } from "@/modules/supply-chain-management/product-management/sku/sku-masterlist/components/modals/edit-description-modal";
import { RejectRemarksModal } from "@/modules/supply-chain-management/product-management/sku/sku-approval/components/modals/reject-remarks-modal";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { BulkApproveModal } from "@/modules/supply-chain-management/product-management/sku/sku-approval/components/modals/bulk-approve-modal";
import { BulkRejectModal } from "@/modules/supply-chain-management/product-management/sku/sku-approval/components/modals/bulk-reject-modal";

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
    bulkApproveSKUs,
    bulkRejectSKUs,
    rejectSKU,
  } = useSKUs();

  const [mounted, setMounted] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [rejectingSKU, setRejectingSKU] = useState<SKU | null>(null);
  const [selectedSKUs, setSelectedSKUs] = useState<SKU[]>([]);
  const [isBulkApproveOpen, setIsBulkApproveOpen] = useState(false);
  const [isBulkRejectOpen, setIsBulkRejectOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePagination = useCallback(
    ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
      setPendingPage(pageIndex);
      setPendingLimit(pageSize);
    },
    [setPendingPage, setPendingLimit],
  );

  const handleSearch = useCallback(
    (v: string) => {
      setSearch(v);
      setPendingPage(0);
    },
    [setSearch, setPendingPage],
  );

  const handleApproveAndActivate = async (id: number | string) => {
    try {
      await approveSKU(id);
      toast.success("SKU Approved & Activated", {
        description:
          "The product has been activated and is now visible in the masterlist.",
      });
      setSelectedSKUs((prev) =>
        prev.filter(
          (item) => String(item.id || item.product_id) !== String(id),
        ),
      );
    } catch (err: any) {
      toast.error("Activation Failed", {
        description: err.message || "An error occurred during SKU activation.",
      });
    }
  };

  const handleBulkApprove = async () => {
    setIsUpdating(true);
    try {
      const ids = selectedSKUs.map((sku) =>
        String((sku as any).id || sku.product_id),
      );
      await bulkApproveSKUs(ids);
      toast.success("Bulk Approval Successful", {
        description: `${selectedSKUs.length} items have been approved and activated.`,
      });
      setSelectedSKUs([]);
      setIsBulkApproveOpen(false);
    } catch (err: any) {
      toast.error("Bulk Approval Failed", {
        description: err.message || "Could not process bulk activation.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkReject = async (
    rejections: { id: number | string; remarks: string }[],
  ) => {
    setIsUpdating(true);
    try {
      await bulkRejectSKUs(rejections);
      toast.success("Bulk Rejection Successful", {
        description: `${rejections.length} items have been rejected and returned to draft status.`,
      });
      setSelectedSKUs([]);
      setIsBulkRejectOpen(false);
    } catch (err: any) {
      toast.error("Bulk Rejection Failed", {
        description: err.message || "Could not process bulk rejection.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (sku: SKU) => {
    setRejectingSKU(sku);
  };

  const handleConfirmReject = async (id: number | string, remarks: string) => {
    setIsUpdating(true);
    try {
      await rejectSKU(id, remarks);
      toast.success("SKU Registration Rejected", {
        description:
          "The record has been returned to draft status with your remarks.",
      });
      refresh();
      setRejectingSKU(null);
    } catch (err: any) {
      toast.error("Process Failed", {
        description: err.message || "Could not complete the rejection process.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveDescription = async (
    id: number | string,
    description: string,
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(
        `/api/scm/product-management/sku/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        },
      );

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.error || "Failed to update description");

      toast.success("Description Updated", {
        description: "The product description has been successfully saved.",
      });
      refresh();
      setEditingSKU(null);
    } catch (err: any) {
      toast.error("Update Failed", {
        description: err.message || "Could not update the product description.",
      });
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
        onSelectionChange={setSelectedSKUs}
        actionComponent={
          selectedSKUs.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => setIsBulkRejectOpen(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                Reject ({selectedSKUs.length})
              </Button>
              <Button
                onClick={() => setIsBulkApproveOpen(true)}
                className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                size="sm"
              >
                Approve ({selectedSKUs.length})
              </Button>
            </div>
          )
        }
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

      <BulkApproveModal
        selectedSKUs={selectedSKUs}
        isOpen={isBulkApproveOpen}
        onClose={() => setIsBulkApproveOpen(false)}
        onConfirm={handleBulkApprove}
        isLoading={isUpdating}
      />

      <BulkRejectModal
        selectedSKUs={selectedSKUs}
        isOpen={isBulkRejectOpen}
        onClose={() => setIsBulkRejectOpen(false)}
        onConfirm={handleBulkReject}
        isLoading={isUpdating}
      />
    </div>
  );
}
