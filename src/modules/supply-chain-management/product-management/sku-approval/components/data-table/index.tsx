"use client";

import React from "react";
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { getApprovalColumns } from "./columns";
import { SortingState } from "@tanstack/react-table";

interface ApprovalTableProps {
  data: SKU[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  manualSorting?: boolean;
  masterData: MasterData | null;
  isLoading: boolean;
  onApprove?: (id: number | string) => void;
  onReject?: (id: number | string) => void;
  onSearch?: (v: string) => void;
  title: string;
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
  onSearch,
  title,
  emptyTitle,
  emptyDescription
}: ApprovalTableProps) {
  
  const columns = React.useMemo(() => getApprovalColumns(
    masterData,
    undefined, // No onView provided
    onApprove,
    onReject
  ), [masterData, onApprove, onReject]);

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
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}
