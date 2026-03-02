"use client";

import React from "react";
import { BundleDraft, BundleMasterData } from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";
import { DataTable } from "@/components/ui/new-data-table";
import { getDraftColumns } from "./columns";

interface BundleCreationTableProps {
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
  onSubmit: (id: number | string) => void;
  onDelete: (id: number | string) => void;
  onSearch: (value: string) => void;
  onSelectionChange: (selectedRows: BundleDraft[]) => void;
  actionComponent?: React.ReactNode;
}

export function BundleCreationTable({
  data,
  totalCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  masterData,
  isLoading,
  onSubmit,
  onDelete,
  onSearch,
  onSelectionChange,
  actionComponent,
}: BundleCreationTableProps) {
  const columns = React.useMemo(
    () =>
      getDraftColumns({
        masterData,
        onSubmit,
        onDelete,
      }),
    [masterData, onSubmit, onDelete],
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
