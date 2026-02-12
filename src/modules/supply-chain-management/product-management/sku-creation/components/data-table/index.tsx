"use client";

import React from "react";

import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { getColumns } from "./columns";
import { SortingState } from "@tanstack/react-table";

interface SKUTableProps {
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
  onEdit?: (sku: SKU) => void;
  onDelete?: (id: number | string) => void;
  onSubmitForApproval?: (id: number | string) => void;
  onApprove?: (id: number | string) => void;
  onReject?: (id: number | string) => void;
  title: string;
  manualPagination?: boolean;
  onSearch?: (value: string) => void;
  onSelectionChange?: (selectedRows: SKU[]) => void;
  actionComponent?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function SKUTable({
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
  onEdit,
  onDelete,
  onSubmitForApproval,
  onApprove,
  onReject,
  title,
  manualPagination = true,
  onSearch,
  onSelectionChange,
  actionComponent,
  emptyTitle,
  emptyDescription,
}: SKUTableProps) {
  const columns = React.useMemo(
    () =>
      getColumns(
        masterData,
        onEdit,
        onDelete,
        onSubmitForApproval,
        onApprove,
        onReject,
      ),
    [masterData, onEdit, onDelete, onSubmitForApproval, onApprove, onReject],
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        pageCount={
          manualPagination ? Math.ceil(totalCount / pageSize) : undefined
        }
        pagination={manualPagination ? { pageIndex, pageSize } : undefined}
        onPaginationChange={onPaginationChange}
        manualPagination={manualPagination}
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
