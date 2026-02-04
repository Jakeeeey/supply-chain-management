// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/hooks/useCreatePurchaseOrder.ts
"use client";

import * as React from "react";
import type { Branch, BranchAllocation, CartItem, Product, Supplier } from "../types";
import { makePoMeta } from "../utils/format";

// --- Mock Data (keep here for now; later move to provider) ---
const MOCK_SUPPLIERS: Supplier[] = [
    { id: "sup-1", name: "Global Supplies Inc.", terms: "Net 30", apBalance: 125000 },
    { id: "sup-2", name: "ABC Trading Co.", terms: "COD", apBalance: 125000 },
    { id: "sup-3", name: "Premium Distributors Ltd.", terms: "Net 15", apBalance: 80250 },
    { id: "sup-4", name: "Northstar Wholesale", terms: "Net 30", apBalance: 5600 },
    { id: "sup-5", name: "Evergreen Merchants", terms: "Net 45", apBalance: 210000 },
    { id: "sup-6", name: "Metroline Trading", terms: "COD", apBalance: 0 },
    { id: "sup-7", name: "Summit Industrial Supply", terms: "Net 15", apBalance: 34890 },
    { id: "sup-8", name: "Blue Harbor Distribution", terms: "Net 30", apBalance: 99800 },
    { id: "sup-9", name: "Prime Office Essentials", terms: "Net 30", apBalance: 15600 },
    { id: "sup-10", name: "Vertex General Trading", terms: "COD", apBalance: 45200 },
];

const MOCK_BRANCHES: Branch[] = [
    { id: "br-1", name: "Main Warehouse - Downtown" },
    { id: "br-2", name: "Branch Office - Northside" },
    { id: "br-3", name: "Distribution Center - Eastside" },
    { id: "br-4", name: "Retail Store - Westside" },
];

const MOCK_PRODUCTS: Product[] = [
    { id: "prod-1", name: "Office Chair - Ergonomic", sku: "FURN-001", category: "Office Furniture", price: 150, uom: "piece", availableUoms: ["piece", "box", "pack"] },
    { id: "prod-2", name: "Desk Lamp - LED", sku: "LGT-002", category: "Office Furniture", price: 45, uom: "piece", availableUoms: ["piece", "box", "pack"] },
    { id: "prod-3", name: "Printer Paper - A4", sku: "PAP-005", category: "Office Accessories", price: 8, uom: "ream", availableUoms: ["ream", "box", "pack"] },
    { id: "prod-4", name: "Wireless Mouse", sku: "TECH-012", category: "Office Accessories", price: 25, uom: "piece", availableUoms: ["piece", "box", "pack"] },
    { id: "prod-5", name: "USB Flash Drive 32GB", sku: "TECH-045", category: "Office Accessories", price: 12, uom: "piece", availableUoms: ["piece", "box", "pack", "tie"] },
    { id: "prod-6", name: "Notebook A5", sku: "PAP-008", category: "Office Accessories", price: 3.5, uom: "piece", availableUoms: ["piece", "box", "pack", "tie"] },
    { id: "prod-11", name: "Executive Desk - L-Shaped", sku: "FURN-021", category: "Office Furniture", price: 450, uom: "piece", availableUoms: ["piece", "tie", "pack", "box"] },
    { id: "prod-12", name: "Office Table - Conference 8-Seater", sku: "FURN-044", category: "Office Furniture", price: 800, uom: "piece", availableUoms: ["piece"] },
    { id: "prod-13", name: "Filing Cabinet - 4 Drawer", sku: "FURN-055", category: "Office Furniture", price: 220, uom: "piece", availableUoms: ["piece"] },
    { id: "prod-14", name: "Bookshelf - 5 Tier", sku: "FURN-060", category: "Office Furniture", price: 180, uom: "piece", availableUoms: ["piece"] },
];

const TAX_RATE = 0.12;

export function useCreatePurchaseOrder() {
    const [{ poNumber, poDate }, setPoMeta] = React.useState(() => makePoMeta());

    const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
    const [selectedBranches, setSelectedBranches] = React.useState<BranchAllocation[]>([]);

    const [supplierQuery, setSupplierQuery] = React.useState("");
    const [branchQuery, setBranchQuery] = React.useState("");

    const [productPickerOpen, setProductPickerOpen] = React.useState(false);
    const [activeBranchId, setActiveBranchId] = React.useState<string | null>(null);

    const [tempCart, setTempCart] = React.useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedCategory, setSelectedCategory] = React.useState<string>("All Categories");

    React.useEffect(() => {
        // refresh meta on mount (safe)
        setPoMeta(makePoMeta());
    }, []);

    const categories = React.useMemo(() => {
        const set = new Set<string>(MOCK_PRODUCTS.map((p) => p.category));
        return ["All Categories", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, []);

    const filteredSuppliers = React.useMemo(() => {
        const q = supplierQuery.toLowerCase().trim();
        return MOCK_SUPPLIERS.filter((s) => s.name.toLowerCase().includes(q));
    }, [supplierQuery]);

    const filteredBranches = React.useMemo(() => {
        const q = branchQuery.toLowerCase().trim();
        return MOCK_BRANCHES.filter(
            (b) => b.name.toLowerCase().includes(q) && !selectedBranches.some((sb) => sb.branchId === b.id)
        );
    }, [branchQuery, selectedBranches]);

    const filteredProducts = React.useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return MOCK_PRODUCTS.filter((p) => {
            const matchesQuery =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q) ||
                p.id.toLowerCase().includes(q);

            const matchesCategory = selectedCategory === "All Categories" || p.category === selectedCategory;
            return matchesQuery && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    const activeBranch = React.useMemo(
        () => selectedBranches.find((b) => b.branchId === activeBranchId) || null,
        [selectedBranches, activeBranchId]
    );

    const canAddProducts = !!selectedSupplier;

    function addBranch(branch: Branch) {
        setSelectedBranches((prev) => {
            if (prev.some((b) => b.branchId === branch.id)) return prev;
            return [...prev, { branchId: branch.id, branchName: branch.name, items: [] }];
        });
        setBranchQuery("");
    }

    function removeBranch(branchId: string) {
        setSelectedBranches((prev) => prev.filter((b) => b.branchId !== branchId));
    }

    function openProductPicker(branchId: string) {
        setActiveBranchId(branchId);
        setTempCart([]);
        setSearchQuery("");
        setSelectedCategory("All Categories");
        setProductPickerOpen(true);
    }

    function closeProductPicker() {
        setProductPickerOpen(false);
        setActiveBranchId(null);
        setTempCart([]);
        setSearchQuery("");
        setSelectedCategory("All Categories");
    }

    function toggleProduct(product: Product) {
        setTempCart((prev) => {
            const exists = prev.find((p) => p.id === product.id);
            if (exists) return prev.filter((p) => p.id !== product.id);
            return [...prev, { ...product, orderQty: 1, selectedUom: product.uom }];
        });
    }

    function updateTempQty(productId: string, qty: number) {
        if (qty < 1) return;
        setTempCart((prev) => prev.map((i) => (i.id === productId ? { ...i, orderQty: qty } : i)));
    }

    function updateTempUom(productId: string, uom: string) {
        setTempCart((prev) => prev.map((i) => (i.id === productId ? { ...i, selectedUom: uom } : i)));
    }

    function confirmAddProducts() {
        if (!activeBranchId) return;

        setSelectedBranches((prev) =>
            prev.map((branch) => {
                if (branch.branchId !== activeBranchId) return branch;

                const updated = [...branch.items];
                for (const newItem of tempCart) {
                    const idx = updated.findIndex((x) => x.id === newItem.id);
                    if (idx >= 0) {
                        updated[idx] = {
                            ...updated[idx],
                            selectedUom: newItem.selectedUom,
                            orderQty: updated[idx].orderQty + newItem.orderQty,
                        };
                    } else {
                        updated.push(newItem);
                    }
                }
                return { ...branch, items: updated };
            })
        );

        closeProductPicker();
    }

    function updateItemQty(branchId: string, productId: string, qty: number) {
        if (qty < 1) return;
        setSelectedBranches((prev) =>
            prev.map((b) =>
                b.branchId === branchId
                    ? { ...b, items: b.items.map((it) => (it.id === productId ? { ...it, orderQty: qty } : it)) }
                    : b
            )
        );
    }

    function removeItem(branchId: string, productId: string) {
        setSelectedBranches((prev) =>
            prev.map((b) => (b.branchId === branchId ? { ...b, items: b.items.filter((it) => it.id !== productId) } : b))
        );
    }

    const subtotal = React.useMemo(() => {
        return selectedBranches.reduce(
            (acc, b) => acc + b.items.reduce((sum, it) => sum + it.price * it.orderQty, 0),
            0
        );
    }, [selectedBranches]);

    const discount = 0;
    const taxableBase = Math.max(0, subtotal - discount);
    const tax = taxableBase * TAX_RATE;
    const total = taxableBase + tax;

    const hasAnyItems = selectedBranches.some((b) => b.items.length > 0);

    const allItemsFlat = React.useMemo(() => {
        const items: Array<{ branchName: string; item: CartItem }> = [];
        selectedBranches.forEach((b) => b.items.forEach((it) => items.push({ branchName: b.branchName, item: it })));
        return items;
    }, [selectedBranches]);

    function savePO() {
        // TODO: move to provider later
        console.log("Saving PO:", {
            poNumber,
            poDate,
            supplier: selectedSupplier,
            branches: selectedBranches,
            subtotal,
            discount,
            tax,
            total,
        });
        alert("Purchase Order saved successfully!");
    }

    return {
        // data
        poNumber,
        poDate,
        selectedSupplier,
        selectedBranches,

        // queries
        supplierQuery,
        setSupplierQuery,
        branchQuery,
        setBranchQuery,

        // derived
        filteredSuppliers,
        filteredBranches,
        categories,
        filteredProducts,
        activeBranch,
        canAddProducts,

        // picker state
        productPickerOpen,
        openProductPicker,
        closeProductPicker,
        activeBranchId,
        tempCart,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,

        // actions
        setSelectedSupplier,
        addBranch,
        removeBranch,
        toggleProduct,
        updateTempQty,
        updateTempUom,
        confirmAddProducts,
        updateItemQty,
        removeItem,
        savePO,

        // summary
        subtotal,
        discount,
        tax,
        total,
        hasAnyItems,
        allItemsFlat,
    };
}
