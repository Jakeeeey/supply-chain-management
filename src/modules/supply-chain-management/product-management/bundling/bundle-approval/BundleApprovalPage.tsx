"use client";

import { useState, useMemo, useCallback } from "react";
import { useBundles } from "@/modules/supply-chain-management/product-management/bundling/hooks/useBundles";
import { getApprovalColumns } from "./components/columns";
import { BundleViewModal } from "./components/modals/bundle-view-modal";
import { DataTable } from "@/components/ui/new-data-table";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { toast } from "sonner";
import { BundleDraft } from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";

/**
 * Bundle Approval Page — Displays bundles pending approval.
 * Provides View action to inspect details and approve/reject.
 */
export default function BundleApprovalPage() {
  const {
    pendingData,
    pendingTotal,
    pendingPage,
    setPendingPage,
    pendingLimit,
    setPendingLimit,
    masterData,
    isLoading,
    error,
    search,
    setSearch,
    refresh,
    approveDraft,
    rejectDraft,
    fetchDraftDetails,
  } = useBundles();

  // UI State
  const [selectedDraft, setSelectedDraft] = useState<BundleDraft | null>(null);

  // ─── Handlers ───────────────────────────────────

  const handleApprove = async (id: number | string) => {
    try {
      await approveDraft(id);
      toast.success("Bundle approved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve bundle");
    }
  };

  const handleReject = async (id: number | string) => {
    try {
      await rejectDraft(id);
      toast.success("Bundle rejected — returned to drafts");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject bundle");
    }
  };

  const handleView = useCallback((draft: BundleDraft) => {
    setSelectedDraft(draft);
  }, []);

  const handleFetchDetails = useCallback(
    async (id: number | string) => {
      return await fetchDraftDetails(id);
    },
    [fetchDraftDetails],
  );

  // ─── Table Columns ──────────────────────────────

  const columns = useMemo(
    () =>
      getApprovalColumns({
        masterData,
        onView: handleView,
      }),
    [masterData, handleView],
  );

  // ─── Render ─────────────────────────────────────

  if (isLoading && !pendingData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bundle Approval Queue
        </h1>
        <p className="text-muted-foreground">
          Review and approve or reject submitted bundle requests.
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={pendingData}
        searchKey="bundle_name"
        isLoading={isLoading}
        manualPagination
        pageCount={Math.ceil(pendingTotal / pendingLimit)}
        pagination={{ pageIndex: pendingPage, pageSize: pendingLimit }}
        onPaginationChange={(p) => {
          setPendingPage(p.pageIndex);
          setPendingLimit(p.pageSize);
        }}
        onSearch={(v) => setSearch(v)}
      />

      {/* View Modal */}
      <BundleViewModal
        open={selectedDraft !== null}
        onClose={() => setSelectedDraft(null)}
        draft={selectedDraft}
        masterData={masterData}
        onApprove={handleApprove}
        onReject={handleReject}
        fetchDetails={handleFetchDetails}
      />
    </div>
  );
}
