"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MoreHorizontal, Pencil, Eye, Boxes } from "lucide-react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/new-data-table";
import ErrorPage from "@/components/shared/ErrorPage";

import { formatDate } from "./lib/utils";

import { RTSReturnType } from "./types";
import { listRTSReturnTypes } from "./providers/fetchProviders";
import { RTSReturnTypeDialog } from "./components/RTSReturnTypeDialog";
import { ViewRTSReturnTypeDialog } from "./components/ViewRTSReturnTypeDialog";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(
  onView: (row: RTSReturnType) => void,
  onEdit: (row: RTSReturnType) => void,
): ColumnDef<RTSReturnType>[] {
  return [
    {
      id: "no",
      header: "No.",
      cell: ({ row }) => <span className="font-medium">{row.index + 1}</span>,
      meta: { label: "No." },
    },
    {
      accessorKey: "return_type_name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.return_type_name}</span>
      ),
      meta: { label: "Name" },
    },
    {
      accessorKey: "return_type_code",
      header: "Code",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.return_type_code}
        </Badge>
      ),
      meta: { label: "Code" },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] inline-block text-muted-foreground">
          {row.original.description || "-"}
        </span>
      ),
      meta: { label: "Description" },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge 
          variant={row.original.isActive ? "default" : "secondary"}
          className="font-semibold"
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      meta: { label: "Status" },
    },
    {
      accessorKey: "created_by_name",
      header: "Created by",
      cell: ({ row }) => row.original.created_by_name,
      meta: { label: "Created by" },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => formatDate(row.original.created_at),
      meta: { label: "Created At" },
    },
    {
      accessorKey: "updated_by_name",
      header: "Updated by",
      cell: ({ row }) => row.original.updated_by_name,
      meta: { label: "Updated by" },
    },
    {
      accessorKey: "updated_at",
      header: "Updated at",
      cell: ({ row }) => formatDate(row.original.updated_at),
      meta: { label: "Updated at" },
    },
    {
      id: "actions",
      header: () => <div className="text-right px-4">Actions</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-right px-4">
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
                <Pencil className="mr-2 h-4 w-4" /> Edit Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}

// =============================================================================
// MODULE
// =============================================================================

export default function RTSReturnTypeModule() {
  const [data, setData] = useState<RTSReturnType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<RTSReturnType | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listRTSReturnTypes(1, -1);
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load RTS return types", err);
      const message =
        err instanceof Error ? err.message : "Failed to load records from server.";
      setError(message);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (row: RTSReturnType) => {
    setSelectedType(row);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (row: RTSReturnType) => {
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
        code="Network Failure"
        title="Supplier Return Types Unreachable"
        message={error}
        reset={fetchData}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-2">
           <Boxes className="h-6 w-6 text-primary" />
           <h2 className="text-2xl font-bold tracking-tight">Return To Supplier Type</h2>
        </div>
        
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> New Return Type
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="return_type_name"
        isLoading={loading}
        emptyTitle="No Return Types found"
        emptyDescription="Start by categorizing your supplier returns here."
      />

      <RTSReturnTypeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedType={selectedType}
        onSuccess={fetchData}
        existingData={data}
      />

      <ViewRTSReturnTypeDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        selectedType={selectedType}
      />
    </div>
  );
}
