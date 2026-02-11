"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCcw } from "lucide-react";
import { useSKUMasterlist } from "./hooks/useSKUMasterlist";
import { MasterlistTable } from "./components/data-table";
import { Button } from "@/components/ui/button";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { EditDescriptionModal } from "./components/modals/EditDescriptionModal";
import { SKU } from "../sku-creation/types/sku.schema";
import { toast } from "sonner";

export default function SKUMasterlistModule() {
  const { 
    data,
    totalCount,
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    sorting,
    setSorting,
    masterData,
    isLoading, 
    error, 
    refresh, 
  } = useSKUMasterlist();
  
  const [mounted, setMounted] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePagination = useCallback(({ pageIndex, pageSize }: { pageIndex: number; pageSize: number }) => {
    setPage(pageIndex);
    setLimit(pageSize);
  }, [setPage, setLimit]);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(0);
  }, [setSearch, setPage]);

  const handleSaveDescription = async (id: number | string, description: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/scm/product-management/sku-masterlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update description");

      toast.success("Product description updated successfully");
      refresh();
      setEditingSKU(null);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while updating");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!mounted || (isLoading && !data.length)) {
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
          isLoading={isLoading} 
          onSearch={handleSearch}
          onEdit={setEditingSKU}
        />

      <EditDescriptionModal
        sku={editingSKU}
        isOpen={!!editingSKU}
        onClose={() => setEditingSKU(null)}
        onSave={handleSaveDescription}
        isLoading={isUpdating}
        masterData={masterData}
      />
    </div>
  );
}
