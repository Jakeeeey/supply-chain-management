import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Product, Supplier } from "../types";
import {
  getMasterlistProducts,
  getSuppliers,
  getMasterlistBundles,
} from "../providers/fetchProviders";

export function useBarcodeMasterlist() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsData, suppliersData, bundlesData] = await Promise.all([
        getMasterlistProducts(),
        getSuppliers(),
        getMasterlistBundles(),
      ]);

      // Client-side safety filter: reject empty/dash SKU or empty barcode
      const validProducts: Product[] = productsData
        .filter((p: Product) => {
          const hasSku =
            p.product_code &&
            p.product_code.trim() !== "" &&
            p.product_code !== "-";
          const hasBarcode = p.barcode && p.barcode.trim() !== "";
          return hasSku && hasBarcode;
        })
        .map((p) => ({ ...p, record_type: "product" as const }));

      // Normalize bundles to Product shape
      const validBundles: Product[] = bundlesData.map((b: any) => ({
        product_id: String(b.id),
        product_code: b.bundle_sku || "",
        product_name: b.bundle_name || "",
        description: b.bundle_name || "",
        barcode: b.barcode_value || null,
        barcode_date: b.barcode_date || null,
        product_category: b.bundle_type_id?.name || "Bundle",
        unit_of_measurement: null,
        product_per_supplier: [],
        barcode_type_id: b.barcode_type_id || null,
        weight: b.weight ? Number(b.weight) : null,
        weight_unit_id: b.weight_unit_id || null,
        cbm_length: b.cbm_length ? Number(b.cbm_length) : null,
        cbm_width: b.cbm_width ? Number(b.cbm_width) : null,
        cbm_height: b.cbm_height ? Number(b.cbm_height) : null,
        cbm_unit_id: b.cbm_unit_id || null,
        record_type: "bundle" as const,
      }));

      setAllProducts([...validProducts, ...validBundles]);
      setSuppliers(suppliersData);
    } catch (err: any) {
      console.error("Failed to fetch data", err);
      setError(err.message || "Failed to load masterlist data.");
      toast.error("Failed to load masterlist data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    error,
    refresh: fetchData,
  };
}
