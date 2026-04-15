"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { SKU } from "../sku-creation/types/sku.schema";
import { MasterlistTable } from "./components/data-table";
import { useSKUMasterlist } from "./hooks/useSKUMasterlist";
import { toast } from "sonner";
import { EditDescriptionModal } from "./components/modals/edit-description-modal";
import { SKUImageModal } from "./components/modals/sku-image-modal";
import { SKUGalleryModal } from "./components/modals/sku-gallery-modal";

export default function SKUMasterlistModule() {
  const {
    data,
    totalCount,
    page,
    setPage,
    limit,
    setLimit,
    // search is provided by hook but only used via setSearch
    setSearch,
    sorting,
    setSorting,
    masterData,
    parentImages,
    isLoading,
    isUpdating,
    error,
    refresh,
    toggleStatus,
    bulkUpdateStatus,
    setIsUpdating,
  } = useSKUMasterlist();

  const [mounted, setMounted] = useState(false);
  const [selectedRows, setSelectedRows] = useState<SKU[]>([]);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [updatingImageSKU, setUpdatingImageSKU] = useState<SKU | null>(null);
  const [viewingGallerySKU, setViewingGallerySKU] = useState<SKU | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveDescription = async (
    id: number | string,
    description: string,
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/scm/product-management/sku/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update record");

      toast.success("Record Updated", {
        description: "The product details have been successfully saved.",
      });
      refresh();
      setEditingSKU(null);
    } catch (err: unknown) {
      toast.error("Update Failed", {
        description:
          err instanceof Error ? err.message : "Could not update the record.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveImage = async (
    id: number | string,
    imageId: string | null,
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/scm/product-management/sku/${id}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ main_image: imageId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update image");

      toast.success("Image Updated", {
        description: "The product image has been successfully updated.",
      });
      refresh();
      setUpdatingImageSKU(null);
    } catch (err: unknown) {
      toast.error("Update Failed", {
        description:
          err instanceof Error ? err.message : "Could not update the image.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePagination = useCallback(
    ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
      setPage(pageIndex);
      setLimit(pageSize);
    },
    [setPage, setLimit],
  );

  const handleSearch = useCallback(
    (v: string) => {
      setSearch(v);
      setPage(0);
    },
    [setSearch, setPage],
  );

  const handleBulkDeactivate = async () => {
    const ids = selectedRows
      .map((row) => {
        const idVal = row.id || row.product_id;
        return typeof idVal === "string" && /^\d+$/.test(idVal)
          ? parseInt(idVal)
          : idVal;
      })
      .filter((v): v is number => v != null);

    if (ids.length > 0) {
      await bulkUpdateStatus(ids, false);
      setSelectedRows([]);
    }
  };

  const handleBulkActivate = async () => {
    const ids = selectedRows
      .map((row) => {
        const idVal = row.id || row.product_id;
        return typeof idVal === "string" && /^\d+$/.test(idVal)
          ? parseInt(idVal)
          : idVal;
      })
      .filter((v): v is number => v != null);

    if (ids.length > 0) {
      await bulkUpdateStatus(ids, true);
      setSelectedRows([]);
    }
  };

  const hasSelectedActive = selectedRows.some(
    (row) => Number(row.isActive) === 1,
  );
  const hasSelectedInactive = selectedRows.some(
    (row) => Number(row.isActive) !== 1,
  );

  const bulkActionComponent =
    selectedRows.length > 0 ? (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
        {hasSelectedInactive && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkActivate}
            disabled={isUpdating}
          >
            Activate (
            {selectedRows.filter((r) => Number(r.isActive) !== 1).length})
          </Button>
        )}
        {hasSelectedActive && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDeactivate}
            disabled={isUpdating}
          >
            Deactivate (
            {selectedRows.filter((r) => Number(r.isActive) === 1).length})
          </Button>
        )}
      </div>
    ) : null;

  if (!mounted) {
    return <ModuleSkeleton hasActions={false} rowCount={8} />;
  }

  if (error) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Masterlist Unreachable"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      <MasterlistTable
        title="Active Product Master Records"
        data={data}
        totalCount={totalCount}
        pageIndex={page}
        pageSize={limit}
        onPaginationChange={handlePagination}
        sorting={sorting}
        onSortingChange={setSorting}
        masterData={masterData}
        parentImages={parentImages}
        isLoading={isLoading}
        onSearch={handleSearch}
        onSelectionChange={setSelectedRows}
        onToggleStatus={(id, current) => toggleStatus(id, !current)}
        onEdit={setEditingSKU}
        onUpdateImage={setUpdatingImageSKU}
        onViewGallery={setViewingGallerySKU}
        actionComponent={bulkActionComponent}
      />

      <EditDescriptionModal
        sku={editingSKU}
        isOpen={!!editingSKU}
        onClose={() => setEditingSKU(null)}
        onSave={handleSaveDescription}
        isLoading={isUpdating}
        masterData={masterData}
      />

      <SKUImageModal
        sku={updatingImageSKU}
        isOpen={!!updatingImageSKU}
        onClose={() => setUpdatingImageSKU(null)}
        onSave={handleSaveImage}
        isLoading={isUpdating}
      />

      <SKUGalleryModal
        sku={viewingGallerySKU}
        isOpen={!!viewingGallerySKU}
        onClose={() => setViewingGallerySKU(null)}
      />
    </div>
  );
}
