"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { SKU } from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { MasterlistTable } from "@/modules/supply-chain-management/product-management/sku/sku-masterlist/components/data-table";
import { useProductRegistration } from "@/modules/supply-chain-management/product-management/product-registration/hooks/useProductRegistration";
import { toast } from "sonner";
import { DirectCreationModal } from "@/modules/supply-chain-management/product-management/product-registration/components/modals/direct-creation-modal";
import { DirectEditModal } from "@/modules/supply-chain-management/product-management/product-registration/components/modals/direct-edit-modal";
import { SKUImageModal } from "@/modules/supply-chain-management/product-management/sku/sku-masterlist/components/modals/sku-image-modal";
import { SKUGalleryModal } from "@/modules/supply-chain-management/product-management/sku/sku-masterlist/components/modals/sku-gallery-modal";
import { FacetFilters } from "@/modules/supply-chain-management/product-management/sku/sku-masterlist/components/filters/FacetFilters";
import { Plus, RefreshCcw } from "lucide-react";

export default function ProductRegistrationPage() {
  const {
    data,
    totalCount,
    page,
    setPage,
    limit,
    setLimit,
    search,
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
    uomFilter,
    setUomFilter,
    sorting,
    setSorting,
    masterData,
    parentImages,
    isLoading,
    isUpdating,
    error,
    refresh,
    createProduct,
    updateProduct,
    updateImage,
    toggleStatus,
    bulkUpdateStatus,
    checkDuplicate,
  } = useProductRegistration();

  const [mounted, setMounted] = useState(false);
  const [selectedRows, setSelectedRows] = useState<SKU[]>([]);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [updatingImageSKU, setUpdatingImageSKU] = useState<SKU | null>(null);
  const [viewingGallerySKU, setViewingGallerySKU] = useState<SKU | null>(null);

  // Creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handlePagination = useCallback(
    ({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
      setPage(pageIndex);
      setLimit(pageSize);
    },
    [setPage, setLimit],
  );

  // ─── Creation Handlers ────────────────────────────────────────────────────

  const handleAdd = () => {
    setIsCreateModalOpen(true);
  };

  const processCreate = async (sku: SKU) => {
    setSaving(true);
    try {
      await createProduct(sku);
      toast.success("Product Created", {
        description: `"${sku.product_name}" has been added to the masterlist.`,
      });
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      toast.error("Creation failed: " + (err instanceof Error ? err.message : String(err)));
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubmit = async (sku: SKU) => {
    const isDuplicate = await checkDuplicate(sku.product_name);
    if (isDuplicate) {
      toast.error("Product name already exists. Please choose a unique name.");
      throw new Error("Duplicate product name");
    }
    await processCreate(sku);
  };

  // ─── Edit Handler ─────────────────────────────────────────────────────────

  const handleSaveProduct = async (
    id: number | string,
    productData: Partial<SKU>,
  ) => {
    if (productData.product_name) {
      const isDuplicate = await checkDuplicate(productData.product_name, id);
      if (isDuplicate) {
        toast.error("Product name already exists. Please choose a unique name.");
        throw new Error("Duplicate product name");
      }
    }
    await updateProduct(id, productData);
    setEditingSKU(null);
  };

  // ─── Image Handler ────────────────────────────────────────────────────────

  const handleSaveImage = async (
    id: number | string,
    imageId: string | null,
  ) => {
    await updateImage(id, imageId);
    setUpdatingImageSKU(null);
  };

  // ─── Bulk Status Handlers ─────────────────────────────────────────────────

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

  // ─── Filter State ─────────────────────────────────────────────────────────

  const currentFilters = {
    category: categoryFilter,
    class: classFilter,
    segment: segmentFilter,
    type: typeFilter,
    brand: brandFilter,
    supplier: supplierFilter,
    status: statusFilter,
    uom: uomFilter,
  };

  const handleApplyFilters = (values: {
    category: string;
    class: string;
    segment: string;
    type: string;
    brand: string;
    supplier: string;
    status: string;
    uom?: string;
    search?: string;
  }) => {
    setSearch(values.search || "");
    setCategoryFilter(values.category);
    setClassFilter(values.class);
    setSegmentFilter(values.segment);
    setTypeFilter(values.type);
    setBrandFilter(values.brand);
    setSupplierFilter(values.supplier);
    setStatusFilter(values.status);
    setUomFilter(values.uom || "");
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setClassFilter("");
    setSegmentFilter("");
    setTypeFilter("");
    setBrandFilter("");
    setSupplierFilter("");
    setStatusFilter("");
    setUomFilter("");
    setPage(0);
  };

  // ─── Bulk Action Component ────────────────────────────────────────────────

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

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!mounted) {
    return <ModuleSkeleton hasActions={false} rowCount={8} />;
  }

  if (error) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Product Registry Unreachable"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-end gap-2">
        <Button variant="outline" onClick={refresh} disabled={isLoading}>
          <RefreshCcw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col gap-4">

        <FacetFilters
          masterData={masterData ? {
            ...masterData,
            suppliers: masterData.suppliers.filter((s: { id: number; name: string; supplier_type?: string }) => s.supplier_type === "TRADE"),
          } : null}
          filters={{ ...currentFilters, search: search }}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          isLoading={isLoading}
        />
      </div>

      <MasterlistTable
        title="Product Registry"
        data={data}
        totalCount={totalCount}
        pageIndex={page}
        pageSize={limit}
        onPaginationChange={handlePagination}
        sorting={sorting}
        onSortingChange={setSorting}
        hideSearch={true}
        masterData={masterData}
        parentImages={parentImages}
        pendingEditIds={new Set<number>()}
        isLoading={isLoading}
        onSelectionChange={setSelectedRows}
        onToggleStatus={(id, current) => toggleStatus(id, !current)}
        onEdit={setEditingSKU}
        onUpdateImage={setUpdatingImageSKU}
        onViewGallery={setViewingGallerySKU}
        actionComponent={bulkActionComponent}
      />

      {/* Direct Creation Modal */}
      <DirectCreationModal
        open={isCreateModalOpen}
        setOpen={setIsCreateModalOpen}
        masterData={masterData ? {
          ...masterData,
          suppliers: masterData.suppliers.filter((s: { id: number; name: string; supplier_type?: string }) => s.supplier_type === "TRADE"),
        } : null}
        onSubmit={handleCreateSubmit}
        loading={saving}
      />

      {/* Edit Product Modal */}
      <DirectEditModal
        sku={editingSKU}
        isOpen={!!editingSKU}
        onClose={() => setEditingSKU(null)}
        onSave={handleSaveProduct}
        isLoading={isUpdating}
        masterData={masterData ? {
          ...masterData,
          suppliers: masterData.suppliers.filter((s: { id: number; name: string; supplier_type?: string }) => s.supplier_type === "TRADE"),
        } : null}
      />

      {/* Image Update Modal */}
      <SKUImageModal
        sku={updatingImageSKU}
        isOpen={!!updatingImageSKU}
        onClose={() => setUpdatingImageSKU(null)}
        onSave={handleSaveImage}
        isLoading={isUpdating}
      />

      {/* Gallery View Modal */}
      <SKUGalleryModal
        sku={viewingGallerySKU}
        isOpen={!!viewingGallerySKU}
        onClose={() => setViewingGallerySKU(null)}
      />
    </div>
  );
}
