import * as React from "react";
import * as provider from "../providers/purchaseOrderProvider";

export const useCreatePurchaseOrder = () => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [suppliers, setSuppliers] = React.useState<any[]>([]);
    const [branches, setBranches] = React.useState<any[]>([]);
    const [supplierLinks, setSupplierLinks] = React.useState<any[]>([]);
    const [availableProducts, setAvailableProducts] = React.useState<any[]>([]);

    const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>("");
    const [selectedBranchIds, setSelectedBranchIds] = React.useState<number[]>([]);
    const [cart, setCart] = React.useState<any[]>([]);
    const [step, setStep] = React.useState(1);

    // Load suppliers + branches only
    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [s, b] = await Promise.all([
                    provider.fetchSuppliers(),
                    provider.fetchBranches(),
                ]);

                setSuppliers(Array.isArray(s) ? s : []);
                setBranches(Array.isArray(b) ? b : []);
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // ✅ On supplier change: fetch links then fetch products by those product_ids
    React.useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (!selectedSupplierId) {
                setSupplierLinks([]);
                setAvailableProducts([]);
                return;
            }

            try {
                const links = await provider.fetchProductSupplierLinks(selectedSupplierId);
                if (cancelled) return;

                const linksArr = Array.isArray(links) ? links : [];
                setSupplierLinks(linksArr);

                const ids = linksArr
                    .map((l: any) => l?.product_id)
                    .filter((v: any) => v !== null && v !== undefined);

                const prods = await provider.fetchProductsByIds(ids);
                if (cancelled) return;

                setAvailableProducts(Array.isArray(prods) ? prods : []);
            } catch (e) {
                console.error("Supplier products load error:", e);
                if (!cancelled) {
                    setSupplierLinks([]);
                    setAvailableProducts([]);
                }
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [selectedSupplierId]);

    const selectedSupplier = React.useMemo(
        () => suppliers.find((s) => String(s.id) === String(selectedSupplierId)) || null,
        [suppliers, selectedSupplierId]
    );

    const addToCart = (product: any, branchId: number, qty: number) => {
        const prodId = product.product_id ?? product.id ?? product.productId;

        setCart((prev) => {
            const existing = prev.find(
                (item) =>
                    String(item.product_id ?? item.id ?? item.productId) === String(prodId) &&
                    item.branchId === branchId
            );

            if (qty <= 0) {
                return existing ? prev.filter((i) => i !== existing) : prev;
            }

            if (existing) {
                return prev.map((item) =>
                    String(item.product_id ?? item.id ?? item.productId) === String(prodId) &&
                    item.branchId === branchId
                        ? { ...item, orderQty: qty }
                        : item
                );
            }

            return [...prev, { ...product, branchId, orderQty: qty }];
        });
    };

    const removeFromCart = (productId: any, branchId: number) => {
        setCart((prev) =>
            prev.filter(
                (item) =>
                    !(
                        String(item.product_id ?? item.id ?? item.productId) === String(productId) &&
                        item.branchId === branchId
                    )
            )
        );
    };

    const financials = React.useMemo(() => {
        const subtotal = cart.reduce(
            (acc, item) => acc + Number(item.price_per_unit ?? 0) * (item.orderQty || 0),
            0
        );
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
                id: i.product_id ?? i.id ?? i.productId,
                qty: i.orderQty,
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
        addToCart,
        removeFromCart,
        financials,
        handleSave,
    };
};
