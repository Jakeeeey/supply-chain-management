import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Product, Supplier, RefData, UpdateBarcodeDTO } from "../types";

export function useBarcodeScanner() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productsRes, suppliersRes, btRes, wuRes, cuRes] =
          await Promise.all([
            fetch("/api/scm/management/barcode-management/barcode-linking"),
            fetch(
              "/api/scm/management/barcode-management/barcode-linking?scope=suppliers",
            ),
            fetch(
              "/api/scm/management/barcode-management/barcode-linking?scope=barcode_type",
            ),
            fetch(
              "/api/scm/management/barcode-management/barcode-linking?scope=weight_unit",
            ),
            fetch(
              "/api/scm/management/barcode-management/barcode-linking?scope=cbm_unit",
            ),
          ]);

        if (!productsRes.ok || !suppliersRes.ok)
          throw new Error("Failed to fetch data");

        const productsData = await productsRes.json();
        const suppliersData = await suppliersRes.json();

        // STRICT FILTER: Must have SKU, Must NOT have Barcode
        const eligibleProducts = (productsData.data || []).filter(
          (p: Product) => {
            const hasSku =
              p.product_code &&
              p.product_code.trim() !== "" &&
              p.product_code !== "-";
            const hasBarcode = p.barcode && p.barcode.trim() !== "";
            return hasSku && !hasBarcode;
          },
        );

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
      } catch (error) {
        console.error("Fetch error", error);
        toast.error("Failed to load data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
        `/api/scm/management/barcode-management/barcode-linking?id=${selectedProduct.product_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Update failed");
      }

      toast.success(
        "Barcode & Logistics linked successfully! Moved to Masterlist.",
      );
      setSelectedProduct(null);
    } catch (error) {
      console.error("Update failed", error);
      toast.error("Failed to update barcode in database");
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
  };
}
