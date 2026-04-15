"use client";

import React from "react";
import {
  SKU,
  MasterData,
} from "@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema";

import { DataTable } from "@/components/ui/new-data-table";
import { getMasterlistColumns } from "./columns";
import { SortingState } from "@tanstack/react-table";

interface MasterlistTableProps {
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
  parentImages?: Record<number, string | null>;
  isLoading: boolean;
  title: string;
  onSearch?: (value: string) => void;
  onSelectionChange?: (selectedRows: SKU[]) => void;
  onToggleStatus?: (id: number | string, current: boolean) => void;
  onEdit?: (sku: SKU) => void;
  onUpdateImage?: (sku: SKU) => void;
  onViewGallery?: (sku: SKU) => void;
  actionComponent?: React.ReactNode;
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
  parentImages = {},
  isLoading,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  title,
  onSearch,
  onSelectionChange,
  onToggleStatus,
  onEdit,
  onUpdateImage,
  onViewGallery,
  actionComponent,
  emptyTitle,
  emptyDescription,
}: MasterlistTableProps) {
  const columns = React.useMemo(
    () =>
      getMasterlistColumns(
        masterData,
        parentImages,
        onToggleStatus,
        onEdit,
        onUpdateImage,
        onViewGallery,
      ),
    [
      masterData,
      parentImages,
      onToggleStatus,
      onEdit,
      onUpdateImage,
      onViewGallery,
    ],
  );

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
        onSelectionChange={onSelectionChange}
        actionComponent={actionComponent}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
}
