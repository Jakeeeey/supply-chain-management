"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BundleViewModal } from "../components/modals/bundle-view-modal";
import { useBundles } from "../hooks/useBundles";
import { BundleDraft, BundleDraftFormValues } from "../types/bundle.schema";
import { BundleCreationTable } from "./components/data-table";
import { BulkActionsModal } from "./components/modals/bulk-actions-modal";
import { BundleCreateModal } from "./components/modals/bundle-create-modal";

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
    typeFilter,
    setTypeFilter,
    refresh,
    createDraft,
    updateDraft,
    deleteDraft,
    submitForApproval,
    bulkSubmitForApproval,
    bulkDeleteDrafts,
    fetchDraftDetails,
  } = useBundles();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDraftId, setEditDraftId] = useState<number | string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<BundleDraft | null>(null);
  const [selectedRows, setSelectedRows] = useState<BundleDraft[]>([]);
  const [bulkAction, setBulkAction] = useState<"submit" | "delete" | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const handleCreateOrUpdate = async (values: BundleDraftFormValues) => {
    try {
      if (editDraftId) {
        await updateDraft(editDraftId, values);
        toast.success("Bundle draft updated successfully");
      } else {
        await createDraft(values);
        toast.success("Bundle draft created successfully");
      }
      setIsCreateOpen(false);
      setEditDraftId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save bundle");
    }
  };

  const handleEdit = useCallback((id: number | string) => {
    setEditDraftId(id);
    setIsCreateOpen(true);
  }, []);

  const handleView = useCallback((draft: BundleDraft) => {
    setSelectedDraft(draft);
  }, []);

  const handleFetchDetails = useCallback(
    async (id: number | string) => {
      return await fetchDraftDetails(id);
    },
    [fetchDraftDetails],
  );

  const handleSubmit = async (id: number | string) => {
    try {
      await submitForApproval(id);
      toast.success("Bundle submitted for approval");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit bundle");
    }
  };

  const handleDelete = async (id: number | string) => {
    try {
      await deleteDraft(id);
      toast.success("Bundle deleted successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete bundle");
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bulk operation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectionChange = useCallback((rows: BundleDraft[]) => {
    setSelectedRows(rows);
  }, []);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-end">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className=" h-9">
            <SelectValue placeholder="Bundle Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {masterData?.bundleTypes.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
        onView={handleView}
        onEdit={handleEdit}
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

      {/* Create / Edit Modal */}
      <BundleCreateModal
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditDraftId(null);
        }}
        onSubmit={handleCreateOrUpdate}
        masterData={masterData}
        editDraftId={editDraftId}
        fetchDetails={handleFetchDetails}
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

      {/* View Modal */}
      <BundleViewModal
        open={selectedDraft !== null}
        onClose={() => setSelectedDraft(null)}
        draft={selectedDraft}
        masterData={masterData}
        fetchDetails={handleFetchDetails}
        previewMode
      />
    </div>
  );
}
