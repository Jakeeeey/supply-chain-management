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
import { DataTable } from "./components/ProductClassDataTable";
import ErrorPage from "@/components/shared/ErrorPage";

import { ProductClassApiRow } from "./types";
import { listProductClasses } from "./providers/fetchProviders";
import { ProductClassDialog } from "./components/ProductClassDialog";
import { ViewProductClassDialog } from "./components/ViewProductClassDialog";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(
  onView: (row: ProductClassApiRow) => void,
  onEdit: (row: ProductClassApiRow) => void
): ColumnDef<ProductClassApiRow>[] {
  return [
    {
      accessorKey: "class_name",
      header: "Class Name",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.class_name}</span>
      ),
      meta: { label: "Class Name" },
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

export default function ProductClassModule() {
  const [data, setData] = useState<ProductClassApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedProductClass, setSelectedProductClass] = useState<ProductClassApiRow | null>(null);

  // Fetch ALL data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listProductClasses(1, -1); // Fetch all
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load product classes", err);
      const message = err instanceof Error ? err.message : "Failed to load product classes.";
      setError(message);
      toast.error("Failed to load product classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (row: ProductClassApiRow) => {
    setSelectedProductClass(row);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (row: ProductClassApiRow) => {
    setSelectedProductClass(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProductClass(null);
    setIsDialogOpen(true);
  };

  const columns = buildColumns(handleView, handleEdit);

  if (error && !loading) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Product Classes Unreachable"
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
        searchKey="class_name"
        isLoading={loading}
        emptyTitle="No product classes found"
        emptyDescription="Create your first product class to get started."
        actionComponent={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Product Class
          </Button>
        }
      />

      <ProductClassDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedProductClass={selectedProductClass}
        onSuccess={fetchData}
      />

      <ViewProductClassDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        selectedProductClass={selectedProductClass}
      />
    </div>
  );
}
