import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Product,
  BarcodeType,
  WeightUnit,
  CbmUnit,
  RefData,
  UpdateBarcodeDTO,
} from "../types";
import {
  getMasterlistProducts,
  getMasterlistBundles,
} from "../providers/fetchProviders";

export function useBarcodeMasterlist() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Reference data
  const [barcodeTypes, setBarcodeTypes] = useState<RefData[]>([]);
  const [weightUnits, setWeightUnits] = useState<RefData[]>([]);
  const [cbmUnits, setCbmUnits] = useState<RefData[]>([]);
  const [timezone, setTimezone] = useState<string>("Asia/Manila");

  // All existing barcodes for duplicate checking
  const [allBarcodes, setAllBarcodes] = useState<
    { product_id: string; barcode: string; product_name: string }[]
  >([]);

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        productsData,
        bundlesData,
        btRes,
        wuRes,
        cuRes,
        tzRes,
      ] = await Promise.all([
        getMasterlistProducts(),
        getMasterlistBundles(),
        fetch("/api/scm/product-management/barcode-management/barcode-masterlist?scope=barcode_type"),
        fetch("/api/scm/product-management/barcode-management/barcode-masterlist?scope=weight_unit"),
        fetch("/api/scm/product-management/barcode-management/barcode-masterlist?scope=cbm_unit"),
        fetch("/api/scm/product-management/barcode-management/barcode-masterlist?scope=timezone"),
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
      interface BundleAPI {
        id: number;
        bundle_sku?: string;
        bundle_name?: string;
        barcode_value?: string | null;
        barcode_date?: string | null;
        bundle_type_id?: { name: string };
        barcode_type_id?: BarcodeType | null;
        weight?: number | string | null;
        weight_unit_id?: WeightUnit | null;
        cbm_length?: number | string | null;
        cbm_width?: number | string | null;
        cbm_height?: number | string | null;
        cbm_unit_id?: CbmUnit | null;
      }

      const validBundles: Product[] = (bundlesData as BundleAPI[]).map((b) => ({
        product_id: String(b.id),
        product_code: b.bundle_sku || "",
        product_name: b.bundle_name || "",
        description: b.bundle_name || "",
        barcode: b.barcode_value || null,
        barcode_date: b.barcode_date || null,
        product_category: b.bundle_type_id?.name || "Bundle",
        unit_of_measurement: null,
        product_per_supplier: [],
        barcode_type_id: b.barcode_type_id as BarcodeType | null,
        weight: b.weight ? Number(b.weight) : null,
        weight_unit_id: b.weight_unit_id as WeightUnit | null,
        cbm_length: b.cbm_length ? Number(b.cbm_length) : null,
        cbm_width: b.cbm_width ? Number(b.cbm_width) : null,
        cbm_height: b.cbm_height ? Number(b.cbm_height) : null,
        cbm_unit_id: b.cbm_unit_id as CbmUnit | null,
        record_type: "bundle" as const,
      }));

      const mergedProducts = [...validProducts, ...validBundles];
      setAllProducts(mergedProducts);

      // Populate existing barcodes list for duplicate checking
      const existingBarcodes = mergedProducts
        .filter((p) => p.barcode && p.barcode.trim() !== "")
        .map((p) => ({
          product_id: String(p.product_id),
          barcode: p.barcode!,
          product_name: p.product_name || p.description || "Unknown",
        }));
      setAllBarcodes(existingBarcodes);

      // Parse ref data
      if (btRes.ok) {
        const btJson = await btRes.json();
        setBarcodeTypes(Array.isArray(btJson.data) ? btJson.data : []);
      }
      if (wuRes.ok) {
        const wuJson = await wuRes.json();
        setWeightUnits(Array.isArray(wuJson.data) ? wuJson.data : []);
      }
      if (cuRes.ok) {
        const cuJson = await cuRes.json();
        setCbmUnits(Array.isArray(cuJson.data) ? cuJson.data : []);
      }
      if (tzRes.ok) {
        const tzJson = await tzRes.json();
        if (tzJson.data) setTimezone(tzJson.data);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch data", err);
      const message = err instanceof Error ? err.message : "Failed to load masterlist data.";
      setError(message);
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

      const matchesRecordType =
        recordTypeFilter === "all" || product.record_type === recordTypeFilter;

      return matchesSearch && matchesRecordType;
    });
  }, [allProducts, searchQuery, recordTypeFilter]);

  // --- PAGINATION ---
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const products = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, recordTypeFilter]);

  // --- UPDATE BARCODE HANDLER ---
  const handleUpdateBarcode = async (
    targetProduct: Product,
    payload: UpdateBarcodeDTO,
  ) => {
    const isBundle = targetProduct.record_type === "bundle";
    const patchUrl = isBundle
      ? `/api/scm/product-management/barcode-management/barcode-masterlist?id=${targetProduct.product_id}&record_type=bundle`
      : `/api/scm/product-management/barcode-management/barcode-masterlist?id=${targetProduct.product_id}`;

    const patchBody = isBundle
      ? {
          barcode_value: payload.barcode,
          barcode_type_id: payload.barcode_type_id,
          barcode_date: payload.barcode_date,
          weight: payload.weight,
          weight_unit_id: payload.weight_unit_id,
          cbm_length: payload.cbm_length ?? null,
          cbm_width: payload.cbm_width ?? null,
          cbm_height: payload.cbm_height ?? null,
          cbm_unit_id: payload.cbm_unit_id ?? null,
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
        return;
      }
      throw new Error(errData.error || "Failed to update barcode");
    }

    // Optimistically update product in local state
    const rawBt = barcodeTypes.find((bt) => bt.id === payload.barcode_type_id);
    const matchedBarcodeType: BarcodeType | null = rawBt
      ? { id: rawBt.id, name: rawBt.name }
      : null;

    const rawWu = weightUnits.find((wu) => wu.id === payload.weight_unit_id);
    const matchedWeightUnit: WeightUnit | null = rawWu
      ? { id: rawWu.id, code: rawWu.code || "", name: rawWu.name }
      : null;

    const rawCu = payload.cbm_unit_id
      ? cbmUnits.find((cu) => cu.id === payload.cbm_unit_id)
      : undefined;
    const matchedCbmUnit: CbmUnit | null = rawCu
      ? { id: rawCu.id, code: rawCu.code || "", name: rawCu.name }
      : null;

    setAllProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === targetProduct.product_id) {
          return {
            ...p,
            barcode: payload.barcode,
            barcode_type_id: matchedBarcodeType,
            barcode_date: payload.barcode_date,
            weight: payload.weight !== undefined ? payload.weight : p.weight,
            weight_unit_id: matchedWeightUnit || p.weight_unit_id,
            cbm_length: payload.cbm_length !== undefined ? payload.cbm_length : null,
            cbm_width: payload.cbm_width !== undefined ? payload.cbm_width : null,
            cbm_height: payload.cbm_height !== undefined ? payload.cbm_height : null,
            cbm_unit_id: matchedCbmUnit,
          };
        }
        return p;
      }),
    );

    // Update allBarcodes list
    setAllBarcodes((prev) => [
      ...prev.filter((b) => b.product_id !== String(targetProduct.product_id)),
      {
        product_id: String(targetProduct.product_id),
        barcode: payload.barcode,
        product_name: targetProduct.product_name || targetProduct.description || "Unknown",
      },
    ]);

    toast.success("Barcode & logistics updated successfully!");
  };

  return {
    products,
    allProducts,
    isLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    searchQuery,
    setSearchQuery,
    recordTypeFilter,
    setRecordTypeFilter,
    barcodeTypes,
    weightUnits,
    cbmUnits,
    allBarcodes,
    timezone,
    handleUpdateBarcode,
    error,
    refresh: fetchData,
  };
}
