"use client";

import { useState, useMemo, useCallback } from "react";
import { useBundles } from "./hooks/useBundles";
import { BundleApprovalTable } from "./components/data-table";
import { BundleViewModal } from "./components/modals/bundle-view-modal";
import { Button } from "@/components/ui/button";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { toast } from "sonner";
import { BundleDraft } from "./types/bundle.schema";
import { CheckCircle2, XCircle } from "lucide-react";

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

  const [selectedDraft, setSelectedDraft] = useState<BundleDraft | null>(null);
  const [selectedRows, setSelectedRows] = useState<BundleDraft[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (!selectedRows.length) return;
    setIsBulkProcessing(true);
    const toastId = toast.loading(
      `Processing ${selectedRows.length} bundles...`,
    );

    try {
      const promises = selectedRows.map((row) =>
        action === "approve" ? approveDraft(row.id) : rejectDraft(row.id),
      );
      await Promise.all(promises);
      toast.success(`Successfully ${action}d ${selectedRows.length} bundles`, {
        id: toastId,
      });
      setSelectedRows([]);
      refresh();
    } catch (err: any) {
      toast.error(`Error during bulk ${action}: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setIsBulkProcessing(false);
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

  const handleSelectionChange = useCallback((rows: BundleDraft[]) => {
    setSelectedRows(rows);
  }, []);

  if (isLoading && !pendingData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  const actionComponent = (
    <div className="flex items-center gap-2">
      {selectedRows.length > 0 && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction("reject")}
            disabled={isBulkProcessing}
            className="text-destructive border-destructive/50"
          >
            <XCircle className="mr-2 h-4 w-4" /> Reject ({selectedRows.length})
          </Button>
          <Button
            size="sm"
            onClick={() => handleBulkAction("approve")}
            disabled={isBulkProcessing}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve (
            {selectedRows.length})
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Data Table */}
      <BundleApprovalTable
        data={pendingData}
        totalCount={pendingTotal}
        pageIndex={pendingPage}
        pageSize={pendingLimit}
        onPaginationChange={(p: { pageIndex: number; pageSize: number }) => {
          setPendingPage(p.pageIndex);
          setPendingLimit(p.pageSize);
        }}
        masterData={masterData}
        isLoading={isLoading}
        onView={handleView}
        onSearch={(v: string) => setSearch(v)}
        onSelectionChange={handleSelectionChange}
        actionComponent={actionComponent}
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
