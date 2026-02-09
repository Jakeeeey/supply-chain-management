"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MoreHorizontal, Pencil, Search, Loader2 } from "lucide-react"; // Added Loader2
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { BrandApiRow } from "./types";
import { listBrands } from "./providers/fetchProviders";
import { BrandDialog } from "./components/BrandDialog";

export default function BrandModule() {
  const [data, setData] = useState<BrandApiRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Search & Pagination State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(""); // Actual value used for fetching
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const LIMIT = 12;

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<BrandApiRow | null>(null);

  // 1. Debounce Logic: Wait 500ms after user stops typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  // 2. Fetch Data (Triggers on Page Change OR Debounced Search Change)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Pass debouncedSearch to provider
      const res = await listBrands(page, LIMIT, debouncedSearch);
      setData(res.data);
      setTotalCount(res.total);
    } catch (err) {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (row: BrandApiRow) => {
    setSelectedBrand(row);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedBrand(null);
    setIsDialogOpen(true);
  };

  const totalPages = Math.ceil(totalCount / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Brand
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand Name</TableHead>
              <TableHead>SKU Code</TableHead>
              <TableHead className="w-25 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-6 w-50" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-25" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  {search ? "No brands match your search." : "No brands found."}
                </TableCell>
              </TableRow>
            ) : (
              // ✅ Map directly over 'data' (server-side results), not filteredData
              data.map((row) => (
                <TableRow key={row.brand_id}>
                  <TableCell className="font-medium">
                    {row.brand_name}
                  </TableCell>
                  <TableCell>{row.sku_code || "-"}</TableCell>
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

      {/* Pagination UI */}
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

      <BrandDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedBrand={selectedBrand}
        onSuccess={fetchData}
      />
    </div>
  );
}
