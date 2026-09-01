"use client";

import ErrorPage from "@/components/shared/ErrorPage";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { SKU } from "../sku-creation/types/sku.schema";
import { MasterlistTable } from "./components/data-table";
import { useSKUMasterlist } from "./hooks/useSKUMasterlist";
import { toast } from "sonner";
import { SKUModal } from "../sku-creation/components/modals/sku-create-modal";
import { SKUImageModal } from "./components/modals/sku-image-modal";
import { SKUGalleryModal } from "./components/modals/sku-gallery-modal";
import { PrintColumnsModal } from "./components/modals/print-columns-modal";
import { MasterlistFilters } from "./components/filters/MasterlistFilters";
import { Printer } from "lucide-react";
import { generateSKUMasterlistPDF } from "./utils/generate-sku-masterlist-pdf";

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
    uomFilter,
    setUomFilter,
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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  const handleClearFilters = () => {
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

  const bulkActionComponent = (
    <div className="flex items-center gap-2">
      {selectedRows.length > 0 && (
        <>
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
        </>
      )}
      <Button 
        size="sm" 
        variant="outline" 
        onClick={() => {
          if (!masterData) {
            toast.error("Master data is still loading. Please try again.");
            return;
          }
          setIsPrintModalOpen(true);
        }}
      >
        <Printer className="w-4 h-4 mr-2" />
        Print PDF
      </Button>
    </div>
  );

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
    <div className="grid grid-cols-1 min-w-0 w-full gap-4">
      <MasterlistFilters
        masterData={masterData}
        isLoading={isLoading}
        supplier={supplierFilter}
        onSupplierChange={(v) => { setSupplierFilter(v); setPage(0); }}
        brand={brandFilter}
        onBrandChange={(v) => { setBrandFilter(v); setPage(0); }}
        category={categoryFilter}
        onCategoryChange={(v) => { setCategoryFilter(v); setPage(0); }}
        classVal={classFilter}
        onClassChange={(v) => { setClassFilter(v); setPage(0); }}
        segment={segmentFilter}
        onSegmentChange={(v) => { setSegmentFilter(v); setPage(0); }}
        type={typeFilter}
        onTypeChange={(v) => { setTypeFilter(v); setPage(0); }}
        status={statusFilter}
        onStatusChange={(v) => { setStatusFilter(v); setPage(0); }}
        uom={uomFilter}
        onUomChange={(v) => { setUomFilter(v); setPage(0); }}
        onClear={handleClearFilters}
      />
      <div className="min-w-0 w-full overflow-x-auto">
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
      </div>

      <SKUModal
        open={!!editingSKU}
        setOpen={(open) => {
          if (!open) setEditingSKU(null);
        }}
        initialData={editingSKU ? { ...editingSKU, status: "DRAFT" } : undefined}
        masterData={masterData}
        onSubmit={async (data) => {
          if (editingSKU) {
            const id = editingSKU.id || editingSKU.product_id;
            await handleSaveProduct(id!, data);
          }
        }}
        loading={isUpdating}
        isMasterEdit={true}
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

      <PrintColumnsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onConfirm={(selectedColumns) => {
          if (masterData) {
            const itemsToPrint = selectedRows.length > 0
              ? selectedRows.reduce<SKU[]>((acc, row) => {
                  const rowId = row.id || row.product_id;
                  if (!acc.some(item => (item.id || item.product_id) === rowId)) {
                    acc.push(row);
                  }
                  const subRows = (row as { subRows?: SKU[] }).subRows || [];
                  subRows.forEach((sub) => {
                    const subId = sub.id || sub.product_id;
                    if (!acc.some(item => (item.id || item.product_id) === subId)) {
                      acc.push(sub);
                    }
                  });
                  return acc;
                }, [])
              : data;

            const doc = generateSKUMasterlistPDF({
              items: itemsToPrint,
              masterData,
              selectedColumns,
            });
            doc.save(`SKU_Masterlist_${new Date().toISOString().split('T')[0]}.pdf`);
          }
        }}
      />
    </div>
  );
}
