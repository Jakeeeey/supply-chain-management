import * as React from "react";
import * as provider from "../../purchase-order-creation/providers/fetchProviders";
import type { Branch, CartItem, CartLineItem, Product, Supplier } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSupplier(raw: any): Supplier {
    return {
        id: String(raw?.id ?? ""),
        name: raw?.supplier_name ?? raw?.name ?? "—",
        terms: raw?.payment_terms ?? raw?.terms ?? null,
        apBalance: Number(raw?.apBalance ?? raw?.ap_balance ?? raw?.ap_balance_total ?? 0),
        raw,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBranch(raw: any): Branch {
    return {
        id: Number(raw?.id),
        name: raw?.branch_name ?? raw?.name ?? "Unknown",
        code: raw?.branch_code ?? raw?.code ?? "",
        raw,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCategory(raw: any): string {
    const c = raw?.product_category;
    if (typeof c === "string") return c;
    if (typeof c === "number") return String(c);
    if (c && typeof c === "object") {
        return c?.category_name ?? c?.name ?? c?.product_category_name ?? String(c?.id ?? "Uncategorized");
    }
    return raw?.category ?? raw?.category_name ?? "Uncategorized";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUom(raw: any): string {
    const u = raw?.unit_of_measurement;
    if (typeof u === "string") return u;
    if (typeof u === "number") return String(u);
    if (u && typeof u === "object") {
        return u?.uom_name ?? u?.name ?? u?.code ?? String(u?.id ?? "pc");
    }
    return raw?.uom ?? raw?.uom_name ?? "pc";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProduct(raw: any): Product {
    const id = String(raw?.product_id ?? raw?.id ?? "");
    const uom = extractUom(raw);
    const availableUoms =
        raw?.availableUoms ??
        raw?.available_uoms ??
        raw?.uoms ??
        raw?.unit_options ??
        [uom];

    return {
        id,
        name: raw?.product_name ?? raw?.name ?? "(No Name)",
        sku: raw?.product_code ?? raw?.sku ?? "",
        brand: raw?.brand ?? raw?.brand_name ?? "—",
        category: extractCategory(raw),
        price: Number(raw?.price_per_unit ?? raw?.price ?? 0),
        uom,
        availableUoms: Array.isArray(availableUoms) ? availableUoms.map(String) : [uom],
        raw,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapDirectusArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
}

export const useCreatePurchaseOrder = () => {
    const [isLoading, setIsLoading] = React.useState(true);

    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
    const [branches, setBranches] = React.useState<Branch[]>([]);
    const [allProducts, setAllProducts] = React.useState<Product[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [supplierLinks, setSupplierLinks] = React.useState<any[]>([]);

    const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>("");
    const [selectedBranchIds, setSelectedBranchIds] = React.useState<number[]>([]);
    const [cart, setCart] = React.useState<CartLineItem[]>([]);
    const [step, setStep] = React.useState(1);

    // 1) Initial load
    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [sRes, bRes, pRes] = await Promise.all([
                    provider.fetchSuppliers(),
                    provider.fetchBranches(),
                    provider.fetchProducts(),
                ]);

                const s = unwrapDirectusArray(sRes).map(normalizeSupplier);
                const b = unwrapDirectusArray(bRes).map(normalizeBranch);
                const p = unwrapDirectusArray(pRes).map(normalizeProduct);

                setSuppliers(s);
                setBranches(b);
                setAllProducts(p);
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // 2) Supplier links
    React.useEffect(() => {
        const run = async () => {
            if (!selectedSupplierId) {
                setSupplierLinks([]);
                return;
            }

            try {
                const res = await provider.fetchProductSupplierLinks(selectedSupplierId);
                const links = unwrapDirectusArray(res);
                setSupplierLinks(links);
            } catch (err) {
                console.error("Link fetch error:", err);
                setSupplierLinks([]);
            }
        };

        run();
    }, [selectedSupplierId]);

    // 3) Filter products by supplier links
    const availableProducts = React.useMemo((): Product[] => {
        if (!selectedSupplierId) return [];
        if (!supplierLinks?.length) return [];
        if (!allProducts?.length) return [];

        const allowedIds = new Set(
            supplierLinks
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((link: any) => {
                    const raw = link?.product_id;
                    if (raw && typeof raw === "object") return String(raw?.product_id ?? raw?.id ?? "");
                    return String(raw ?? "");
                })
                .filter(Boolean)
        );

        return allProducts.filter((p) => allowedIds.has(String(p.id)));
    }, [selectedSupplierId, supplierLinks, allProducts]);

    const selectedSupplier = React.useMemo(() => {
        if (!selectedSupplierId) return null;
        return suppliers.find((s) => String(s.id) === String(selectedSupplierId)) || null;
    }, [suppliers, selectedSupplierId]);

    // ===== CART HELPERS (branch-based) =====
    const setBranchCartItems = (branchId: number, items: CartItem[]) => {
        setCart((prev) => {
            const kept = prev.filter((x) => x.branchId !== branchId);
            const next: CartLineItem[] = items.map((i) => ({ ...i, branchId }));
            return [...kept, ...next];
        });
    };

    const removeBranchItems = (branchId: number) => {
        setCart((prev) => prev.filter((x) => x.branchId !== branchId));
    };

    const addToCart = (product: Product, branchId: number, qty: number) => {
        setCart((prev) => {
            const idx = prev.findIndex((x) => x.branchId === branchId && String(x.id) === String(product.id));

            if (qty <= 0) {
                if (idx === -1) return prev;
                return prev.filter((_, i) => i !== idx);
            }

            if (idx !== -1) {
                return prev.map((x, i) => (i === idx ? { ...x, orderQty: qty } : x));
            }

            const newItem: CartLineItem = {
                ...product,
                orderQty: qty,
                selectedUom: product.uom,
                branchId,
            };

            return [...prev, newItem];
        });
    };

    const removeFromCart = (productId: string, branchId: number) => {
        setCart((prev) => prev.filter((x) => !(x.branchId === branchId && String(x.id) === String(productId))));
    };

    const updateCartQty = (branchId: number, productId: string, qty: number) => {
        setCart((prev) => {
            const idx = prev.findIndex((x) => x.branchId === branchId && String(x.id) === String(productId));
            if (idx === -1) return prev;

            if (qty <= 0) return prev.filter((_, i) => i !== idx);

            return prev.map((x, i) => (i === idx ? { ...x, orderQty: qty } : x));
        });
    };

    const updateCartUom = (branchId: number, productId: string, uom: string) => {
        setCart((prev) =>
            prev.map((x) =>
                x.branchId === branchId && String(x.id) === String(productId)
                    ? { ...x, selectedUom: uom }
                    : x
            )
        );
    };

    const financials = React.useMemo(() => {
        const subtotal = cart.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.orderQty || 0), 0);
        const vatAmount = subtotal * 0.12;
        return {
            subtotal,
            discount: 0,
            vatAmount,
            total: subtotal + vatAmount,
        };
    }, [cart]);

    const handleSave = async () => {
        console.log("Saving PO data...", {
            supplierId: selectedSupplierId,
            items: cart.map((i) => ({
                id: i.id,
                qty: i.orderQty,
                uom: i.selectedUom,
                branch: i.branchId,
            })),
        });
    };

    return {
        step,
        setStep,
        isLoading,

        suppliers,
        branches,
        availableProducts,

        selectedSupplier,
        setSelectedSupplierId,

        selectedBranchIds,
        setSelectedBranchIds,

        cart,
        setBranchCartItems,
        removeBranchItems,

        addToCart,
        removeFromCart,
        updateCartQty,
        updateCartUom,

        financials,
        handleSave,
    };
};
