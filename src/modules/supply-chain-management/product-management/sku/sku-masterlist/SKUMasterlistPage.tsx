"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { SKU } from "../sku-creation/types/sku.schema";
import { MasterlistTable } from "./components/data-table";
import { useSKUMasterlist } from "./hooks/useSKUMasterlist";
import { toast } from "sonner";
import { EditProductModal } from "./components/modals/edit-product-modal";
import { SKUImageModal } from "./components/modals/sku-image-modal";
import { SKUGalleryModal } from "./components/modals/sku-gallery-modal";
import { FacetFilters } from "./components/filters/FacetFilters";

export default function SKUMasterlistModule() {
  const {
    data,
    totalCount,
    page,
    setPage,
    limit,
    setLimit,
    setSearch,
    supplierFilter,
    setSupplierFilter,
    categoryFilter,
    setCategoryFilter,
    classFilter,
    setClassFilter,
    segmentFilter,
    setSegmentFilter,
    typeFilter,
    setTypeFilter,
    brandFilter,
    setBrandFilter,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    masterData,
    parentImages,
    pendingEditIds,
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

  const handleSaveProduct = async (
    id: number | string,
    data: Partial<SKU>,
  ) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/scm/product-management/sku/${id}?type=master`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update record");

      toast.success("Submitted for Approval", {
        description: "The product edits have been submitted to the approval workflow.",
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

  const currentFilters = {
    category: categoryFilter,
    class: classFilter,
    segment: segmentFilter,
    type: typeFilter,
    brand: brandFilter,
    supplier: supplierFilter,
    status: statusFilter,
  };

  const handleApplyFilters = (values: {
    category: string;
    class: string;
    segment: string;
    type: string;
    brand: string;
    supplier: string;
    status: string;
  }) => {
    setCategoryFilter(values.category);
    setClassFilter(values.class);
    setSegmentFilter(values.segment);
    setTypeFilter(values.type);
    setBrandFilter(values.brand);
    setSupplierFilter(values.supplier);
    setStatusFilter(values.status);
    setPage(0);
  };

  const handleClearFilters = () => {
    setCategoryFilter("");
    setClassFilter("");
    setSegmentFilter("");
    setTypeFilter("");
    setBrandFilter("");
    setSupplierFilter("");
    setStatusFilter("");
    setPage(0);
  };

  const bulkActionComponent = selectedRows.length > 0 ? (
    <div className="flex items-center gap-2">
      {hasSelectedInactive && (
        <Button size="sm" variant="default" onClick={handleBulkActivate} disabled={isUpdating}>
          Activate ({selectedRows.filter((r) => Number(r.isActive) !== 1).length})
        </Button>
      )}
      {hasSelectedActive && (
        <Button size="sm" variant="destructive" onClick={handleBulkDeactivate} disabled={isUpdating}>
          Deactivate ({selectedRows.filter((r) => Number(r.isActive) === 1).length})
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
      <FacetFilters
        masterData={masterData}
        filters={currentFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        isLoading={isLoading}
      />
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
        pendingEditIds={pendingEditIds}
        isLoading={isLoading}
        onSearch={handleSearch}
        onSelectionChange={setSelectedRows}
        onToggleStatus={(id, current) => toggleStatus(id, !current)}
        onEdit={setEditingSKU}
        onUpdateImage={setUpdatingImageSKU}
        onViewGallery={setViewingGallerySKU}
        actionComponent={bulkActionComponent}
      />

      <EditProductModal
        sku={editingSKU}
        isOpen={!!editingSKU}
        onClose={() => setEditingSKU(null)}
        onSave={handleSaveProduct}
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
