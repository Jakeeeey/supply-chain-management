"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search,
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
const ScannerModal = React.lazy(() =>
  import("./components/ScannerModal").then((m) => ({ default: m.ScannerModal }))
);
import { BarcodeScannerSkeleton } from "./components/BarcodeScannerSkeleton";
import ErrorPage from "@/components/shared/ErrorPage";

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
    recordTypeFilter,
    setRecordTypeFilter,
    barcodeTypes,
    weightUnits,
    cbmUnits,
    allBarcodes,
    error,
    refresh,
  } = useBarcodeScanner();

  // UI States for Comboboxes
  const [openSupplier, setOpenSupplier] = useState(false);
  const [openProduct, setOpenProduct] = useState(false);

  // Local state for page input
  const [pageInput, setPageInput] = useState(String(currentPage));

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // --- HANDLERS ---
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPageInput(val);
    const pageNum = parseInt(val);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  if (isLoading) return <BarcodeScannerSkeleton />;

  if (error) {
    return (
      <ErrorPage
        code="Connection Error"
        title="Barcode Linking Unreachable"
        message={error}
        reset={refresh}
      />
    );
  }

  return (
    <div className="space-y-6 p-6 w-full bg-muted/30 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Barcode Linking
        </h1>
        <p className="text-muted-foreground">
          Link barcodes to existing SKU products.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="bg-card p-4 rounded-lg border shadow-sm flex flex-col xl:flex-row gap-6 items-end justify-between">
        {/* LEFT SIDE: FILTERS */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          {/* SEARCH */}
          <div className="flex flex-col gap-2 w-full md:w-[280px]">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Product Name, SKU, or ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
                  <span className="truncate">
                    {supplierFilter && supplierFilter !== "all"
                      ? suppliers.find((s) => String(s.id) === supplierFilter)
                        ?.supplier_name
                      : "All Suppliers"}
                  </span>
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

          {/* PRODUCT COMBOBOX */}
          <div className="flex flex-col gap-2 w-full md:w-[350px]">
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
                  {/* Added truncate class to handle long product names */}
                  <span className="truncate">
                    {productFilter && productFilter !== "all"
                      ? allProducts.find(
                        (p) => String(p.product_id) === productFilter,
                      )?.product_name || "Unknown"
                      : "All Products"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0">
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
                      {allProducts.map((product) => (
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

          {/* INVENTORY TYPE FILTER */}
          <div className="flex flex-col gap-2 w-full md:w-[150px]">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Inventory Type
            </Label>
            <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="product">Regular</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* RIGHT SIDE: REFRESH BUTTON */}
        <div className="flex items-end gap-3 w-full xl:w-auto justify-end">
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
        isSelectionMode={false} // Selection disabled
        selectedIds={[]}
        onToggleSelect={() => { }}
        onToggleAll={() => { }}
      />

      {/* PAGINATION */}
      {!isLoading && (
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
      )}

      {/* SCANNER MODAL (Lazy-loaded) */}
      <Suspense fallback={null}>
        <ScannerModal
          open={!!selectedProduct}
          product={selectedProduct}
          allProducts={allProducts}
          allBarcodes={allBarcodes}
          barcodeTypes={barcodeTypes}
          weightUnits={weightUnits}
          cbmUnits={cbmUnits}
          onClose={() => setSelectedProduct(null)}
          onSave={handleUpdateBarcode}
        />
      </Suspense>
    </div>
  );
}
