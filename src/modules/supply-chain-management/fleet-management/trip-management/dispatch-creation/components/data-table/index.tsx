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
  onBudget: (plan: DispatchPlanSummary) => void;
  onSearch?: (v: string) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DispatchPlanTable({
  data,
  isLoading,
  onEdit,
  onBudget,
  onSearch,
  sorting,
  onSortingChange,
  emptyTitle,
  emptyDescription,
}: DispatchPlanTableProps) {
  const columns = React.useMemo(
    () => getDispatchPlanColumns(onEdit, onBudget),
    [onEdit, onBudget],
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
}
