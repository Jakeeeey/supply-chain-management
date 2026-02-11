"use client";

import React from "react";
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { getMasterlistColumns } from "./columns";
import { SortingState } from "@tanstack/react-table";

interface MasterlistTableProps {
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
  onEdit?: (sku: SKU) => void;
  title: string;
  onSearch?: (value: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function MasterlistTable({ 
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
  title,
  onSearch,
  emptyTitle,
  emptyDescription
}: MasterlistTableProps) {
  
  const columns = React.useMemo(() => getMasterlistColumns(
    masterData,
    onEdit
  ), [masterData, onEdit]);

  // We don't unmount the table during loading anymore 
  // to prevent losing focus on the search input.

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
