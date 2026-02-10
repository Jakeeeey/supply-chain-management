"use client";

import React from "react";
import { SKU, MasterData } from "@/modules/supply-chain-management/product-management/sku-creation/types/sku.schema";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { getApprovalColumns } from "./columns";

interface ApprovalTableProps {
  data: SKU[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  masterData: MasterData | null;
  isLoading: boolean;
  onApprove?: (id: number | string) => void;
  onReject?: (id: number | string) => void;
  title: string;
}

export function ApprovalTable({ 
  data, 
  totalCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  masterData,
  isLoading, 
  onApprove,
  onReject,
  title
}: ApprovalTableProps) {
  
  const columns = React.useMemo(() => getApprovalColumns(
    masterData,
    onApprove,
    onReject
  ), [masterData, onApprove, onReject]);

  // We don't unmount the table during loading to prevent losing focus on search
  
  return (
    <div className="space-y-4">
      <DataTable 
        columns={columns} 
        data={data}
        pageCount={Math.ceil(totalCount / pageSize)}
        pagination={{ pageIndex, pageSize }}
        onPaginationChange={onPaginationChange}
        manualPagination={false} // Approval queue is currently handled client-side
        searchKey="product_name"
        isLoading={isLoading}
      />
    </div>
  );
}
