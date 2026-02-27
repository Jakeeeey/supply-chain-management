"use client";

import { useState, useMemo, useCallback } from "react";
import { useBundles } from "@/modules/supply-chain-management/product-management/bundling/hooks/useBundles";
import { getDraftColumns } from "./components/columns";
import { BundleCreateModal } from "./components/modals/bundle-create-modal";
import { BulkActionsModal } from "./components/modals/bulk-actions-modal";
import { DataTable } from "@/components/ui/new-data-table";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { Button } from "@/components/ui/button";
import { Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  BundleDraft,
  BundleDraftFormValues,
} from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";

/**
 * Bundle Creation Page — Manages DRAFT bundles.
 * Provides CRUD, bulk submit/delete, and a creation modal.
 */
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
    search,
    setSearch,
    refresh,
    createDraft,
    deleteDraft,
    submitForApproval,
    bulkSubmitForApproval,
    bulkDeleteDrafts,
  } = useBundles();

  // UI State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<BundleDraft[]>([]);
  const [bulkAction, setBulkAction] = useState<"submit" | "delete" | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // ─── Handlers ───────────────────────────────────

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

  // ─── Table Columns ──────────────────────────────

  const columns = useMemo(
    () =>
      getDraftColumns({
        masterData,
        onSubmit: handleSubmit,
        onDelete: handleDelete,
      }),
    [masterData],
  );

  // ─── Render ─────────────────────────────────────

  if (isLoading && !draftData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bundle Creation
        </h1>
        <p className="text-muted-foreground">
          Create and manage product bundle drafts.
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={draftData}
        searchKey="bundle_name"
        isLoading={isLoading}
        manualPagination
        pageCount={Math.ceil(draftTotal / draftLimit)}
        pagination={{ pageIndex: draftPage, pageSize: draftLimit }}
        onPaginationChange={(p) => {
          setDraftPage(p.pageIndex);
          setDraftLimit(p.pageSize);
        }}
        onSearch={(v) => setSearch(v)}
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
