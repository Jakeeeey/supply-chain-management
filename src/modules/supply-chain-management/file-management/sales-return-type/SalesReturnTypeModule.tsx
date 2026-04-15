"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MoreHorizontal, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/new-data-table";
import ErrorPage from "@/components/shared/ErrorPage";

import { formatDate } from "./lib/utils";
import { SalesReturnType } from "./types";
import { listSalesReturnTypes } from "./providers/fetchProviders";
import { SalesReturnTypeDialog } from "./components/SalesReturnTypeDialog";
import { ViewSalesReturnTypeDialog } from "./components/ViewSalesReturnTypeDialog";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(
  onView: (row: SalesReturnType) => void,
  onEdit: (row: SalesReturnType) => void,
): ColumnDef<SalesReturnType>[] {
  return [
    {
      id: "no",
      header: "No.",
      cell: ({ row }) => <span className="font-medium">{row.index + 1}</span>,
      meta: { label: "No." },
    },
    {
      accessorKey: "type_name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.type_name}</span>
      ),
      meta: { label: "Name" },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || "-",
      meta: { label: "Description" },
    },
    {
      accessorKey: "created_by_name",
      header: "Created by",
      cell: ({ row }) => row.original.created_by_name || "-",
      meta: { label: "Created by" },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => formatDate(row.original.created_at),
      meta: { label: "Created At" },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(row.original)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}

// =============================================================================
// MODULE PROPS
// =============================================================================



// =============================================================================
// MODULE
// =============================================================================

export default function SalesReturnTypeModule() {
  const [data, setData] = useState<SalesReturnType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SalesReturnType | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listSalesReturnTypes(1, -1);
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load sales return types", err);
      const message =
        err instanceof Error ? err.message : "Failed to load sales return types.";
      setError(message);
      toast.error("Failed to load sales return types");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (row: SalesReturnType) => {
    setSelectedType(row);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (row: SalesReturnType) => {
    setSelectedType(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedType(null);
    setIsDialogOpen(true);
  };

  const columns = buildColumns(handleView, handleEdit);

  if (error && !loading) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Sales Return Types Unreachable"
        message={error}
        reset={fetchData}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Sales Return Type</h2>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="type_name"
        isLoading={loading}
        emptyTitle="No sales return types found"
        emptyDescription="Create your first sales return type to get started."
        actionComponent={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Type
          </Button>
        }
      />

      <SalesReturnTypeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedType={selectedType}
        onSuccess={fetchData}
        existingData={data}
      />

      <ViewSalesReturnTypeDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        selectedType={selectedType}
      />
    </div>
  );
}
