import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Product, Supplier } from "../types";

export type BarcodeFilterStatus = "all" | "missing" | "completed";

export function useBarcodeScanner() {
  // Data State
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [barcodeFilter, setBarcodeFilter] =
    useState<BarcodeFilterStatus>("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selection State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Products and Suppliers in parallel
        // We use the Next.js API route you created at /api/scm/management/barcode-scanner
        const [productsRes, suppliersRes] = await Promise.all([
          fetch("/api/scm/management/barcode-scanner"),
          fetch("/api/scm/management/barcode-scanner?scope=suppliers"),
        ]);

        if (!productsRes.ok) throw new Error("Failed to fetch products");
        if (!suppliersRes.ok) throw new Error("Failed to fetch suppliers");

        const productsData = await productsRes.json();
        const suppliersData = await suppliersRes.json();

        // Extract arrays from the response wrapper { data: [...] }
        // The API route you provided returns { data: mergedData }
        const rawProducts: Product[] = productsData.data || [];
        const rawSuppliers: Supplier[] = suppliersData.data || [];

        // --- FILTERING RULE: SKU CODE ELIGIBILITY ---
        // Only allow products that have a valid product_code.
        // It must exist, not be an empty string, and not be a placeholder dash "-".
        const eligibleProducts = rawProducts.filter((p) => {
          return (
            p.product_code &&
            p.product_code.trim() !== "" &&
            p.product_code !== "-"
          );
        });

        setAllProducts(eligibleProducts);
        setSuppliers(rawSuppliers);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error("Failed to load data. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- COMPUTED: FILTERING ---
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // 1. Search Query
      const searchLower = searchQuery.toLowerCase();

      // Safety check: ensure fields exist before checking
      const matchesSearch =
        !searchQuery ||
        (product.description || "").toLowerCase().includes(searchLower) ||
        (product.product_name || "").toLowerCase().includes(searchLower) ||
        (product.product_code || "").toLowerCase().includes(searchLower) ||
        String(product.product_id).includes(searchLower) ||
        (product.barcode || "").includes(searchLower);

      // 2. Supplier Filter
      const matchesSupplier =
        supplierFilter === "all" ||
        (product.product_per_supplier &&
          Array.isArray(product.product_per_supplier) &&
          product.product_per_supplier.some(
            (junction) =>
              junction.supplier_id &&
              typeof junction.supplier_id === "object" &&
              String(junction.supplier_id.id) === supplierFilter,
          ));

      // 3. Product Dropdown Filter
      const matchesProduct =
        productFilter === "all" || String(product.product_id) === productFilter;

      // 4. Barcode Status Filter
      const matchesStatus =
        barcodeFilter === "all" ||
        (barcodeFilter === "missing" && !product.barcode) ||
        (barcodeFilter === "completed" && !!product.barcode);

      return (
        matchesSearch && matchesSupplier && matchesProduct && matchesStatus
      );
    });
  }, [allProducts, searchQuery, supplierFilter, productFilter, barcodeFilter]);

  // --- COMPUTED: PAGINATION ---
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const products = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, supplierFilter, productFilter, barcodeFilter]);

  // --- HANDLERS ---
  const handleUpdateBarcode = async (barcode: string) => {
    if (!selectedProduct) return;

    // 1. Optimistic Update (Update UI immediately)
    const originalList = [...allProducts];
    const updatedList = allProducts.map((p) =>
      p.product_id === selectedProduct.product_id ? { ...p, barcode } : p,
    );
    setAllProducts(updatedList);

    try {
      // 2. API Call to PATCH
      // We use the same API route but with query param ID for context
      const response = await fetch(
        `/api/scm/management/barcode-scanner?id=${selectedProduct.product_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ barcode }),
        },
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update");
      }

      toast.success("Barcode updated successfully");
    } catch (error) {
      console.error("Update failed", error);
      toast.error("Failed to update barcode in database");

      // 3. Revert Optimistic Update on Error
      setAllProducts(originalList);
    }
  };

  return {
    products, // The current page of items
    allProducts, // The full list (for global checks/search)
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
  };
}
