"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  Search,
  ScanBarcode,
  Filter,
  RotateCcw,
  ChevronDown, // Added Reset Icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

import { ProductTable } from "./components/ProductTable";
import { ScannerModal } from "./components/ScannerModal";
import {
  useBarcodeScanner,
  BarcodeFilterStatus,
} from "./hooks/useBarcodeScanner";

export default function BarCodeScannerModule() {
  const {
    products,
    allProducts,
    suppliers,
    isLoading,
    selectedProduct,
    setSelectedProduct,
    handleUpdateBarcode,
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

  const [pageInput, setPageInput] = useState(String(currentPage));
  useEffect(() => setPageInput(String(currentPage)), [currentPage]);

  const [openProductCombo, setOpenProductCombo] = useState(false);
  const [openSupplierCombo, setOpenSupplierCombo] = useState(false);

  // State to track typing inside the Product Combobox
  const [comboSearch, setComboSearch] = useState("");

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) setCurrentPage(page);
    else setPageInput(String(currentPage));
  };

  const getSelectedProductName = () => {
    if (productFilter === "all") return "All Products";
    const p = allProducts.find((p) => p.product_id === productFilter);
    if (!p) return "Unknown Product";
    return p.description || p.product_name;
  };

  const getSelectedSupplierName = () => {
    if (supplierFilter === "all") return "All Suppliers";
    const s = suppliers.find((s) => String(s.id) === supplierFilter);
    if (!s) return "Unknown Supplier";
    return s.supplier_name;
  };

  const getFilterLabel = () => {
    switch (barcodeFilter) {
      case "missing":
        return "Missing Barcodes";
      case "completed":
        return "With Barcodes";
      default:
        return "All Products";
    }
  };

  // NEW: Reset Handler
  const handleResetFilters = () => {
    setSearchQuery("");
    setSupplierFilter("all");
    setProductFilter("all");
    setBarcodeFilter("all");
    setComboSearch("");
    setCurrentPage(1);
  };

  // Efficiently filter products for the combobox
  const filteredComboProducts = useMemo(() => {
    if (!comboSearch) return allProducts.slice(0, 50);

    const lowerSearch = comboSearch.toLowerCase();
    return allProducts
      .filter((p) => {
        const name = (p.description || p.product_name || "").toLowerCase();
        const id = String(p.product_id);
        return name.includes(lowerSearch) || id.includes(lowerSearch);
      })
      .slice(0, 50);
  }, [allProducts, comboSearch]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Barcode Management
        </h1>
        <p className="text-muted-foreground">
          Scan or manually enter barcodes to assign them to existing products.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center justify-between bg-card border rounded-lg p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto flex-1">
          {/* Search */}
          <div className="flex flex-col gap-2 w-full sm:w-62.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Search
            </span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Desc, ID, or Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Supplier Filter */}
          <div className="flex flex-col gap-2 w-full sm:w-50">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Supplier
            </span>
            <Popover
              open={openSupplierCombo}
              onOpenChange={setOpenSupplierCombo}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSupplierCombo}
                  className="justify-between overflow-hidden"
                >
                  <span className="truncate">{getSelectedSupplierName()}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-75 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search supplier..." />
                  <CommandList>
                    <CommandEmpty>No supplier found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all_suppliers"
                        onSelect={() => {
                          setSupplierFilter("all");
                          setOpenSupplierCombo(false);
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
                          value={`${supplier.supplier_name} ${supplier.id}`}
                          onSelect={() => {
                            setSupplierFilter(String(supplier.id));
                            setOpenSupplierCombo(false);
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
                          <span className="truncate">
                            {supplier.supplier_name}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Product Select */}
          <div className="flex flex-col gap-2 w-full sm:w-87.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Product Select
            </span>
            <Popover open={openProductCombo} onOpenChange={setOpenProductCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProductCombo}
                  className="justify-between overflow-hidden"
                >
                  <span className="truncate">{getSelectedProductName()}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-100 p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search by description..."
                    value={comboSearch}
                    onValueChange={setComboSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all_products"
                        onSelect={() => {
                          setProductFilter("all");
                          setOpenProductCombo(false);
                          setComboSearch("");
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

                      {filteredComboProducts.map((product) => (
                        <CommandItem
                          key={product.product_id}
                          value={`${
                            product.description || product.product_name
                          } ${product.product_id}`}
                          onSelect={() => {
                            setProductFilter(product.product_id);
                            setOpenProductCombo(false);
                            setComboSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              productFilter === product.product_id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col w-full overflow-hidden">
                            <span className="truncate font-medium">
                              {product.description || product.product_name}
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

        {/* Right Side: Status Filter & Reset */}
        <div className="flex flex-col gap-2 w-full sm:w-auto min-w-50">
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            Status
          </span>
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-between min-w-40"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span>{getFilterLabel()}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup
                  value={barcodeFilter}
                  onValueChange={(v) =>
                    setBarcodeFilter(v as BarcodeFilterStatus)
                  }
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

            {/* NEW: Reset Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleResetFilters}
              title="Reset Filters"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-primary" />
            Product List
          </CardTitle>
          <CardDescription>
            Showing {products.length} of {totalItems} items based on current
            filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <ProductTable
              products={products}
              onEdit={(product) => setSelectedProduct(product)}
            />
          )}
        </CardContent>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <CardFooter className="flex justify-center sm:justify-end border-t pt-4 select-none">
            <Pagination>
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                <div className="flex items-center gap-2 mx-2">
                  <span className="text-sm text-muted-foreground">Page</span>
                  <Input
                    className="h-8 w-12 text-center px-1"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={handlePageInputSubmit}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handlePageInputSubmit()
                    }
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    of {totalPages}
                  </span>
                </div>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
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
