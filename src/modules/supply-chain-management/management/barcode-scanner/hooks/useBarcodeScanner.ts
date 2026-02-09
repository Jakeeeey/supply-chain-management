// src/modules/supply-chain-management/management/barcode-scanner/hooks/useBarcodeScanner.ts

import { useState, useEffect, useMemo } from "react";
import { Product } from "../types";
import { getProducts, updateProductBarcode } from "../providers/fetchProviders";
import { sortProductsByBarcodeStatus } from "../utils/sortUtils";
import { toast } from "sonner";

export type FilterStatus = "all" | "missing" | "completed";

export function useBarcodeScanner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const ITEMS_PER_PAGE = 15;

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // 1. Filter the raw data
  const filteredProducts = useMemo(() => {
    let result = products;

    if (filter === "missing") {
      result = products.filter((p) => !p.barcode);
    } else if (filter === "completed") {
      result = products.filter((p) => !!p.barcode);
    }

    // Always sort: missing barcodes first
    return sortProductsByBarcodeStatus(result);
  }, [products, filter]);

  // 2. Paginate the filtered data
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  // Reset to page 1 if filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleUpdateBarcode = async (barcode: string) => {
    if (!selectedProduct) return;

    try {
      await updateProductBarcode(selectedProduct.product_id, { barcode });
      toast.success(`Barcode updated for ${selectedProduct.product_name}`);

      // Optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === selectedProduct.product_id ? { ...p, barcode } : p,
        ),
      );
    } catch (error) {
      toast.error("Failed to update barcode");
      throw error;
    }
  };

  return {
    products: paginatedProducts, // Return only the current page slice
    totalItems: filteredProducts.length,
    totalPages,
    currentPage,
    setCurrentPage,
    filter,
    setFilter,
    isLoading,
    selectedProduct,
    setSelectedProduct,
    handleUpdateBarcode,
    refreshData,
  };
}
