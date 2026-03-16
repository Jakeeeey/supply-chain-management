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

import { CategoryApiRow } from "./types";
import { listCategories } from "./providers/fetchProviders";
import { CategoryDialog } from "./components/CategoryDialog";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(onEdit: (row: CategoryApiRow) => void): ColumnDef<CategoryApiRow>[] {
  return [
    {
      accessorKey: "category_name",
      header: "Category Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.category_name}</span>
      ),
      meta: { label: "Category Name" },
    },
    {
      accessorKey: "sku_code",
      header: "SKU Code",
      cell: ({ row }) => row.original.sku_code || "-",
      meta: { label: "SKU Code" },
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

export default function CategoryModule() {
  const [data, setData] = useState<CategoryApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryApiRow | null>(null);

  // Fetch ALL data (client-side pagination)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listCategories(1, -1); // Fetch all
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load categories", err);
      setError(err.message || "Failed to load categories.");
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (row: CategoryApiRow) => {
    setSelectedCategory(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setIsDialogOpen(true);
  };

  const columns = buildColumns(handleEdit);

  // Error State
  if (error && !loading) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Categories Unreachable"
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
        searchKey="category_name"
        isLoading={loading}
        emptyTitle="No categories found"
        emptyDescription="Create your first category to get started."
        actionComponent={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Category
          </Button>
        }
      />

      <CategoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedCategory={selectedCategory}
        onSuccess={fetchData}
      />
    </div>
  );
}
