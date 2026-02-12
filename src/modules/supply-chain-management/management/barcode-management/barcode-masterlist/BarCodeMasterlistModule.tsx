"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
  Printer,
  RotateCcw,
  ChevronsUpDown,
  Check,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { useBarcodeMasterlist } from "./hooks/useBarcodeMasterlist";
import { MasterlistTable } from "./components/MasterlistTable";
import { BarcodeScannerSkeleton } from "./components/BarcodeScannerSkeleton";
import { PrintFormatModal, PrintPreviewModal } from "./components/PrintModal";
// ✅ NEW: Import Detail Modal
import { ProductDetailModal } from "./components/ProductDetailModal";
import { Product } from "./types";

export default function BarcodeMasterlistModule() {
  const {
    products,
    allProducts,
    suppliers,
    isLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    searchQuery,
    setSearchQuery,
    supplierFilter,
    setSupplierFilter,
  } = useBarcodeMasterlist();

  // Selection & Printing State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // UI States
  const [openSupplier, setOpenSupplier] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));

  // Print States
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<"simple" | "detailed">(
    "simple",
  );

  // ✅ NEW: Detail Modal State
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Handlers
  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds([]);
  };

  const handleToggleSelect = (product: Product) => {
    const id = String(product.product_id);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleToggleAll = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleInitiatePrint = () => {
    if (selectedIds.length === 0) return;
    setShowFormatModal(true);
  };

  const handleFormatSelected = (format: "simple" | "detailed") => {
    setPrintFormat(format);
    setShowFormatModal(false);
    setShowPreviewModal(true);
  };

  const selectedProductsData = allProducts.filter((p) =>
    selectedIds.includes(String(p.product_id)),
  );

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPageInput(val);
    const pageNum = parseInt(val);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  if (isLoading) return <BarcodeScannerSkeleton />;

  return (
    <div className="space-y-6 p-6 w-full bg-slate-50/50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Barcode Master List
        </h1>
        <p className="text-muted-foreground">
          View complete list of products with assigned barcodes.
        </p>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col xl:flex-row gap-6 items-end justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          {/* Search */}
          <div className="flex flex-col gap-2 w-full md:w-[280px]">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Product, SKU, or Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="flex flex-col gap-2 w-full md:w-[240px]">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Supplier
            </Label>
            <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSupplier}
                  className="h-10 w-full justify-between font-normal"
                >
                  {supplierFilter && supplierFilter !== "all"
                    ? suppliers.find((s) => String(s.id) === supplierFilter)
                        ?.supplier_name
                    : "All Suppliers"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput placeholder="Search supplier..." />
                  <CommandList>
                    <CommandEmpty>No supplier found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSupplierFilter("all");
                          setOpenSupplier(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            supplierFilter === "all"
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        All Suppliers
                      </CommandItem>
                      {suppliers.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.supplier_name}
                          onSelect={() => {
                            setSupplierFilter(String(s.id));
                            setOpenSupplier(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              supplierFilter === String(s.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {s.supplier_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-end gap-3 w-full xl:w-auto justify-end">
          <div className="flex flex-col gap-2">
            <div className="h-4 hidden md:block"></div>
            {isSelectionMode ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleToggleSelectionMode}
                  className="h-10 text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiatePrint}
                  disabled={selectedIds.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 h-10 shadow-sm"
                >
                  <Printer className="mr-2 h-4 w-4" /> Print (
                  {selectedIds.length})
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleToggleSelectionMode}
                className="gap-2 h-10"
              >
                <Printer className="h-4 w-4 text-muted-foreground" /> Select to
                Print
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="h-4 hidden md:block"></div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <MasterlistTable
        products={products}
        isSelectionMode={isSelectionMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleAll={handleToggleAll}
        // ✅ NEW: Handle Row Click
        onViewDetails={setViewProduct}
      />

      {/* PAGINATION */}
      <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t gap-4">
        <p className="text-sm text-muted-foreground order-2 md:order-1">
          Showing {products.length} of {totalItems} items.
        </p>
        <div className="flex items-center gap-2 order-1 md:order-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 mx-2">
            <span className="text-sm font-medium">Page</span>
            <Input
              className="h-8 w-12 text-center px-1"
              value={pageInput}
              onChange={handlePageInputChange}
            />
            <span className="text-sm text-muted-foreground">
              of {totalPages}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PRINT MODALS */}
      <PrintFormatModal
        open={showFormatModal}
        onClose={() => setShowFormatModal(false)}
        onSelectFormat={handleFormatSelected}
        count={selectedIds.length}
      />
      <PrintPreviewModal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        products={selectedProductsData}
        format={printFormat}
      />

      {/* ✅ NEW: Detail Modal Component */}
      <ProductDetailModal
        open={!!viewProduct}
        product={viewProduct}
        onClose={() => setViewProduct(null)}
      />
    </div>
  );
}
