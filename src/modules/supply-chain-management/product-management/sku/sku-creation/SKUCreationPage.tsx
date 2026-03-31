"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SKUTable } from "@/modules/supply-chain-management/product-management/sku/sku-creation/components/data-table";
import { SKUModal } from "@/modules/supply-chain-management/product-management/sku/sku-creation/components/modals/sku-create-modal";
import { useSKUs } from "@/modules/supply-chain-management/product-management/sku/sku-creation/hooks/useSKUs";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { AlertTriangle, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BulkDraftActionsModal } from "./components/modals/bulk-draft-actions-modal";

export default function SKUCreationModule() {
  const {
    approvedData,
    setApprovedPage,
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
    deleteDraft,
    bulkDeleteDrafts,
    checkDuplicate,
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

  const [skuToDelete, setSkuToDelete] = useState<SKU | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    open: boolean;
    sku: SKU | null;
  }>({ open: false, sku: null });

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolveId = useCallback(
    (sku: SKU | undefined | null): number | null => {
      if (!sku) return null;
      const id = sku.id || sku.product_id;
      return id ? Number(id) : null;
    },
    [],
  );

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

  const confirmDelete = async () => {
    const id = resolveId(skuToDelete);
    if (!id) return;

    try {
      await deleteDraft(id);
      toast.success("SKU Draft Deleted", {
        description:
          "The product record has been permanently removed from the system.",
      });
      setSkuToDelete(null);
    } catch (err: unknown) {
      toast.error("Deletion Failed", {
        description:
          (err instanceof Error ? err.message : "An unexpected error occurred while trying to delete the record."),
      });
    }
  };

  const processSubmit = async (sku: SKU) => {
    setSaving(true);
    try {
      const id = resolveId(selectedSKU);

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
      setDuplicateWarning({ open: false, sku: null });
    } catch (err: unknown) {
      toast.error("Operation failed: " + (err instanceof Error ? err.message : String(err)));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForm = async (sku: SKU) => {
    const id = resolveId(selectedSKU);

    if (!id) {
      const isDuplicate = await checkDuplicate(sku.product_name);
      if (isDuplicate) {
        setDuplicateWarning({ open: true, sku });
        return;
      }
    }

    await processSubmit(sku);
  };

  const handleSubmitToManager = async (item: SKU) => {
    const id = resolveId(item);
    if (!id) return;

    try {
      await submitForApproval(id);
      toast.success("SKU Submitted for Review", {
        description:
          "The record has been moved to the manager's approval queue.",
      });
      setSelectedRows((prev) => prev.filter((p) => resolveId(p) !== id));
    } catch (err: unknown) {
      toast.error("Submission Failed", {
        description:
          (err instanceof Error ? err.message : "Could not move the record to the approval queue."),
      });
    }
  };

  const handleBulkSubmit = async () => {
    setSaving(true);
    try {
      const ids = selectedRows
        .map((sku) => resolveId(sku))
        .filter(Boolean) as number[];
      await bulkSubmitForApproval(ids);
      toast.success("Bulk Submission Successful", {
        description: `${selectedRows.length} items have been submitted for manager approval.`,
      });
      setSelectedRows([]);
      setBulkActionType(null);
    } catch (err: unknown) {
      toast.error("Bulk Submission Failed", {
        description:
          (err instanceof Error ? err.message : "An error occurred while submitting multiple records."),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    try {
      const ids = selectedRows
        .map((sku) => resolveId(sku))
        .filter(Boolean) as number[];
      await bulkDeleteDrafts(ids);
      toast.success("Bulk Deletion Successful", {
        description: `${selectedRows.length} draft records have been permanently removed.`,
      });
      setSelectedRows([]);
      setBulkActionType(null);
    } catch (err: unknown) {
      toast.error("Bulk Deletion Failed", {
        description:
          (err instanceof Error ? err.message : "An error occurred while deleting multiple records."),
      });
    } finally {
      setSaving(false);
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
        onDelete={(sku: SKU) => setSkuToDelete(sku)}
        onSubmitForApproval={handleSubmitToManager}
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

      {/* Confirmation Dialogs */}
      <AlertDialog
        open={skuToDelete !== null}
        onOpenChange={(open) => !open && setSkuToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Product Draft?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {skuToDelete?.product_name}? This
              will permanently remove the draft record from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={duplicateWarning.open}
        onOpenChange={(open) =>
          setDuplicateWarning((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Duplicate Name Warning
            </AlertDialogTitle>
            <AlertDialogDescription>
              A product with the name {duplicateWarning.sku?.product_name}
              already exists in the system. Are you sure you want to create a
              duplicate SKU?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                duplicateWarning.sku && processSubmit(duplicateWarning.sku)
              }
            >
              Yes, Create SKU
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
