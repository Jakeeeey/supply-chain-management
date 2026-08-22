"use client";

import { useState, useEffect, useCallback } from "react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku/sku-creation/hooks/useSKUs";
import { ApprovalTable } from "@/modules/supply-chain-management/product-management/sku/sku-approval/components/data-table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { BulkApproveModal } from "@/modules/supply-chain-management/product-management/sku/sku-approval/components/modals/bulk-approve-modal";
import { BulkRejectModal } from "@/modules/supply-chain-management/product-management/sku/sku-approval/components/modals/bulk-reject-modal";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
    pendingSupplier,
    setPendingSupplier,
    pendingStatus,
    setPendingStatus,
    pendingType,
    setPendingType,
    setSearch,

    masterData,
    isLoading,
    error,
    refresh,
    bulkApproveSKUs,
    bulkRejectSKUs,
    rejectSKU,
  } = useSKUs();

  const [mounted, setMounted] = useState(false);
  const [selectedSKUs, setSelectedSKUs] = useState<SKU[]>([]);
  const [skusToApprove, setSkusToApprove] = useState<SKU[]>([]);
  const [skusToReject, setSkusToReject] = useState<SKU[]>([]);
  const [isBulkApproveOpen, setIsBulkApproveOpen] = useState(false);
  const [isBulkRejectOpen, setIsBulkRejectOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
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

  const handleApproveClick = (sku: SKU) => {
    const typedSku = sku as SKU & { subRows?: SKU[] };
    const combined = [sku, ...(typedSku.subRows || [])];
    setSkusToApprove(combined);
    setIsBulkApproveOpen(true);
  };

  const handleBulkApproveClick = () => {
    const combined: SKU[] = [];
    selectedSKUs.forEach((sku) => {
      const id = sku.id || sku.product_id;
      if (!combined.some((c) => String(c.id || c.product_id) === String(id))) {
        combined.push(sku);
      }
      const subRows = (sku as SKU & { subRows?: SKU[] }).subRows || [];
      subRows.forEach((child) => {
        const childId = child.id || child.product_id;
        if (!combined.some((c) => String(c.id || c.product_id) === String(childId))) {
          combined.push(child);
        }
      });
    });
    setSkusToApprove(combined);
    setIsBulkApproveOpen(true);
  };

  const handleBulkRejectClick = () => {
    const combined: SKU[] = [];
    selectedSKUs.forEach((sku) => {
      const id = sku.id || sku.product_id;
      if (!combined.some((c) => String(c.id || c.product_id) === String(id))) {
        combined.push(sku);
      }
      const subRows = (sku as SKU & { subRows?: SKU[] }).subRows || [];
      subRows.forEach((child) => {
        const childId = child.id || child.product_id;
        if (!combined.some((c) => String(c.id || c.product_id) === String(childId))) {
          combined.push(child);
        }
      });
    });
    setSkusToReject(combined);
    setIsBulkRejectOpen(true);
  };

  const handleConfirmApprove = async () => {
    setIsUpdating(true);
    try {
      const ids = skusToApprove.map((sku) =>
        String(sku.id || sku.product_id),
      );
      await bulkApproveSKUs(ids);
      toast.success("Approval Successful", {
        description: `${skusToApprove.length} items have been approved and activated.`,
      });
      const approvedIdsSet = new Set(ids);
      setSelectedSKUs((prev) =>
        prev.filter((sku) => !approvedIdsSet.has(String(sku.id || sku.product_id))),
      );
      setSkusToApprove([]);
      setIsBulkApproveOpen(false);
      setResetKey((prev) => prev + 1);
    } catch (err: unknown) {
      toast.error("Approval Failed", {
        description: err instanceof Error ? err.message : "Could not process activation.",
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
      setResetKey((prev) => prev + 1);
    } catch (err: unknown) {
      toast.error("Bulk Rejection Failed", {
        description: err instanceof Error ? err.message : "Could not process bulk rejection.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = (sku: SKU) => {
    const typedSku = sku as SKU & { subRows?: SKU[] };
    const combined = [sku, ...(typedSku.subRows || [])];
    
    // Check if they are already in the combined array to avoid duplicates
    const uniqueCombined: SKU[] = [];
    combined.forEach((c) => {
      if (!uniqueCombined.some((u) => String(u.id || u.product_id) === String(c.id || c.product_id))) {
        uniqueCombined.push(c);
      }
    });

    setSkusToReject(uniqueCombined);
    setIsBulkRejectOpen(true);
  };




  if (!mounted) {
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

  const supplierOptions = [
    { value: "all", label: "Supplier: All" },
    ...(masterData?.suppliers?.map((s) => ({
      value: String(s.id),
      label: String(s.name || (s as { supplier_name?: string }).supplier_name || "Unknown"),
    })) || []),
  ];

  const statusOptions = [
    { value: "all", label: "Status: All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const typeOptions = [
    { value: "all", label: "Type: All" },
    { value: "Regular", label: "Regular" },
    { value: "Variant", label: "Variant" },
    { value: "Bundle", label: "Bundle" },
    { value: "Promo", label: "Promo" },
  ];

  return (
    <div className="space-y-4">
      <ApprovalTable
        key={resetKey}
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
        onApprove={handleApproveClick}
        onReject={(sku: SKU) => handleReject(sku)}
        onSelectionChange={setSelectedSKUs}
        actionComponent={
          <div className="flex items-center gap-3">
            <SearchableSelect
              options={supplierOptions}
              value={pendingSupplier || "all"}
              onValueChange={(v) => { setPendingSupplier(v === "all" ? "" : v); setPendingPage(0); }}
              placeholder="Supplier: All"
              className="w-[160px] bg-background"
            />

            <SearchableSelect
              options={statusOptions}
              value={pendingStatus || "all"}
              onValueChange={(v) => { setPendingStatus(v === "all" ? "" : v); setPendingPage(0); }}
              placeholder="Status: All"
              className="w-[130px] bg-background"
            />

            <SearchableSelect
              options={typeOptions}
              value={pendingType || "all"}
              onValueChange={(v) => { setPendingType(v === "all" ? "" : v); setPendingPage(0); }}
              placeholder="Type: All"
              className="w-[130px] bg-background"
            />

            {selectedSKUs.length > 0 && (
              <div className="flex items-center gap-2 pl-2 ml-1 border-l">
                <Button
                  variant="destructive"
                  onClick={handleBulkRejectClick}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Reject ({selectedSKUs.length})
                </Button>
                <Button
                  onClick={handleBulkApproveClick}
                  className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                  size="sm"
                >
                  Approve ({selectedSKUs.length})
                </Button>
              </div>
            )}
          </div>
        }
      />




      <BulkApproveModal
        selectedSKUs={skusToApprove}
        isOpen={isBulkApproveOpen}
        onClose={() => {
          setIsBulkApproveOpen(false);
          setSkusToApprove([]);
        }}
        onConfirm={handleConfirmApprove}
        isLoading={isUpdating}
      />

      <BulkRejectModal
        selectedSKUs={skusToReject}
        isOpen={isBulkRejectOpen}
        onClose={() => {
          setIsBulkRejectOpen(false);
          setSkusToReject([]);
        }}
        onConfirm={handleBulkReject}
        isLoading={isUpdating}
      />
    </div>
  );
}
