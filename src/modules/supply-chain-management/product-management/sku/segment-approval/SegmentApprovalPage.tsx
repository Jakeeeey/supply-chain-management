"use client";

import { useState, useEffect, useCallback } from "react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku/sku-creation/hooks/useSKUs";
import { SegmentApprovalTable } from "@/modules/supply-chain-management/product-management/sku/segment-approval/components/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { ApproveSegmentModal } from "@/modules/supply-chain-management/product-management/sku/segment-approval/components/modals/approve-segment-modal";
import { RejectSegmentModal } from "@/modules/supply-chain-management/product-management/sku/segment-approval/components/modals/reject-segment-modal";
import { BulkApproveSegmentModal } from "@/modules/supply-chain-management/product-management/sku/segment-approval/components/modals/bulk-approve-segment-modal";
import { BulkRejectSegmentModal } from "@/modules/supply-chain-management/product-management/sku/segment-approval/components/modals/bulk-reject-segment-modal";

export default function SegmentApprovalPage() {
  const {
    segmentApprovalData,
    segmentTotal,
    segmentPage,
    setSegmentPage,
    segmentLimit,
    setSegmentLimit,
    segmentSorting,
    setSegmentSorting,
    setSearch,

    masterData,
    isLoading,
    error,
    refresh,
    approveSegment,
    rejectSegment,
    bulkApproveSegments,
    bulkRejectSegments,
  } = useSKUs();

  const [mounted, setMounted] = useState(false);
  const [approvingSKU, setApprovingSKU] = useState<SKU | null>(null);
  const [rejectingSKU, setRejectingSKU] = useState<SKU | null>(null);
  const [selectedSKUs, setSelectedSKUs] = useState<SKU[]>([]);
  const [isBulkApproveOpen, setIsBulkApproveOpen] = useState(false);
  const [isBulkRejectOpen, setIsBulkRejectOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handlePagination = useCallback(
    ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
      setSegmentPage(pageIndex);
      setSegmentLimit(pageSize);
    },
    [setSegmentPage, setSegmentLimit],
  );

  const handleSearch = useCallback(
    (v: string) => {
      setSearch(v);
      setSegmentPage(0);
    },
    [setSearch, setSegmentPage],
  );

  const handleApprove = (sku: SKU) => {
    setApprovingSKU(sku);
  };

  const handleReject = (sku: SKU) => {
    setRejectingSKU(sku);
  };

  const handleConfirmApprove = async () => {
    if (!approvingSKU) return;
    setIsUpdating(true);
    try {
      const proposedClass = (approvingSKU as SKU & { _proposed_class?: number })._proposed_class || 1;
      const proposedSegment = (approvingSKU as SKU & { _proposed_segment?: number })._proposed_segment || 1;
      const proposedSection = (approvingSKU as SKU & { _proposed_section?: number })._proposed_section || 1;

      await approveSegment(
        approvingSKU.id || approvingSKU.product_id!,
        proposedClass,
        proposedSegment,
        proposedSection
      );
      toast.success("Segment Approved", {
        description: "The product classification has been finalized.",
      });
      refresh();
      setApprovingSKU(null);
    } catch (err: unknown) {
      toast.error("Approval Failed", {
        description: err instanceof Error ? err.message : "Could not approve the segment.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingSKU) return;
    setIsUpdating(true);
    try {
      await rejectSegment(rejectingSKU.id || rejectingSKU.product_id!);
      toast.success("Segment Rejected", {
        description: "The product has been removed from the Masterlist and returned to SKU Approval.",
      });
      refresh();
      setRejectingSKU(null);
    } catch (err: unknown) {
      toast.error("Process Failed", {
        description: err instanceof Error ? err.message : "Could not complete the rejection process.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkApprove = async () => {
    setIsUpdating(true);
    try {
      await bulkApproveSegments(selectedSKUs);
      toast.success("Bulk Segment Approval Successful", {
        description: `${selectedSKUs.length} items have been classified and finalized.`,
      });
      setSelectedSKUs([]);
      setIsBulkApproveOpen(false);
    } catch (err: unknown) {
      toast.error("Bulk Approval Failed", {
        description: err instanceof Error ? err.message : "Could not process bulk segment approval.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkReject = async () => {
    setIsUpdating(true);
    try {
      const ids = selectedSKUs.map((sku) => String(sku.id || sku.product_id));
      await bulkRejectSegments(ids);
      toast.success("Bulk Segment Rejection Successful", {
        description: `${selectedSKUs.length} items have been removed from the Masterlist and returned to SKU Approval.`,
      });
      setSelectedSKUs([]);
      setIsBulkRejectOpen(false);
    } catch (err: unknown) {
      toast.error("Bulk Rejection Failed", {
        description: err instanceof Error ? err.message : "Could not process bulk segment rejection.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!mounted) {
    return <ModuleSkeleton hasActions={false} rowCount={5} />;
  }

  if (error) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Segment Approval Unavailable"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div>
      <SegmentApprovalTable
        title="Items Pending Segment Approval"
        data={segmentApprovalData}
        totalCount={segmentTotal}
        pageIndex={segmentPage}
        pageSize={segmentLimit}
        onPaginationChange={handlePagination}
        sorting={segmentSorting}
        onSortingChange={setSegmentSorting}
        onSearch={handleSearch}
        masterData={masterData}
        isLoading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
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

      <ApproveSegmentModal
        sku={approvingSKU}
        isOpen={!!approvingSKU}
        onClose={() => setApprovingSKU(null)}
        onConfirm={handleConfirmApprove}
        isLoading={isUpdating}
        masterData={masterData}
      />

      <RejectSegmentModal
        sku={rejectingSKU}
        isOpen={!!rejectingSKU}
        onClose={() => setRejectingSKU(null)}
        onConfirm={handleConfirmReject}
        isLoading={isUpdating}
      />

      <BulkApproveSegmentModal
        selectedSKUs={selectedSKUs}
        isOpen={isBulkApproveOpen}
        onClose={() => setIsBulkApproveOpen(false)}
        onConfirm={handleBulkApprove}
        isLoading={isUpdating}
        masterData={masterData}
      />

      <BulkRejectSegmentModal
        selectedSKUs={selectedSKUs}
        isOpen={isBulkRejectOpen}
        onClose={() => setIsBulkRejectOpen(false)}
        onConfirm={handleBulkReject}
        isLoading={isUpdating}
      />
    </div>
  );
}
