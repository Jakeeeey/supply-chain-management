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

import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { ProductTable } from "./components/ProductTable";
import { ScannerModal } from "./components/ScannerModal";
import { PrintFormatModal, PrintPreviewModal } from "./components/PrintModal";
import { BarcodeScannerSkeleton } from "./components/BarcodeScannerSkeleton";
import { Product } from "./types";

export default function BarCodeScannerModule() {
  const {
    products,
    allProducts,
    suppliers,
    selectedProduct,
    setSelectedProduct,
    handleUpdateBarcode,
    isLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    searchQuery,
    setSearchQuery,
    supplierFilter,
    setSupplierFilter,
    productFilter,
    setProductFilter,
    barcodeFilter,
    setBarcodeFilter,
  } = useBarcodeScanner();

  // --- PRINTING & SELECTION STATE ---
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // UI States for Comboboxes
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openProduct, setOpenProduct] = useState(false);

  // Local state for page input to allow typing
  const [pageInput, setPageInput] = useState(String(currentPage));

  // Sync page input when currentPage changes externally (e.g. arrows)
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Print Modal States
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<"simple" | "detailed">(
    "simple",
  );

  // --- HANDLERS ---
  const handleToggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedIds([]);
    } else {
      setIsSelectionMode(true);
    }
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

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPageInput(val); // Allow typing freely

    // Only update actual page if it's a valid number
    const pageNum = parseInt(val);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  const handlePageInputBlur = () => {
    // Reset input to valid current page on blur if invalid
    setPageInput(String(currentPage));
  };

  const selectedProductsData = allProducts.filter((p) =>
    selectedIds.includes(String(p.product_id)),
  );

  // --- 1. SKELETON LOADING STATE ---
  if (isLoading) {
    return <BarcodeScannerSkeleton />;
  }

  return (
    <div className="space-y-6 p-6 w-full bg-slate-50/50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Barcode Master List
        </h1>
        <p className="text-muted-foreground">
          Manage product barcodes, scan new items, and print labels.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col xl:flex-row gap-6 items-end justify-between">
        {/* LEFT SIDE: SEARCH & FILTERS */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          {/* SEARCH */}
          <div className="flex flex-col gap-2 w-full md:w-[280px]">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Desc, ID, or Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* SUPPLIER COMBOBOX */}
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
                      {suppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.id}
                          value={supplier.supplier_name}
                          onSelect={() => {
                            setSupplierFilter(String(supplier.id));
                            setOpenSupplier(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              supplierFilter === String(supplier.id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {supplier.supplier_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* PRODUCT COMBOBOX */}
          <div className="flex flex-col gap-2 w-full md:w-[240px]">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Product Select
            </Label>
            <Popover open={openProduct} onOpenChange={setOpenProduct}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProduct}
                  className="h-10 w-full justify-between font-normal"
                >
                  {productFilter && productFilter !== "all"
                    ? allProducts.find(
                        (p) => String(p.product_id) === productFilter,
                      )?.product_name || "Unknown"
                    : "All Products"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput placeholder="Search product..." />
                  <CommandList>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setProductFilter("all");
                          setOpenProduct(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            productFilter === "all"
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        All Products
                      </CommandItem>
                      {allProducts.slice(0, 50).map((product) => (
                        <CommandItem
                          key={product.product_id}
                          value={product.product_name || ""}
                          onSelect={() => {
                            setProductFilter(String(product.product_id));
                            setOpenProduct(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              productFilter === String(product.product_id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{product.product_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {product.product_code}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* RIGHT SIDE: ACTIONS */}
        <div className="flex items-end gap-3 w-full xl:w-auto justify-end">
          {/* PRINT BUTTON */}
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
                  <Printer className="mr-2 h-4 w-4" />
                  Print ({selectedIds.length})
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleToggleSelectionMode}
                className="gap-2 h-10"
              >
                <Printer className="h-4 w-4 text-muted-foreground" />
                Select to Print
              </Button>
            )}
          </div>

          {/* STATUS FILTER */}
          <div className="flex flex-col gap-2 w-[160px]">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Status
            </Label>
            <Select
              value={barcodeFilter}
              onValueChange={(v: any) => setBarcodeFilter(v)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="missing">Missing Barcode</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* REFRESH BUTTON */}
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
      <ProductTable
        products={products}
        onEdit={setSelectedProduct}
        isSelectionMode={isSelectionMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleAll={handleToggleAll}
      />

      {/* PAGINATION - REVISED */}
      {!isLoading && (
        <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t gap-4">
          <p className="text-sm text-muted-foreground order-2 md:order-1">
            Showing {products.length} of {totalItems} items.
          </p>

          <div className="flex items-center gap-2 order-1 md:order-2">
            {/* Start */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Previous */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Manual Page Input */}
            <div className="flex items-center gap-2 mx-2">
              <span className="text-sm font-medium">Page</span>
              <Input
                className="h-8 w-12 text-center px-1"
                value={pageInput}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
              />
              <span className="text-sm text-muted-foreground">
                of {totalPages}
              </span>
            </div>

            {/* Next */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* End */}
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
      )}

      {/* MODALS */}
      <ScannerModal
        open={!!selectedProduct}
        product={selectedProduct}
        allProducts={allProducts}
        onClose={() => setSelectedProduct(null)}
        onSave={handleUpdateBarcode}
      />

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
    </div>
  );
}
