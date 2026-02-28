"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku/sku-creation/hooks/useSKUs";
import { SKUTable } from "@/modules/supply-chain-management/product-management/sku/sku-creation/components/data-table";
import { SKUModal } from "@/modules/supply-chain-management/product-management/sku/sku-creation/components/modals/sku-create-modal";
import { Button } from "@/components/ui/button";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { BulkDraftActionsModal } from "./components/modals/bulk-draft-actions-modal";
import { Send, Trash2 } from "lucide-react";

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
    draftsSorting,
    setDraftsSorting,

    masterData,
    isLoading,
    error,
    refresh,
    createDraft,
    updateDraft,
    submitForApproval,
    bulkSubmitForApproval,
    approveSKU,
    deleteDraft,
    bulkDeleteDrafts,
    checkDuplicate,
    rejectSKU,
    setSearch,
  } = useSKUs();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState<SKU | undefined>();
  const [selectedRows, setSelectedRows] = useState<SKU[]>([]);
  const [bulkActionType, setBulkActionType] = useState<
    "submit" | "delete" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDraftPagination = useCallback(
    ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
      setDraftsPage(pageIndex);
      setDraftsLimit(pageSize);
    },
    [setDraftsPage, setDraftsLimit],
  );

  const handleSearch = useCallback(
    (v: string) => {
      setSearch(v);
      // When searching, we keep pages as they are or reset them? Typically reset.
      setApprovedPage(0);
      setDraftsPage(0);
    },
    [setSearch, setApprovedPage, setDraftsPage],
  );

  const handleAdd = () => {
    setSelectedSKU(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (sku: SKU) => {
    setSelectedSKU(sku);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (
      confirm(
        "Are you sure you want to delete this record? This cannot be undone.",
      )
    ) {
      try {
        await deleteDraft(id);
        toast.success("SKU Draft Deleted", {
          description:
            "The product record has been permanently removed from the system.",
        });
      } catch (err: any) {
        toast.error("Deletion Failed", {
          description:
            err.message ||
            "An unexpected error occurred while trying to delete the record.",
        });
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
          const proceed = confirm(
            "A similar product name already exists in the system. Are you sure you want to create this SKU?",
          );
          if (!proceed) {
            setSaving(false);
            return;
          }
        }
      }

      if (id) {
        await updateDraft(id, sku);
        toast.success("SKU Updated Successfully", {
          description: `Changes to "${sku.product_name}" have been saved.`,
        });
      } else {
        await createDraft(sku);
        toast.success("SKU Draft Created", {
          description: `"${sku.product_name}" has been added to your draft queue.`,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error("Operation failed: " + err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToManager = async (id: number | string) => {
    try {
      await submitForApproval(id);
      toast.success("SKU Submitted for Review", {
        description:
          "The record has been moved to the manager's approval queue.",
      });
      setSelectedRows((prev) =>
        prev.filter(
          (item) => String((item as any).id || item.product_id) !== String(id),
        ),
      );
    } catch (err: any) {
      toast.error("Submission Failed", {
        description:
          err.message || "Could not move the record to the approval queue.",
      });
    }
  };

  const handleBulkSubmit = async () => {
    setSaving(true);
    try {
      const ids = selectedRows.map((sku) => (sku as any).id || sku.product_id);
      await bulkSubmitForApproval(ids);
      toast.success("Bulk Submission Successful", {
        description: `${selectedRows.length} items have been submitted for manager approval.`,
      });
      setSelectedRows([]);
      setBulkActionType(null);
    } catch (err: any) {
      toast.error("Bulk Submission Failed", {
        description:
          err.message || "An error occurred while submitting multiple records.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    try {
      const ids = selectedRows.map((sku) => (sku as any).id || sku.product_id);
      await bulkDeleteDrafts(ids);
      toast.success("Bulk Deletion Successful", {
        description: `${selectedRows.length} draft records have been permanently removed.`,
      });
      setSelectedRows([]);
      setBulkActionType(null);
    } catch (err: any) {
      toast.error("Bulk Deletion Failed", {
        description:
          err.message || "An error occurred while deleting multiple records.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAndActivate = async (id: number | string) => {
    try {
      await approveSKU(id);
      toast.success("SKU Activated and Master Record Created");
    } catch (err: any) {
      toast.error("Activation failed: " + err.message);
    }
  };

  const handleReject = async (id: number | string) => {
    try {
      await rejectSKU(id);
      toast.success("Record returned to Draft status");
    } catch (err: any) {
      toast.error("Process failed: " + err.message);
    }
  };

  if (!mounted || (isLoading && !draftData.length && !approvedData.length)) {
    return <ModuleSkeleton hasTabs={false} rowCount={6} />;
  }

  if (error) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Failed to Load Product Data"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-end gap-2  ">
        <Button variant="outline" onClick={refresh} disabled={isLoading}>
          <RefreshCcw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add SKU
        </Button>
      </div>
      <SKUTable
        title="Product Drafts"
        data={draftData}
        totalCount={draftsTotal}
        pageIndex={draftsPage}
        pageSize={draftsLimit}
        onPaginationChange={handleDraftPagination}
        sorting={draftsSorting}
        onSortingChange={setDraftsSorting}
        masterData={masterData}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete as any}
        onSubmitForApproval={handleSubmitToManager as any}
        onSelectionChange={setSelectedRows}
        actionComponent={
          selectedRows.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => setBulkActionType("delete")}
                size="sm"
                className="flex items-center gap-2"
              >
                Delete ({selectedRows.length})
              </Button>
              <Button
                onClick={() => setBulkActionType("submit")}
                size="sm"
                className="flex items-center gap-2"
              >
                Submit ({selectedRows.length})
              </Button>
            </div>
          )
        }
        manualPagination={true}
        onSearch={handleSearch}
        emptyTitle="No product drafts"
        emptyDescription="Your SKU registration queue is empty. Click 'Add SKU' above to create a new product draft and begin the approval process."
      />
      <SKUModal
        open={isModalOpen}
        setOpen={setIsModalOpen}
        initialData={selectedSKU}
        masterData={masterData}
        onSubmit={handleSubmitForm}
        loading={saving}
      />

      <BulkDraftActionsModal
        isOpen={bulkActionType !== null}
        onClose={() => setBulkActionType(null)}
        selectedSKUs={selectedRows}
        onConfirm={
          bulkActionType === "submit" ? handleBulkSubmit : handleBulkDelete
        }
        isLoading={saving}
        type={bulkActionType || "submit"}
      />
    </div>
  );
}
