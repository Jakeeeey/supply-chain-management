"use client";

import { DataTable } from "@/components/ui/new-data-table";
import { DispatchPlan } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/types/dispatch-plan.schema";
import React from "react";
import { getPDPCreationColumns } from "./columns";

interface PDPCreationTableProps {
  data: DispatchPlan[];
  totalCount: number;
  isLoading: boolean;
  onEdit: (plan: DispatchPlan) => void;
  onSearch: (value: string) => void;
  actionComponent?: React.ReactNode;
}

/**
 * DataTable wrapper for PDP Creation (Pending plans).
 */
export function PDPCreationTable({
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalCount,
  isLoading,
  onEdit,
  onSearch,
  actionComponent,
}: PDPCreationTableProps) {
  const columns = React.useMemo(
    () => getPDPCreationColumns({ onEdit }),
    [onEdit],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="dispatch_no"
      isLoading={isLoading}
      onSearch={onSearch}
      actionComponent={actionComponent}
      emptyTitle="No Pending Plans"
      emptyDescription="Create a new pre-dispatch plan to get started."
    />
  );
}
