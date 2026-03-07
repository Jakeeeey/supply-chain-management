"use client";

import { DataTable } from "@/components/ui/new-data-table";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import React from "react";
import { getPDPCreationColumns } from "./columns";

interface PDPCreationTableProps {
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
  onSearch: (value: string) => void;
  actionComponent?: React.ReactNode;
}

/**
 * DataTable wrapper for PDP Creation (Pending plans).
 */
export function PDPCreationTable({
  data,
  totalCount,
  pageIndex,
  pageSize,
  onPaginationChange,
  isLoading,
  onView,
  onSearch,
  actionComponent,
}: PDPCreationTableProps) {
  const columns = React.useMemo(
    () => getPDPCreationColumns({ onView }),
    [onView],
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
      actionComponent={actionComponent}
      emptyTitle="No Pending Plans"
      emptyDescription="Create a new pre-dispatch plan to get started."
    />
  );
}
