"use client";

import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { Badge } from "@/components/ui/badge";
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
  onEdit: (sku: SKU) => void;
  onDelete: (id: number) => void;
  onSubmitForApproval: (id: number) => void;
  onApprove: (id: number) => void;
  title: string;
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
  title
}: SKUTableProps) {
  
  const columns = getColumns(
    masterData,
    onEdit,
    onDelete,
    onSubmitForApproval,
    onApprove
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
        pageCount={Math.ceil(totalCount / pageSize)}
        pagination={{ pageIndex, pageSize }}
        onPaginationChange={onPaginationChange}
        manualPagination={true}
        searchKey="product_name"
      />
    </div>
  );
}
