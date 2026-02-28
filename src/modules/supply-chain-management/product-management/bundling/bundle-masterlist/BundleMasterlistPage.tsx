"use client";

import { useMemo } from "react";
import { useBundles } from "./hooks/useBundles";
import { BundleMasterlistTable } from "./components/data-table";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

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
      <BundleMasterlistTable
        data={approvedData}
        totalCount={approvedTotal}
        pageIndex={approvedPage}
        pageSize={approvedLimit}
        onPaginationChange={(p: { pageIndex: number; pageSize: number }) => {
          setApprovedPage(p.pageIndex);
          setApprovedLimit(p.pageSize);
        }}
        masterData={masterData}
        isLoading={isLoading}
        onSearch={(v: string) => setSearch(v)}
      />
    </div>
  );
}
