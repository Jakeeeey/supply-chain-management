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
import { DataTable } from "./components/ProductSectionDataTable";
import ErrorPage from "@/components/shared/ErrorPage";

import { ProductSectionApiRow } from "./types";
import { listProductSections } from "./providers/fetchProviders";
import { ProductSectionDialog } from "./components/ProductSectionDialog";
import { ViewProductSectionDialog } from "./components/ViewProductSectionDialog";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(
  onView: (row: ProductSectionApiRow) => void,
  onEdit: (row: ProductSectionApiRow) => void
): ColumnDef<ProductSectionApiRow>[] {
  return [
    {
      accessorKey: "section_name",
      header: "Section Name",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.section_name}</span>
      ),
      meta: { label: "Section Name" },
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

export default function ProductSectionModule() {
  const [data, setData] = useState<ProductSectionApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedProductSection, setSelectedProductSection] = useState<ProductSectionApiRow | null>(null);

  // Fetch ALL data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listProductSections(1, -1); // Fetch all
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load product sections", err);
      const message = err instanceof Error ? err.message : "Failed to load product sections.";
      setError(message);
      toast.error("Failed to load product sections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (row: ProductSectionApiRow) => {
    setSelectedProductSection(row);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (row: ProductSectionApiRow) => {
    setSelectedProductSection(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProductSection(null);
    setIsDialogOpen(true);
  };

  const columns = buildColumns(handleView, handleEdit);

  if (error && !loading) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Product Sections Unreachable"
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
        searchKey="section_name"
        isLoading={loading}
        emptyTitle="No product sections found"
        emptyDescription="Create your first product section to get started."
        actionComponent={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Product Section
          </Button>
        }
      />

      <ProductSectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedProductSection={selectedProductSection}
        onSuccess={fetchData}
      />

      <ViewProductSectionDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        selectedProductSection={selectedProductSection}
      />
    </div>
  );
}
