"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

import { EngineTypeApiRow } from "./types";
import { listEngineTypes } from "./providers/fetchProviders";
import { EngineTypeDialog } from "./components/EngineTypeDialog";
import { EngineTypeTable } from "./components/EngineTypeTable";

export default function EngineTypeModule() {
  const [data, setData] = useState<EngineTypeApiRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const LIMIT = 12;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEngineType, setSelectedEngineType] =
    useState<EngineTypeApiRow | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listEngineTypes(page, LIMIT, debouncedSearch);
      setData(res.data);
      setTotalCount(res.total);
    } catch {
      toast.error("Failed to load engine types");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (row: EngineTypeApiRow) => {
    setSelectedEngineType(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedEngineType(null);
    setIsDialogOpen(true);
  };

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engine Types</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and view all vehicle engine types in the system.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Engine Type
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search engine types..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <EngineTypeTable
        data={data}
        loading={loading}
        search={search}
        onEdit={handleEdit}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
            </PaginationItem>

            <PaginationItem>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
            </PaginationItem>

            <PaginationItem>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <EngineTypeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedEngineType={selectedEngineType}
        onSuccess={fetchData}
      />
    </div>
  );
}
