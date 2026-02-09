"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Filter,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"; // Import navigation icons

import { ProductTable } from "./components/ProductTable";
import { ScannerModal } from "./components/ScannerModal";
import { useBarcodeScanner, FilterStatus } from "./hooks/useBarcodeScanner";
import { Spinner } from "@/components/ui/spinner";

export default function BarCodeScannerModule() {
  const {
    products,
    isLoading,
    selectedProduct,
    setSelectedProduct,
    handleUpdateBarcode,
    currentPage,
    setCurrentPage,
    totalPages,
    filter,
    setFilter,
    totalItems,
  } = useBarcodeScanner();

  // Local state for the page input to allow typing without immediate jumping
  const [pageInput, setPageInput] = useState(String(currentPage));

  // Sync input value when page changes externally (e.g. via buttons)
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Handle Input Submit (Enter key or Blur)
  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    } else {
      // Revert to current valid page if input is invalid
      setPageInput(String(currentPage));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePageInputSubmit();
    }
  };

  // Helper to make the filter button text dynamic
  const getFilterLabel = () => {
    switch (filter) {
      case "missing":
        return "Missing Barcodes";
      case "completed":
        return "With Barcodes";
      default:
        return "All Products";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Barcode Management
          </h1>
          <p className="text-muted-foreground">
            Scan or manually enter barcodes to assign them to existing products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-40 justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span>{getFilterLabel()}</span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-50">
              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(v) => setFilter(v as FilterStatus)}
              >
                <DropdownMenuRadioItem value="all">
                  Show All
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="missing">
                  Missing Barcode Only
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="completed">
                  With Barcode Only
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>
            Showing {products.length} of {totalItems} filtered products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <ProductTable
                products={products}
                onEdit={(product) => setSelectedProduct(product)}
              />
            </div>
          )}
        </CardContent>

        {/* Advanced Pagination Footer */}
        {!isLoading && totalPages > 1 && (
          <CardFooter className="flex justify-center sm:justify-end border-t pt-4 select-none">
            <Pagination>
              <PaginationContent className="gap-1">
                {/* First Page Button */}
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>

                {/* Previous Page Button */}
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>

                {/* Page Input Area */}
                <div className="flex items-center gap-2 mx-2">
                  <span className="text-sm text-muted-foreground">Page</span>
                  <Input
                    className="h-8 w-12 text-center px-1"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={handlePageInputSubmit}
                    onKeyDown={handleKeyDown}
                    aria-label="Page number input"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    of {totalPages}
                  </span>
                </div>

                {/* Next Page Button */}
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>

                {/* Last Page Button */}
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        )}
      </Card>

      <ScannerModal
        open={!!selectedProduct}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSave={handleUpdateBarcode}
      />
    </div>
  );
}
