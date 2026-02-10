import { useState, useEffect, useMemo } from "react";
import { Product, Supplier } from "../types";
import {
  getProducts,
  getSuppliers,
  updateProductBarcode,
} from "../providers/fetchProviders";
import { sortProductsByBarcodeStatus } from "../utils/sortUtils";
import { toast } from "sonner";

export type BarcodeFilterStatus = "all" | "missing" | "completed";

export function useBarcodeScanner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // FILTERS STATE
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [barcodeFilter, setBarcodeFilter] =
    useState<BarcodeFilterStatus>("all");

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [productsData, suppliersData] = await Promise.all([
        getProducts(),
        getSuppliers(),
      ]);
      setProducts(productsData);
      setSuppliers(suppliersData);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- FILTERING LOGIC ---
  const filteredProducts = useMemo(() => {
    let result = products;

    // 1. Strict Search (Description, Name, ID, or Barcode)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const descMatch = (p.description || "").toLowerCase().includes(q);
        const nameMatch = (p.product_name || "").toLowerCase().includes(q);
        const barcodeMatch = (p.barcode || "").toLowerCase().includes(q);
        const idMatch = String(p.product_id).toLowerCase().includes(q);

        return descMatch || nameMatch || barcodeMatch || idMatch;
      });
    }

    // 2. Strict Supplier Filter
    if (supplierFilter !== "all") {
      result = result.filter((p) => {
        const linkedSuppliers = p.product_per_supplier || [];

        // We need to check if ANY of the junction rows match the selected Supplier ID
        return linkedSuppliers.some((junction) => {
          // Case A: supplier_id is an Object (Expanded)
          if (
            typeof junction.supplier_id === "object" &&
            junction.supplier_id !== null
          ) {
            return (
              String((junction.supplier_id as Supplier).id) === supplierFilter
            );
          }
          // Case B: supplier_id is just an ID (Not Expanded - rare if API is fixed)
          return String(junction.supplier_id) === supplierFilter;
        });
      });
    }

    // 3. Strict Product Selection Filter (Matches ID)
    if (productFilter !== "all") {
      result = result.filter((p) => p.product_id === productFilter);
    }

    // 4. Strict Barcode Status Filter
    if (barcodeFilter === "missing") {
      result = result.filter((p) => !p.barcode);
    } else if (barcodeFilter === "completed") {
      result = result.filter((p) => !!p.barcode);
    }

    return sortProductsByBarcodeStatus(result);
  }, [products, searchQuery, supplierFilter, productFilter, barcodeFilter]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, supplierFilter, productFilter, barcodeFilter]);

  const handleUpdateBarcode = async (barcode: string) => {
    if (!selectedProduct) return;
    const duplicateProduct = products.find(
      (p) =>
        p.barcode === barcode && p.product_id !== selectedProduct.product_id,
    );

    if (duplicateProduct) {
      toast.error(
        `Barcode conflict! Used by: "${duplicateProduct.description || duplicateProduct.product_name}"`,
      );
      throw new Error("Duplicate Barcode Detected");
    }

    try {
      await updateProductBarcode(selectedProduct.product_id, { barcode });
      // Use description for toast if available
      const displayName =
        selectedProduct.description || selectedProduct.product_name;
      toast.success(`Barcode updated for ${displayName}`);

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
    products: paginatedProducts,
    allProducts: products,
    suppliers,
    totalItems: filteredProducts.length,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,
    selectedProduct,
    setSelectedProduct,
    handleUpdateBarcode,
    searchQuery,
    setSearchQuery,
    supplierFilter,
    setSupplierFilter,
    productFilter,
    setProductFilter,
    barcodeFilter,
    setBarcodeFilter,
  };
}
