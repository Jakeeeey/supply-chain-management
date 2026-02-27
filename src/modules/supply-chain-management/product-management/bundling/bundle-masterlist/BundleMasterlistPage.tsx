"use client";

import { useMemo } from "react";
import { useBundles } from "@/modules/supply-chain-management/product-management/bundling/hooks/useBundles";
import { getMasterlistColumns } from "./components/columns";
import { DataTable } from "@/components/ui/new-data-table";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

/**
 * Bundle Masterlist Page — Read-only view of all approved bundles.
 */
export default function BundleMasterlistPage() {
  const {
    approvedData,
    approvedTotal,
    approvedPage,
    setApprovedPage,
    approvedLimit,
    setApprovedLimit,
    masterData,
    isLoading,
    error,
    search,
    setSearch,
    refresh,
  } = useBundles();

  // ─── Table Columns ──────────────────────────────

  const columns = useMemo(
    () => getMasterlistColumns({ masterData }),
    [masterData],
  );

  // ─── Render ─────────────────────────────────────

  if (isLoading && !approvedData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bundle Masterlist
        </h1>
        <p className="text-muted-foreground">All approved product bundles.</p>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={approvedData}
        searchKey="bundle_name"
        isLoading={isLoading}
        manualPagination
        pageCount={Math.ceil(approvedTotal / approvedLimit)}
        pagination={{ pageIndex: approvedPage, pageSize: approvedLimit }}
        onPaginationChange={(p) => {
          setApprovedPage(p.pageIndex);
          setApprovedLimit(p.pageSize);
        }}
        onSearch={(v) => setSearch(v)}
      />
    </div>
  );
}
