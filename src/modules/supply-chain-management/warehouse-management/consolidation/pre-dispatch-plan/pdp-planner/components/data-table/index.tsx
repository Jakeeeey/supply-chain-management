"use client";

import { DataTable } from "@/components/ui/new-data-table";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import React from "react";
import { getPDPPlannerColumns } from "./columns";

interface PDPPlannerTableProps {
  data: DispatchPlan[];
  totalCount: number;
  pagination: {
    pageIndex: number;
    pageSize: number;
  };
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  isLoading: boolean;
  onView: (plan: DispatchPlan) => void;
  onApprove: (plan: DispatchPlan) => void;
  onReject: (plan: DispatchPlan) => void;
  onSearch: (value: string) => void;
  actionComponent?: React.ReactNode;
}

/**
 * DataTable wrapper for PDP Planner.
 */
export function PDPPlannerTable({
  data,
  totalCount,
  pagination,
  onPaginationChange,
  isLoading,
  onView,
  onApprove,
  onReject,
  onSearch,
  actionComponent,
}: PDPPlannerTableProps) {
  const columns = React.useMemo(
    () => getPDPPlannerColumns({ onView, onApprove, onReject }),
    [onView, onApprove, onReject],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="dispatch_no"
      isLoading={isLoading}
      onSearch={onSearch}
      actionComponent={actionComponent}
      emptyTitle="No Dispatch Plans"
      emptyDescription="No dispatch plans have been created yet."
      manualPagination
      pageCount={Math.ceil(totalCount / pagination.pageSize)}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
    />
  );
}
