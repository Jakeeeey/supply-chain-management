"use client";

import React from "react";
import { DataTable } from "@/components/ui/new-data-table";
import { getApprovalColumns } from "./columns";
import { DataTableColumnHeader } from "./table-column-header";
import {
  BundleDraft,
  BundleMasterData,
} from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";

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
  onSelectionChange?: (selectedRows: BundleDraft[]) => void;
  actionComponent?: React.ReactNode;
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
  onSelectionChange,
  actionComponent,
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
      onSelectionChange={onSelectionChange}
      actionComponent={actionComponent}
    />
  );
}
