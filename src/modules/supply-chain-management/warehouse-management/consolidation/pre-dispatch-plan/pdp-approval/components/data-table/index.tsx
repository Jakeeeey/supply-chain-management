"use client";

import { DataTable } from "@/components/ui/new-data-table";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import React from "react";
import { getPDPApprovalColumns } from "./columns";

interface PDPApprovalTableProps {
  data: DispatchPlan[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPaginationChange: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  isLoading: boolean;
  onView: (plan: DispatchPlan) => void;
  onApprove: (plan: DispatchPlan) => void;
  onSearch: (value: string) => void;
}

/**
 * DataTable wrapper for PDP Approval.
 */
export function PDPApprovalTable({
  data,
  totalCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  isLoading,
  onView,
  onApprove,
  onSearch,
}: PDPApprovalTableProps) {
  const columns = React.useMemo(
    () => getPDPApprovalColumns({ onView, onApprove }),
    [onView, onApprove],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="dispatch_no"
      isLoading={isLoading}
      manualPagination
      pageCount={Math.ceil(totalCount / pageSize)}
      pagination={{ pageIndex, pageSize }}
      onPaginationChange={onPaginationChange}
      onSearch={onSearch}
      emptyTitle="No Plans Pending Approval"
      emptyDescription="All dispatch plans have been processed."
    />
  );
}
