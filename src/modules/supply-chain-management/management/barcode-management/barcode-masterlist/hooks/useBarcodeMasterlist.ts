import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Product, Supplier } from "../types";
import {
  getMasterlistProducts,
  getSuppliers,
} from "../providers/fetchProviders";

export function useBarcodeMasterlist() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsData, suppliersData] = await Promise.all([
          getMasterlistProducts(),
          getSuppliers(),
        ]);

        // Client-side safety filter: reject empty/dash SKU or empty barcode
        const validProducts = productsData.filter((p: Product) => {
          const hasSku =
            p.product_code &&
            p.product_code.trim() !== "" &&
            p.product_code !== "-";
          const hasBarcode = p.barcode && p.barcode.trim() !== "";
          return hasSku && hasBarcode;
        });

        setAllProducts(validProducts);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error("Failed to load masterlist data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- FILTERING ---
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 1. Search Query
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (product.description || "").toLowerCase().includes(searchLower) ||
        (product.product_name || "").toLowerCase().includes(searchLower) ||
        (product.product_code || "").toLowerCase().includes(searchLower) ||
        (product.barcode || "").includes(searchLower);

      // 2. Supplier Filter
      const matchesSupplier =
        supplierFilter === "all" ||
        (product.product_per_supplier &&
          product.product_per_supplier.some(
            (junction) =>
              typeof junction.supplier_id === "object" &&
              String(junction.supplier_id.id) === supplierFilter,
          ));

      return matchesSearch && matchesSupplier;
    });
  }, [allProducts, searchQuery, supplierFilter]);

  // --- PAGINATION ---
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const products = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, supplierFilter]);

  return {
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
  };
}
