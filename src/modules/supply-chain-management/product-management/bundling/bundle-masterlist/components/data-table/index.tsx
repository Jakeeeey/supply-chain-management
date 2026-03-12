"use client";

import React from "react";
import { DataTable } from "@/components/ui/new-data-table";
import { getMasterlistColumns } from "./columns";
import {
  Bundle,
  BundleMasterData,
} from "@/modules/supply-chain-management/product-management/bundling/types/bundle.schema";

interface BundleMasterlistTableProps {
  data: Bundle[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  masterData: BundleMasterData | null;
  isLoading: boolean;
  onSearch: (value: string) => void;
}

export function BundleMasterlistTable({
  data,
  totalCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  masterData,
  isLoading,
  onSearch,
}: BundleMasterlistTableProps) {
  const columns = React.useMemo(
    () => getMasterlistColumns({ masterData }),
    [masterData],
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
