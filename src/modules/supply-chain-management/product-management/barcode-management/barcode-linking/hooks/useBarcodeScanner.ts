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
      const [productsRes, suppliersRes, btRes, wuRes, cuRes, bundlesRes] =
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
          fetch(
            "/api/scm/product-management/barcode-management/barcode-linking?scope=bundles",
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
      const eligibleProducts: Product[] = allProductsRaw
        .filter((p: Product) => {
          const hasSku =
            p.product_code &&
            p.product_code.trim() !== "" &&
            p.product_code !== "-";
          const hasBarcode = p.barcode && p.barcode.trim() !== "";
          return hasSku && !hasBarcode;
        })
        .map((p) => ({ ...p, record_type: "product" as const }));

      // Normalize bundles to Product shape
      let eligibleBundles: Product[] = [];
      if (bundlesRes.ok) {
        const bundlesData = await bundlesRes.json();
        eligibleBundles = (bundlesData.data || []).map((b: any) => ({
          product_id: String(b.id),
          product_code: b.bundle_sku || "",
          product_name: b.bundle_name || "",
          description: b.bundle_name || "",
          barcode: b.barcode_value || null,
          barcode_date: b.barcode_date || null,
          barcode_type_id: b.barcode_type_id || null,
          product_category: b.bundle_type_id?.name || "Bundle",
          unit_of_measurement: null,
          product_per_supplier: [],
          record_type: "bundle" as const,
        }));
      }

      setAllProducts([...eligibleProducts, ...eligibleBundles]);
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

  // ✅ FIXED: Correct URL and DTO Payload — now bundle-aware
  const handleUpdateBarcode = async (payload: UpdateBarcodeDTO) => {
    if (!selectedProduct) return;

    const isBundle = selectedProduct.record_type === "bundle";

    // Optimistic Update
    const updatedList = allProducts.filter(
      (p) => p.product_id !== selectedProduct.product_id,
    );
    setAllProducts(updatedList);

    try {
      // Build the correct URL with record_type for bundles
      const patchUrl = isBundle
        ? `/api/scm/product-management/barcode-management/barcode-linking?id=${selectedProduct.product_id}&record_type=bundle`
        : `/api/scm/product-management/barcode-management/barcode-linking?id=${selectedProduct.product_id}`;

      // For bundles, use barcode_value instead of barcode
      const patchBody = isBundle
        ? {
          barcode_value: payload.barcode,
          barcode_type_id: payload.barcode_type_id,
          barcode_date: payload.barcode_date,
          weight: payload.weight,
          weight_unit_id: payload.weight_unit_id,
          ...(payload.cbm_length !== undefined && {
            cbm_length: payload.cbm_length,
            cbm_width: payload.cbm_width,
            cbm_height: payload.cbm_height,
            cbm_unit_id: payload.cbm_unit_id,
          }),
        }
        : payload;

      const response = await fetch(patchUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });

      if (!response.ok) {
        const errData = await response.json();
        if (response.status === 409) {
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
