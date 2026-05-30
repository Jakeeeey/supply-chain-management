"use client";

import React from "react";
import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { DataTable } from "@/components/ui/new-data-table";
import { SortingState } from "@tanstack/react-table";
import { getSegmentApprovalColumns } from "./columns";

interface SegmentApprovalTableProps {
  data: SKU[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  manualSorting?: boolean;
  masterData: MasterData | null;
  isLoading: boolean;
  onApprove?: (sku: SKU) => void;
  onReject?: (sku: SKU) => void;
  onSearch?: (v: string) => void;
  title: string;
  onSelectionChange?: (selectedRows: SKU[]) => void;
  actionComponent?: React.ReactNode;
}

export function SegmentApprovalTable({
  data,
  totalCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  sorting,
  onSortingChange,
  manualSorting = true,
  masterData,
  isLoading,
  onApprove,
  onReject,
  onSearch,
  onSelectionChange,
  actionComponent,
}: SegmentApprovalTableProps) {
  const columns = React.useMemo(
    () =>
      getSegmentApprovalColumns(
        masterData,
        onApprove,
        onReject,
      ),
    [masterData, onApprove, onReject],
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        pageCount={Math.ceil(totalCount / pageSize)}
        pagination={{ pageIndex, pageSize }}
        onPaginationChange={onPaginationChange}
        manualPagination={true}
        sorting={sorting}
        onSortingChange={onSortingChange}
        manualSorting={manualSorting}
        searchKey="product_name"
        onSearch={onSearch}
        isLoading={isLoading}
        onSelectionChange={onSelectionChange}
        actionComponent={actionComponent}
      />
    </div>
  );
}
