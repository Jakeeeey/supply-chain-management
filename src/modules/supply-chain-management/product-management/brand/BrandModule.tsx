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

import { BrandApiRow } from "./types";
import { listBrands } from "./providers/fetchProviders";
import { BrandDialog } from "./components/BrandDialog";
import { ViewBrandDialog } from "./components/ViewBrandDialog";

// =============================================================================
// COLUMN DEFINITIONS
// =============================================================================

function buildColumns(
  onView: (row: BrandApiRow) => void,
  onEdit: (row: BrandApiRow) => void
): ColumnDef<BrandApiRow>[] {
  return [
    {
      accessorKey: "brand_name",
      header: "Brand Name",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.brand_name}</span>
      ),
      meta: { label: "Brand Name" },
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

type BrandModuleProps = {
  currentUser?: { id: string; name: string; email: string };
};

export default function BrandModule({ currentUser }: BrandModuleProps) {
  const [data, setData] = useState<BrandApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandApiRow | null>(null);

  // Fetch ALL data (client-side pagination)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listBrands(1, -1); // Fetch all
      setData(res.data);
    } catch (err: unknown) {
      console.error("Failed to load brands", err);
      const message = err instanceof Error ? err.message : "Failed to load brands.";
      setError(message);
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleView = (row: BrandApiRow) => {
    setSelectedBrand(row);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (row: BrandApiRow) => {
    setSelectedBrand(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedBrand(null);
    setIsDialogOpen(true);
  };

  const columns = buildColumns(handleView, handleEdit);

  // Error State
  if (error && !loading) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Brands Unreachable"
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
        searchKey="brand_name"
        isLoading={loading}
        emptyTitle="No brands found"
        emptyDescription="Create your first brand to get started."
        actionComponent={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Brand
          </Button>
        }
      />

      <BrandDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedBrand={selectedBrand}
        onSuccess={fetchData}
        currentUser={currentUser}
      />

      <ViewBrandDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        selectedBrand={selectedBrand}
      />
    </div>
  );
}
