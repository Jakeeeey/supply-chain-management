"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  Package,
  Filter,
  ScanBarcode,
  ChevronDown,
  Search,
  Box,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SalesReturnItem,
  Brand,
  Category,
  Supplier,
  Unit,
  Product,
  ProductSupplierConnection,
} from "../type";
import { SalesReturnProvider } from "../providers/fetchProviders";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: SalesReturnItem[]) => void;
  priceType: string; // 🟢 NEW
}

export function ProductLookupModal({
  isOpen,
  onClose,
  onConfirm,
  priceType = "A", // 🟢 NEW
}: Props) {
  // --- STATES ---
  const [searchCode, setSearchCode] = useState("");
  const [filterName, setFilterName] = useState("");

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("All");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("All");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("All");

  const [brandsList, setBrandsList] = useState<Brand[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [unitsList, setUnitsList] = useState<Unit[]>([]);
  const [supplierConnections, setSupplierConnections] = useState<
    ProductSupplierConnection[]
  >([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedItems, setSelectedItems] = useState<SalesReturnItem[]>([]);

  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  // DROPDOWN STATES
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("All Suppliers");
  const supplierWrapperRef = useRef<HTMLDivElement>(null);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("All Categories");
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("All Brands");
  const brandWrapperRef = useRef<HTMLDivElement>(null);

  // --- 1. FETCH ALL DATA ON MOUNT ---
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const [brands, cats, supps, units, connections, prods] =
            await Promise.all([
              SalesReturnProvider.getBrands(),
              SalesReturnProvider.getCategories(),
              SalesReturnProvider.getSuppliers(),
              SalesReturnProvider.getUnits(),
              SalesReturnProvider.getProductSupplierConnections(),
              SalesReturnProvider.getProducts(),
            ]);
          setBrandsList(Array.isArray(brands) ? brands : []);
          setCategoriesList(Array.isArray(cats) ? cats : []);
          setSuppliersList(Array.isArray(supps) ? supps : []);
          setUnitsList(Array.isArray(units) ? units : []);
          setSupplierConnections(Array.isArray(connections) ? connections : []);
          setProducts(Array.isArray(prods) ? prods : []);
        } catch (error) {
          console.error("Failed to load data", error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  // --- 2. CLICK OUTSIDE HANDLERS ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        supplierWrapperRef.current &&
        !supplierWrapperRef.current.contains(target)
      ) {
        setIsSupplierOpen(false);
      }
      if (
        categoryWrapperRef.current &&
        !categoryWrapperRef.current.contains(target)
      ) {
        setIsCategoryOpen(false);
      }
      if (
        brandWrapperRef.current &&
        !brandWrapperRef.current.contains(target)
      ) {
        setIsBrandOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 3. FILTERING LOGIC ---
  const allowedProductIds = useMemo(() => {
    if (selectedSupplierId === "All") return null;

    const validIds = new Set<number>();
    supplierConnections.forEach((conn) => {
      if (conn.supplier_id?.toString() === selectedSupplierId) {
        if (conn.product_id) validIds.add(Number(conn.product_id));
      }
    });
    return validIds;
  }, [selectedSupplierId, supplierConnections]);

  const filteredSuppliers = suppliersList.filter(
    (s) =>
      (s.supplier_name || "")
        .toLowerCase()
        .includes((supplierSearch || "").toLowerCase()) &&
      supplierSearch !== "All Suppliers",
  );

  const filteredCategories = categoriesList.filter(
    (c) =>
      (c.category_name || "").toLowerCase() !== "all" &&
      (c.category_name || "")
        .toLowerCase()
        .includes((categorySearch || "").toLowerCase()) &&
      categorySearch !== "All Categories",
  );

  const filteredBrands = brandsList.filter(
    (b) =>
      (b.brand_name || "")
        .toLowerCase()
        .includes((brandSearch || "").toLowerCase()) &&
      brandSearch !== "All Brands",
  );

  const visibleProducts = products.filter((p) => {
    const matchesSearch =
      (filterName === "" ||
        (p.product_name || "")
          .toLowerCase()
          .includes(filterName.toLowerCase())) &&
      (searchCode === "" ||
        (p.product_code || "").includes(searchCode) ||
        (p.barcode || "").includes(searchCode));

    const matchesBrand =
      selectedBrandId === "All" ||
      p.product_brand?.toString() === selectedBrandId;
    const matchesCategory =
      selectedCategoryId === "All" ||
      p.product_category?.toString() === selectedCategoryId;

    let matchesSupplier = true;
    if (allowedProductIds !== null) {
      matchesSupplier = p.product_id
        ? allowedProductIds.has(Number(p.product_id))
        : false;
    }

    return matchesSearch && matchesBrand && matchesCategory && matchesSupplier;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, searchCode, selectedSupplierId, selectedCategoryId, selectedBrandId]);

  // 1. Group ALL visible products strictly by parent_id or product_id first
  const allGroupedProducts = useMemo(() => {
    const groups: Record<string, { parent: Product; variants: Product[] }> = {};

    visibleProducts.forEach((product) => {
      // Robust grouping key derivation
      const rawParentId = product.parent_id;
      let finalParentIdNum: number | null = null;
      
      if (rawParentId && typeof rawParentId === "object") {
        finalParentIdNum = Number(rawParentId.product_id || rawParentId.id);
      } else if (rawParentId !== null && rawParentId !== undefined) {
        finalParentIdNum = Number(rawParentId);
      }

      const groupKey = (finalParentIdNum && finalParentIdNum > 0)
        ? finalParentIdNum.toString()
        : product.product_id.toString();

      if (!groups[groupKey]) {
        groups[groupKey] = {
          parent: product, 
          variants: [],
        };
      } else if (!finalParentIdNum || finalParentIdNum <= 0) {
        // If we found the actual base product (no parent), set it as the structural parent for display
        groups[groupKey].parent = product;
      }
      
      groups[groupKey].variants.push(product);
    });

    return Object.values(groups);
  }, [visibleProducts]);


  // 2. Paginate over the grouped cards instead of individual products
  const totalPages = Math.ceil(allGroupedProducts.length / ITEMS_PER_PAGE);
  const groupedProducts = allGroupedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );


  // --- HANDLERS ---

  /**
   * Resolves the correct unit price based on the selected priceType.
   */
  const resolvePrice = (product: Product, currentType: string): number => {
    const key = `price${currentType}` as keyof Product;
    const price = Number(product[key]) || Number(product.priceA) || 0;
    return price;
  };

  const handleAddItem = (
    product: Product,
    unitLabel: string,
    selectedPrice: number,
  ) => {
    setSelectedItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (item) => item.productId === product.product_id && item.unit === unitLabel && item.unitPrice === selectedPrice,
      );

      if (existingItemIndex !== -1) {
        const updatedItems = [...prevItems];
        const currentItem = updatedItems[existingItemIndex];
        const newQuantity = currentItem.quantity + 1;

        // Recalculate gross for existing item
        const newGross = newQuantity * currentItem.unitPrice;

        updatedItems[existingItemIndex] = {
          ...currentItem,
          quantity: newQuantity,
          grossAmount: newGross, // 🟢 Update Gross
          totalAmount: newGross - (currentItem.discountAmount || 0),
        };
        return updatedItems;
      } else {
        // 🟢 FIX: Added 'grossAmount' and 'discountType'
        const newItem: SalesReturnItem = {
          tempId: `added-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: product.product_id,
          product_id: product.product_id,
          code: product.product_code || product.barcode || "N/A",
          description: product.product_name,
          unit: unitLabel,
          quantity: 1,
          unitPrice: selectedPrice,
          grossAmount: selectedPrice, // 🟢 Added (1 * price)
          discountType: null, // 🟢 Added (default to null)
          discountAmount: 0,
          totalAmount: selectedPrice,
          returnType: "", // 🟢 Empty default as requested
          reason: "",
          // 🟢 Store additional price info for recalculation
          priceA: product.priceA,
          priceB: product.priceB,
          priceC: product.priceC,
          priceD: product.priceD,
          priceE: product.priceE,
          unitMultiplier: product.unit_of_measurement_count || 1,
        };
        return [...prevItems, newItem];
      }
    });
  };

  const updateItemQuantity = (tempId: string | undefined, change: number) => {
    if (!tempId) return;
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.tempId === tempId) {
          const newQty = item.quantity + change;
          if (newQty < 1) return item;
          return {
            ...item,
            quantity: newQty,
            grossAmount: newQty * item.unitPrice,
            totalAmount: newQty * item.unitPrice,
          };
        }
        return item;
      }),
    );
  };

  const setItemQuantityDirect = (tempId: string | undefined, qty: number) => {
    if (!tempId) return;
    const safeQty = Math.max(1, Math.floor(qty));
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.tempId === tempId) {
          return {
            ...item,
            quantity: safeQty,
            grossAmount: safeQty * item.unitPrice,
            totalAmount: safeQty * item.unitPrice,
          };
        }
        return item;
      }),
    );
  };

  const handleRemoveItem = (tempId: string | undefined) => {
    if (!tempId) return;
    setSelectedItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleConfirm = () => {
    onConfirm(selectedItems);
    onClose();
    setSelectedItems([]);
  };

  const resetFilters = () => {
    setSearchCode("");
    setFilterName("");
    setSelectedCategoryId("All");
    setSelectedBrandId("All");
    setSelectedSupplierId("All");
    setSupplierSearch("All Suppliers");
    setCategorySearch("All Categories");
    setBrandSearch("All Brands");
  };

  const totalCartPrice = selectedItems.reduce(
    (sum, item) => sum + item.totalAmount,
    0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col p-0 overflow-hidden bg-background border-0 shadow-2xl [&>button]:hidden",
          "h-[90vh] w-[95vw] max-w-[1400px]! z-200",
        )}
      >
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center px-6 py-4 bg-background border-b border-border z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-bold text-lg text-foreground">
                Product Lookup
              </DialogTitle>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Search and add products</p>
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                  {visibleProducts.length} variants found
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="bg-destructive hover:bg-destructive text-white p-2 rounded-md shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* --- CONTENT BODY --- */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL: FILTERS & GRID */}
          <div className="flex-1 flex flex-col bg-muted/50 min-w-0">
            {/* Filter Section */}
            <div className="p-5 bg-background border-b border-border shadow-sm z-10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Product Name (FIRST) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Product Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter by name..."
                      className="h-10 text-sm pl-9 bg-muted/30 border-border focus:bg-background transition-all text-foreground"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. Supplier (SECOND) */}
                <div className="space-y-1.5 relative" ref={supplierWrapperRef}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Supplier
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`h-10 w-full border rounded-md text-sm pl-3 pr-8 transition-all outline-none ${selectedSupplierId !== "All" ? "border-primary bg-background ring-1 ring-primary/20 text-foreground font-bold" : "border-border bg-muted/30 focus:border-primary focus:bg-background text-muted-foreground"}`}
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setIsSupplierOpen(true);
                      }}
                      onFocus={() => {
                        setIsSupplierOpen(true);
                        if (supplierSearch === "All Suppliers")
                          setSupplierSearch("");
                      }}
                      placeholder="Select Supplier"
                    />
                    <ChevronDown
                      className={`h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${selectedSupplierId !== "All" ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </div>
                  {isSupplierOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
                      <div
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 ${selectedSupplierId === "All" ? "text-primary font-medium bg-primary/10" : "text-foreground"}`}
                        onClick={() => {
                          setSelectedSupplierId("All");
                          setSupplierSearch("All Suppliers");
                          setIsSupplierOpen(false);
                        }}
                      >
                        All Suppliers
                      </div>
                      {filteredSuppliers.map((s) => {
                        const safeId = s.id?.toString() ?? "";
                        if (!safeId) return null;
                        return (
                          <div
                            key={safeId}
                            className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 ${selectedSupplierId === safeId ? "text-primary font-medium bg-primary/10" : "text-foreground"}`}
                            onClick={() => {
                              setSelectedSupplierId(safeId);
                              setSupplierSearch(s.supplier_name);
                              setIsSupplierOpen(false);
                            }}
                          >
                            {s.supplier_name}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Category */}
                <div className="space-y-1.5 relative" ref={categoryWrapperRef}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Category
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`h-10 w-full border rounded-md text-sm pl-3 pr-8 transition-all outline-none ${selectedCategoryId !== "All" ? "border-primary bg-background ring-1 ring-primary/20 text-foreground font-medium" : "border-border bg-muted/30 focus:border-primary focus:bg-background text-foreground"}`}
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        setIsCategoryOpen(true);
                      }}
                      onFocus={() => {
                        setIsCategoryOpen(true);
                        if (categorySearch === "All Categories")
                          setCategorySearch("");
                      }}
                      placeholder="Select Category"
                    />
                    <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {isCategoryOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
                      <div
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 ${selectedCategoryId === "All" ? "text-primary font-medium bg-primary/10" : "text-foreground"}`}
                        onClick={() => {
                          setSelectedCategoryId("All");
                          setCategorySearch("All Categories");
                          setIsCategoryOpen(false);
                        }}
                      >
                        All Categories
                      </div>
                      {filteredCategories.map((c) => (
                        <div
                          key={c.category_id}
                          className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 ${selectedCategoryId === c.category_id.toString() ? "text-primary font-medium bg-primary/10" : "text-foreground"}`}
                          onClick={() => {
                            setSelectedCategoryId(c.category_id.toString());
                            setCategorySearch(c.category_name);
                            setIsCategoryOpen(false);
                          }}
                        >
                          {c.category_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Brand */}
                <div className="space-y-1.5 relative" ref={brandWrapperRef}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Brand
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`h-10 w-full border rounded-md text-sm pl-3 pr-8 transition-all outline-none ${selectedBrandId !== "All" ? "border-primary bg-background ring-1 ring-primary/20 text-foreground font-medium" : "border-border bg-muted/30 focus:border-primary focus:bg-background text-foreground"}`}
                      value={brandSearch}
                      onChange={(e) => {
                        setBrandSearch(e.target.value);
                        setIsBrandOpen(true);
                      }}
                      onFocus={() => {
                        setIsBrandOpen(true);
                        if (brandSearch === "All Brands") setBrandSearch("");
                      }}
                      placeholder="Select Brand"
                    />
                    <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {isBrandOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
                      <div
                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 ${selectedBrandId === "All" ? "text-primary font-medium bg-primary/10" : "text-foreground"}`}
                        onClick={() => {
                          setSelectedBrandId("All");
                          setBrandSearch("All Brands");
                          setIsBrandOpen(false);
                        }}
                      >
                        All Brands
                      </div>
                      {filteredBrands.map((b) => (
                        <div
                          key={b.brand_id}
                          className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 ${selectedBrandId === b.brand_id.toString() ? "text-primary font-medium bg-primary/10" : "text-foreground"}`}
                          onClick={() => {
                            setSelectedBrandId(b.brand_id.toString());
                            setBrandSearch(b.brand_name);
                            setIsBrandOpen(false);
                          }}
                        >
                          {b.brand_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Scanner */}
              <div className="relative group">
                <div className="absolute inset-0 bg-linear-to-r from-blue-100 to-transparent opacity-0 group-focus-within:opacity-20 rounded-md transition-opacity pointer-events-none" />
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  autoFocus
                  placeholder="Scan or enter barcode / product code here..."
                  className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono text-sm shadow-sm transition-all"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable Grid */}
            <div className="flex-1 overflow-y-auto p-5 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-4">
                {isLoading && (
                  <>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-background rounded-lg border border-border shadow-sm p-5 animate-pulse flex flex-col gap-3"
                      >
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="mt-auto flex justify-between items-center pt-4">
                          <div>
                            <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                            <div className="h-3 bg-muted rounded w-16"></div>
                          </div>
                          <div className="h-8 bg-muted rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!isLoading &&
                  groupedProducts.map((group, index) => {
                    const parentData = group.parent;
                    const groupKey = parentData.parent_id ? `parent-${parentData.parent_id}` : `group-${index}`;

                    return (
                      <Card
                        key={groupKey}
                        className="flex flex-col overflow-hidden hover:shadow-md transition-all duration-200"
                      >
                        <CardHeader className="bg-muted/10 pb-3">
                          <CardTitle
                            className="text-sm font-bold leading-snug"
                            title={parentData.product_name}
                          >
                            {parentData.product_name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex flex-col flex-1 divide-y divide-border">
                          {group.variants.map((product) => {
                             const safePrice = resolvePrice(product, priceType);
                             
                             const unitObj = unitsList.find(
                               (u) => u.unit_id === product.unit_of_measurement,
                             );
                             const baseUnitName = unitObj ? unitObj.unit_name : "Piece";
                             const baseUnitShortcut = unitObj
                               ? unitObj.unit_shortcut
                               : "pcs";

                            return (
                               <div key={product.product_id} className="p-4 flex flex-col gap-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-muted-foreground font-mono">
                                        Code: <span className="text-foreground font-medium">{product.product_code || product.barcode || "N/A"}</span>
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="font-normal text-xs bg-background">
                                      {baseUnitName}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-auto">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-foreground text-sm">
                                        ₱
                                        {safePrice.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                        })}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                        (1 {baseUnitShortcut})
                                      </span>
                                    </div>
                                    <Button
                                      size="sm"
                                      className="h-8 shadow-sm shadow-primary/20"
                                      onClick={() =>
                                        handleAddItem(product, baseUnitShortcut.toUpperCase(), safePrice)
                                      }
                                    >
                                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                                    </Button>
                                  </div>
                               </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}

                {!isLoading && visibleProducts.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20">
                    <div className="bg-background p-6 rounded-full shadow-sm mb-4 border border-border">
                      <Filter className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      No products found
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {selectedSupplierId !== "All"
                        ? "This supplier has no products linked."
                        : "Try adjusting your search or filters"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={resetFilters}
                      className="mt-4 border-dashed"
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {!isLoading && totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 pb-2 border-t border-border mt-2">
                  <p className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, allGroupedProducts.length)} of {allGroupedProducts.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="h-8 px-3 text-xs"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-medium text-foreground">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="h-8 px-3 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: SELECTED SUMMARY (SIDEBAR) */}
          <div className="w-[380px] bg-background border-l border-border flex flex-col h-full shadow-2xl z-30">
            {/* Sidebar Header */}
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex justify-between items-end mb-1">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Selected Items
                </h3>
                {selectedItems.length > 0 && (
                  <button
                    onClick={() => setSelectedItems([])}
                    className="text-[10px] font-bold text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors uppercase tracking-wide"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {selectedItems.length} product
                {selectedItems.length !== 1 ? "s" : ""} added to list
              </p>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30/30">
              {selectedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
                  <div className="bg-muted p-4 rounded-full mb-3">
                    <Box className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Your selection is empty
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Scan a barcode or select products from the grid to begin.
                  </p>
                </div>
              ) : (
                <>
                  {selectedItems.map((item, idx) => (
                    <div
                      key={item.tempId || idx}
                      className="bg-background border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group"
                    >
                      <div className="flex justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.unit === "BOX" ? "bg-secondary text-secondary-foreground border-border" : "bg-primary/10 text-primary border-primary/20"}`}
                            >
                              {item.unit}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              {item.code}
                            </span>
                          </div>
                          <h4
                            className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-2"
                            title={item.description}
                          >
                            {item.description}
                          </h4>
                        </div>

                        {/* --- DELETE BUTTON --- */}
                        <button
                          onClick={() => handleRemoveItem(item.tempId)}
                          className="bg-destructive hover:bg-destructive text-white h-7 w-7 rounded-md flex items-center justify-center shadow-sm transition-all active:scale-95"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        {/* Qty Stepper */}
                        <div className="flex items-center bg-muted/30 rounded-md border border-border h-7">
                          <button
                            className="px-2 h-full text-muted-foreground hover:text-primary hover:bg-background rounded-l-md disabled:opacity-30 transition-colors"
                            onClick={() => updateItemQuantity(item.tempId, -1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val > 0) {
                                setItemQuantityDirect(item.tempId, val);
                              }
                            }}
                            className="w-10 text-center text-xs font-bold text-foreground bg-transparent border-0 outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            className="px-2 h-full text-muted-foreground hover:text-primary hover:bg-background rounded-r-md transition-colors"
                            onClick={() => updateItemQuantity(item.tempId, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Item Total */}
                        <div className="text-right">
                          <span className="block text-sm font-bold text-foreground">
                            ₱
                            {item.totalAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-5 border-t border-border bg-background z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Total Amount
                  </p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">
                    ₱
                    {totalCartPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <Button
                className="w-full h-12 text-base font-semibold shadow-primary/20 shadow-lg bg-primary hover:bg-primary transition-all active:scale-[0.98]"
                disabled={selectedItems.length === 0}
                onClick={handleConfirm}
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
