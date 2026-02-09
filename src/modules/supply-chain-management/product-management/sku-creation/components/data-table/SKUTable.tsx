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
      <div className="rounded-xl border bg-card shadow-sm p-8 space-y-4">
        <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h3 className="font-black text-xl tracking-tight text-slate-900 group">{title}</h3>
            <p className="text-sm text-muted-foreground font-medium">Viewing {data.length} of {totalCount} records</p>
        </div>
        <Badge variant="secondary" className="px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest border border-slate-200">
            {totalCount} Total Entries
        </Badge>
      </div>

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
