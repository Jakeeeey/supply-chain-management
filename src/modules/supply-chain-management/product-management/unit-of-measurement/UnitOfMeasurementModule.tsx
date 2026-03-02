"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MoreHorizontal, Pencil } from "lucide-react";
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

import { UnitApiRow } from "./types";
import { listUnits } from "./providers/fetchProviders";
import { UnitDialog } from "./components/UnitDialog";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(onEdit: (row: UnitApiRow) => void): ColumnDef<UnitApiRow>[] {
  return [
    {
      accessorKey: "unit_name",
      header: "Unit Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.unit_name}</span>
      ),
      meta: { label: "Unit Name" },
    },
    {
      accessorKey: "unit_shortcut",
      header: "Shortcut",
      cell: ({ row }) => row.original.unit_shortcut || "-",
      meta: { label: "Shortcut" },
    },
    {
      accessorKey: "sku_code",
      header: "SKU Code",
      cell: ({ row }) => row.original.sku_code || "-",
      meta: { label: "SKU Code" },
    },
    {
      accessorKey: "order",
      header: "Order",
      cell: ({ row }) => row.original.order ?? "-",
      meta: { label: "Order" },
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
// MODULE
// =============================================================================

export default function UnitOfMeasurementModule() {
  const [data, setData] = useState<UnitApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitApiRow | null>(null);

  // Fetch ALL data (client-side pagination)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listUnits(1, -1); // Fetch all
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load units", err);
      setError(err.message || "Failed to load units.");
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (row: UnitApiRow) => {
    setSelectedUnit(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedUnit(null);
    setIsDialogOpen(true);
  };

  const columns = buildColumns(handleEdit);

  // Error State
  if (error && !loading) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Units Unreachable"
        message={error}
        reset={fetchData}
      />
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        searchKey="unit_name"
        isLoading={loading}
        emptyTitle="No units found"
        emptyDescription="Create your first unit of measurement to get started."
        actionComponent={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Unit
          </Button>
        }
      />

      <UnitDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedUnit={selectedUnit}
        onSuccess={fetchData}
      />
    </div>
  );
}
