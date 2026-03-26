"use client";

import { DataTable } from "@/components/ui/new-data-table";
import { SortingState } from "@tanstack/react-table";
import React from "react";
import { DispatchPlanSummary, getDispatchPlanColumns } from "./columns";

export type { DispatchPlanSummary };

interface DispatchPlanTableProps {
  data: DispatchPlanSummary[];
  isLoading: boolean;
  onEdit: (plan: DispatchPlanSummary) => void;
  onSearch?: (v: string) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const DispatchPlanTable = React.memo(function DispatchPlanTable({
  data,
  isLoading,
  onEdit,
  onSearch,
  sorting,
  onSortingChange,
  emptyTitle,
  emptyDescription,
}: DispatchPlanTableProps) {
  const columns = React.useMemo(
    () => getDispatchPlanColumns(onEdit),
    [onEdit],
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchKey="dpNumber"
        onSearch={onSearch}
        sorting={sorting}
        onSortingChange={onSortingChange}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    </div>
  );
});
