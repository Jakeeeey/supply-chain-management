"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MoreHorizontal, Pencil, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
// ✅ Pagination Imports
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

import { UnitApiRow } from "./types";
import { listUnits } from "./providers/fetchProviders";
import { UnitDialog } from "./components/UnitDialog";

export default function UnitOfMeasurementModule() {
  const [data, setData] = useState<UnitApiRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Search & Pagination State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const LIMIT = 12;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitApiRow | null>(null);

  // 1. Debounce Effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // 2. Fetch Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listUnits(page, LIMIT, debouncedSearch);
      setData(res.data);
      setTotalCount(res.total);
    } catch (err) {
      toast.error("Failed to load units");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

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

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search units..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Unit
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unit Name</TableHead>
              <TableHead>Shortcut</TableHead>
              <TableHead>SKU Code</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="w-25 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-6 w-37.5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-12.5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-12.5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-12.5" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {search ? "No units match your search." : "No units found."}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.unit_id}>
                  <TableCell className="font-medium">{row.unit_name}</TableCell>
                  <TableCell>{row.unit_shortcut}</TableCell>
                  <TableCell>{row.sku_code || "-"}</TableCell>
                  <TableCell>{row.order ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(row)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
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

      <UnitDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedUnit={selectedUnit}
        onSuccess={fetchData}
      />
    </div>
  );
}
