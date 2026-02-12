"use client";

import { useState, useEffect, useCallback } from "react";
import { useSKUMasterlist } from "./hooks/useSKUMasterlist";
import { MasterlistTable } from "./components/data-table";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import { Button } from "@/components/ui/button";
import { Power, PowerOff } from "lucide-react";
import { SKU } from "../sku-creation/types/sku.schema";

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
    isUpdating,
    error,
    refresh,
    toggleStatus,
    bulkUpdateStatus,
  } = useSKUMasterlist();

  const [mounted, setMounted] = useState(false);
  const [selectedRows, setSelectedRows] = useState<SKU[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        const idVal = (row as any).id || row.product_id;
        return typeof idVal === "string" && /^\d+$/.test(idVal)
          ? parseInt(idVal)
          : idVal;
      })
      .filter(Boolean);

    if (ids.length > 0) {
      await bulkUpdateStatus(ids, false);
      setSelectedRows([]);
    }
  };

  const handleBulkActivate = async () => {
    const ids = selectedRows
      .map((row) => {
        const idVal = (row as any).id || row.product_id;
        return typeof idVal === "string" && /^\d+$/.test(idVal)
          ? parseInt(idVal)
          : idVal;
      })
      .filter(Boolean);

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
            Activate{" "}
            {selectedRows.filter((r) => Number(r.isActive) !== 1).length} items
          </Button>
        )}
        {hasSelectedActive && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDeactivate}
            disabled={isUpdating}
          >
            Deactivate{" "}
            {selectedRows.filter((r) => Number(r.isActive) === 1).length} items
          </Button>
        )}
      </div>
    ) : null;

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
        onSelectionChange={setSelectedRows}
        actionComponent={bulkActionComponent}
      />
    </div>
  );
}
