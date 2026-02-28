"use client";

import { useState, useCallback } from "react";
import { useBundles } from "./hooks/useBundles";
import { BundleCreationTable } from "./components/data-table";
import { BundleCreateModal } from "./components/modals/bundle-create-modal";
import { BulkActionsModal } from "./components/modals/bulk-actions-modal";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { Button } from "@/components/ui/button";
import { Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BundleDraft, BundleDraftFormValues } from "./types/bundle.schema";

export default function BundleCreationPage() {
  const {
    draftData,
    draftTotal,
    draftPage,
    setDraftPage,
    draftLimit,
    setDraftLimit,
    masterData,
    isLoading,
    error,
    setSearch,
    refresh,
    createDraft,
    deleteDraft,
    submitForApproval,
    bulkSubmitForApproval,
    bulkDeleteDrafts,
  } = useBundles();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<BundleDraft[]>([]);
  const [bulkAction, setBulkAction] = useState<"submit" | "delete" | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreate = async (values: BundleDraftFormValues) => {
    try {
      await createDraft(values);
      toast.success("Bundle draft created successfully");
      setIsCreateOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create bundle");
    }
  };

  const handleSubmit = async (id: number | string) => {
    try {
      await submitForApproval(id);
      toast.success("Bundle submitted for approval");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit bundle");
    }
  };

  const handleDelete = async (id: number | string) => {
    try {
      await deleteDraft(id);
      toast.success("Bundle deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete bundle");
    }
  };

  const handleBulkConfirm = async () => {
    setIsProcessing(true);
    try {
      const ids = selectedRows.map((r) => r.id);
      if (bulkAction === "submit") {
        await bulkSubmitForApproval(ids);
        toast.success(`${ids.length} bundle(s) submitted for approval`);
      } else if (bulkAction === "delete") {
        await bulkDeleteDrafts(ids);
        toast.success(`${ids.length} bundle(s) deleted`);
      }
      setBulkAction(null);
      setSelectedRows([]);
    } catch (err: any) {
      toast.error(err.message || "Bulk operation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectionChange = useCallback((rows: BundleDraft[]) => {
    setSelectedRows(rows);
  }, []);

  if (isLoading && !draftData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      {/* Data Table */}
      <BundleCreationTable
        data={draftData}
        totalCount={draftTotal}
        pageIndex={draftPage}
        pageSize={draftLimit}
        onPaginationChange={(p: { pageIndex: number; pageSize: number }) => {
          setDraftPage(p.pageIndex);
          setDraftLimit(p.pageSize);
        }}
        masterData={masterData}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onSearch={(v: string) => setSearch(v)}
        onSelectionChange={handleSelectionChange}
        actionComponent={
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkAction("submit")}
                >
                  <Send className="mr-2 h-4 w-4" /> Submit (
                  {selectedRows.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkAction("delete")}
                  className="text-destructive border-destructive/50"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete (
                  {selectedRows.length})
                </Button>
              </>
            )}
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Bundle
            </Button>
          </div>
        }
      />

      {/* Create Modal */}
      <BundleCreateModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        masterData={masterData}
      />

      {/* Bulk Actions Modal */}
      <BulkActionsModal
        open={bulkAction !== null}
        onClose={() => setBulkAction(null)}
        type={bulkAction || "submit"}
        items={selectedRows}
        onConfirm={handleBulkConfirm}
        loading={isProcessing}
      />
    </div>
  );
}
