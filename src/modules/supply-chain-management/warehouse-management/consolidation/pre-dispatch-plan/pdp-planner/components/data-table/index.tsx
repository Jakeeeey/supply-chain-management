"use client";

import { DataTable } from "@/components/ui/new-data-table";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import React from "react";
import { getPDPPlannerColumns } from "./columns";

interface PDPPlannerTableProps {
  data: DispatchPlan[];
  totalCount: number;
  isLoading: boolean;
  onView: (plan: DispatchPlan) => void;
  onApprove: (plan: DispatchPlan) => void;
  onSearch: (value: string) => void;
  actionComponent?: React.ReactNode;
}

/**
 * DataTable wrapper for PDP Planner.
 */
export function PDPPlannerTable({
  data,
  totalCount,
  isLoading,
  onView,
  onApprove,
  onSearch,
  actionComponent,
}: PDPPlannerTableProps) {
  const columns = React.useMemo(
    () => getPDPPlannerColumns({ onView, onApprove }),
    [onView, onApprove],
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
    />
  );
}
