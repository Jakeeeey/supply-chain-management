import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Product, Supplier, RefData, UpdateBarcodeDTO } from "../types";

export function useBarcodeScanner() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Reference data (cached at hook level — fetched once on mount)
  const [barcodeTypes, setBarcodeTypes] = useState<RefData[]>([]);
  const [weightUnits, setWeightUnits] = useState<RefData[]>([]);
  const [cbmUnits, setCbmUnits] = useState<RefData[]>([]);

  // All existing barcodes for duplicate checking (includes linked products)
  const [allBarcodes, setAllBarcodes] = useState<
    { product_id: string; barcode: string; product_name: string }[]
  >([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, suppliersRes, btRes, wuRes, cuRes] =
        await Promise.all([
          fetch(
            "/api/scm/product-management/barcode-management/barcode-linking",
          ),
          fetch(
            "/api/scm/product-management/barcode-management/barcode-linking?scope=suppliers",
          ),
          fetch(
            "/api/scm/product-management/barcode-management/barcode-linking?scope=barcode_type",
          ),
          fetch(
            "/api/scm/product-management/barcode-management/barcode-linking?scope=weight_unit",
          ),
          fetch(
            "/api/scm/product-management/barcode-management/barcode-linking?scope=cbm_unit",
          ),
        ]);

      if (!productsRes.ok || !suppliersRes.ok)
        throw new Error("Failed to fetch data");

      const productsData = await productsRes.json();
      const suppliersData = await suppliersRes.json();

      const allProductsRaw: Product[] = productsData.data || [];

      // Extract ALL existing barcodes for duplicate checking
      const existingBarcodes = allProductsRaw
        .filter((p: Product) => p.barcode && p.barcode.trim() !== "")
        .map((p: Product) => ({
          product_id: String(p.product_id),
          barcode: p.barcode!,
          product_name: p.product_name || p.description || "Unknown",
        }));
      setAllBarcodes(existingBarcodes);

      // STRICT FILTER: Must have SKU, Must NOT have Barcode
      const eligibleProducts = allProductsRaw.filter((p: Product) => {
        const hasSku =
          p.product_code &&
          p.product_code.trim() !== "" &&
          p.product_code !== "-";
        const hasBarcode = p.barcode && p.barcode.trim() !== "";
        return hasSku && !hasBarcode;
      });

      setAllProducts(eligibleProducts);
      setSuppliers(suppliersData.data || []);

      // Parse reference data
      if (btRes.ok) {
        const data = await btRes.json();
        setBarcodeTypes(Array.isArray(data.data) ? data.data : []);
      }
      if (wuRes.ok) {
        const data = await wuRes.json();
        setWeightUnits(Array.isArray(data.data) ? data.data : []);
      }
      if (cuRes.ok) {
        const data = await cuRes.json();
        setCbmUnits(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err: any) {
      console.error("Fetch error", err);
      setError(err.message || "Failed to load barcode linking data.");
      toast.error("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        (product.description || "").toLowerCase().includes(searchLower) ||
        (product.product_name || "").toLowerCase().includes(searchLower) ||
        (product.product_code || "").toLowerCase().includes(searchLower);

      const matchesSupplier =
        supplierFilter === "all" ||
        product.product_per_supplier?.some(
          (j) =>
            typeof j.supplier_id === "object" &&
            String(j.supplier_id.id) === supplierFilter,
        );

      const matchesProduct =
        productFilter === "all" || String(product.product_id) === productFilter;

      return matchesSearch && matchesSupplier && matchesProduct;
    });
  }, [allProducts, searchQuery, supplierFilter, productFilter]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const products = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, supplierFilter, productFilter]);

  // ✅ FIXED: Correct URL and DTO Payload
  const handleUpdateBarcode = async (payload: UpdateBarcodeDTO) => {
    if (!selectedProduct) return;

    // Optimistic Update
    const updatedList = allProducts.filter(
      (p) => p.product_id !== selectedProduct.product_id,
    );
    setAllProducts(updatedList);

    try {
      // FIX: Use the correct barcode-linking path or correct ID query
      const response = await fetch(
        `/api/scm/product-management/barcode-management/barcode-linking?id=${selectedProduct.product_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errData = await response.json();
        if (response.status === 409) {
          // Server-side duplicate detected
          toast.error("Duplicate Barcode!", {
            description: errData.error || "This barcode is already in use.",
          });
          setAllProducts((prev) => [...prev, selectedProduct]);
          return;
        }
        throw new Error(errData.error || "Update failed");
      }

      // Add the new barcode to the local duplicate-check list
      setAllBarcodes((prev) => [
        ...prev,
        {
          product_id: String(selectedProduct.product_id),
          barcode: payload.barcode,
          product_name: selectedProduct.product_name || "Unknown",
        },
      ]);

      toast.success(
        "Barcode & Logistics linked successfully! Moved to Masterlist.",
      );
      setSelectedProduct(null);
    } catch (error: any) {
      console.error("Update failed", error);
      toast.error("Failed to update barcode", {
        description: error.message || "Please try again.",
      });
      setAllProducts((prev) => [...prev, selectedProduct]);
    }
  };

  return {
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
    barcodeTypes,
    weightUnits,
    cbmUnits,
    allBarcodes,
    error,
    refresh: fetchData,
  };
}
