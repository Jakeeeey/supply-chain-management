"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MoreHorizontal, Pencil, Info } from "lucide-react";
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
      header: "Unit Code",
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
    } catch (err: unknown) {
      console.error("Failed to load units", err);
      const message = err instanceof Error ? err.message : "Failed to load units.";
      setError(message);
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
      {/* 📘 Sort Order Legend Map */}
      <div className="bg-muted/30 border rounded-lg p-4 flex gap-3 items-start transition-all hover:bg-muted/40">
        <div className="bg-primary/10 p-1.5 rounded-md mt-0.5">
          <Info className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold leading-none">Sort Order Legend</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The <b>Order</b> number defines the relative scale of units to aid in sorting and grouping:
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/10 font-bold text-[10px]">1</span>
              <span><b>Small Units</b> (piece, gram, ml)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/10 font-bold text-[10px]">2</span>
              <span><b>Medium Units</b> (pack, kg, L)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/10 font-bold text-[10px]">3</span>
              <span><b>Big Units</b> (box, case, crate)</span>
            </div>
          </div>
        </div>
      </div>

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
