"use client";

import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { getColumns } from "./columns";

interface SKUTableProps {
  data: SKU[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
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
}

export function SKUTable({ 
  data, 
  totalCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  masterData,
  isLoading, 
  onEdit, 
  onDelete, 
  onSubmitForApproval, 
  onApprove,
  onReject,
  title,
  manualPagination = true,
  onSearch
}: SKUTableProps) {
  
  const columns = getColumns(
    masterData,
    onEdit,
    onDelete,
    onSubmitForApproval,
    onApprove,
    onReject
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable 
        columns={columns} 
        data={data}
        pageCount={manualPagination ? Math.ceil(totalCount / pageSize) : undefined}
        pagination={manualPagination ? { pageIndex, pageSize } : undefined}
        onPaginationChange={onPaginationChange}
        manualPagination={manualPagination}
        searchKey="product_name"
        onSearch={onSearch}
      />
    </div>
  );
}
