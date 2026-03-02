"use client";

import { useBundles } from "./hooks/useBundles";
import { BundleMasterlistTable } from "./components/data-table";
import { ModuleSkeleton } from "@/components/shared/ModuleSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    refresh,
  } = useBundles();

  if (isLoading && !approvedData.length) return <ModuleSkeleton />;
  if (error) return <ErrorPage message={error} reset={refresh} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bundle Masterlist
          </h1>
          <p className="text-muted-foreground">
            All approved and rejected product bundles.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Bundle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {masterData?.bundleTypes.map((t: any) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
