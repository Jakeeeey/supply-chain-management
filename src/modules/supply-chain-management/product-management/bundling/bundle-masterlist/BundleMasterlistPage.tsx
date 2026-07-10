"use client";

import { useBundles } from "../hooks/useBundles";
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
import { useState, useEffect } from "react";
import { BundleViewModal } from "../components/modals/bundle-view-modal";

export default function BundleMasterlistPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedBundle, setSelectedBundle] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

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

  const handleView = (id: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bundle = (approvedData as any[]).find((b) => b.id === id);
    setSelectedBundle(bundle || null);
    setIsViewOpen(true);
  };

  const fetchDetails = async (id: number | string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bundle = (approvedData as any[]).find((b) => b.id === id);
    const isApproved = bundle?.status === "APPROVED";
    const type = isApproved ? "approved" : "draft";
    const response = await fetch(
      `/api/scm/product-management/bundling/${id}?type=${type}`,
    );
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result.data;
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <ModuleSkeleton />;
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
                {masterData?.bundleTypes.map((t) => (
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data={approvedData as any}
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
        onView={handleView}
      />

      {/* View Modal */}
      <BundleViewModal
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedBundle(null);
        }}
        draft={selectedBundle}
        masterData={masterData}
        fetchDetails={fetchDetails}
        previewMode={true}
      />
    </div>
  );
}
