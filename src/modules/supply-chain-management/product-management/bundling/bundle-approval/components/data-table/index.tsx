"use client";

import React from "react";
import { BundleDraft, BundleMasterData } from "../../types/bundle.schema";
import { DataTable } from "@/components/ui/new-data-table";
import { getApprovalColumns } from "./columns";
import { DataTableColumnHeader } from "./table-column-header";

interface BundleApprovalTableProps {
  data: BundleDraft[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  masterData: BundleMasterData | null;
  isLoading: boolean;
  onView: (draft: BundleDraft) => void;
  onSearch: (value: string) => void;
}

export function BundleApprovalTable({
  data,
  totalCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  masterData,
  isLoading,
  onView,
  onSearch,
}: BundleApprovalTableProps) {
  const columns = React.useMemo(
    () =>
      getApprovalColumns({
        masterData,
        onView,
      }),
    [masterData, onView],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="bundle_name"
      isLoading={isLoading}
      manualPagination
      pageCount={Math.ceil(totalCount / pageSize)}
      pagination={{ pageIndex, pageSize }}
      onPaginationChange={onPaginationChange}
      onSearch={onSearch}
    />
  );
}
