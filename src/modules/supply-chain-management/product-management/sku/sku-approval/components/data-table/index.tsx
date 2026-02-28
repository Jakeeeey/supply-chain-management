"use client";

import React from "react";
import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/new-data-table";
import { getApprovalColumns } from "./columns";
import { SortingState } from "@tanstack/react-table";

interface ApprovalTableProps {
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
  onApprove?: (id: number | string) => void;
  onReject?: (sku: SKU) => void;
  onEdit?: (sku: SKU) => void;
  onSearch?: (v: string) => void;
  title: string;
  onSelectionChange?: (selectedRows: SKU[]) => void;
  actionComponent?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ApprovalTable({
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
  onEdit,
  onSearch,
  title,
  onSelectionChange,
  actionComponent,
  emptyTitle,
  emptyDescription,
}: ApprovalTableProps) {
  const columns = React.useMemo(
    () =>
      getApprovalColumns(
        masterData,
        undefined, // No onView provided
        onApprove,
        onReject,
        onEdit,
      ),
    [masterData, onApprove, onReject, onEdit],
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
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}
