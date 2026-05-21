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
import { DataTable } from "./components/ProductSegmentDataTable";
import ErrorPage from "@/components/shared/ErrorPage";

import { ProductSegmentApiRow } from "./types";
import { listProductSegments } from "./providers/fetchProviders";
import { ProductSegmentDialog } from "./components/ProductSegmentDialog";
import { ViewProductSegmentDialog } from "./components/ViewProductSegmentDialog";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(
  onView: (row: ProductSegmentApiRow) => void,
  onEdit: (row: ProductSegmentApiRow) => void
): ColumnDef<ProductSegmentApiRow>[] {
  return [
    {
      accessorKey: "segment_name",
      header: "Segment Name",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.segment_name}</span>
      ),
      meta: { label: "Segment Name" },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || "—",
      meta: { label: "Description" },
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
                <Eye className="mr-2 h-4 w-4" /> View
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
// MODULE
// =============================================================================

export default function ProductSegmentModule() {
  const [data, setData] = useState<ProductSegmentApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedProductSegment, setSelectedProductSegment] = useState<ProductSegmentApiRow | null>(null);

  // Fetch ALL data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listProductSegments(1, -1); // Fetch all
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load product segments", err);
      const message = err instanceof Error ? err.message : "Failed to load product segments.";
      setError(message);
      toast.error("Failed to load product segments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (row: ProductSegmentApiRow) => {
    setSelectedProductSegment(row);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (row: ProductSegmentApiRow) => {
    setSelectedProductSegment(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProductSegment(null);
    setIsDialogOpen(true);
  };

  const columns = buildColumns(handleView, handleEdit);

  if (error && !loading) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Product Segments Unreachable"
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
        searchKey="segment_name"
        isLoading={loading}
        emptyTitle="No product segments found"
        emptyDescription="Create your first product segment to get started."
        actionComponent={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Product Segment
          </Button>
        }
      />

      <ProductSegmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedProductSegment={selectedProductSegment}
        onSuccess={fetchData}
      />

      <ViewProductSegmentDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        selectedProductSegment={selectedProductSegment}
      />
    </div>
  );
}
