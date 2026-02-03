"use client";

import * as React from "react";
import {
    Building2,
    Package,
    Trash2,
    Plus,
    X,
    Check,
    Store,
    FileText,
    Search,
    ChevronDown,
    Minus,
    ShoppingCart,
} from "lucide-react";

// --- Types ---
type Product = {
    id: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    uom: string;
    availableUoms?: string[]; // Available unit of measurement options
};

type CartItem = Product & {
    orderQty: number;
    selectedUom: string;
};

type BranchAllocation = {
    branchId: string;
    branchName: string;
    items: CartItem[];
};

// --- Mock Data ---
const MOCK_SUPPLIERS = [
    { id: "sup-1", name: "Global Supplies Inc.", terms: "Net 30" },
    { id: "sup-2", name: "ABC Trading Co.", terms: "COD" },
    { id: "sup-3", name: "Premium Distributors Ltd.", terms: "Net 15" },
];

const MOCK_BRANCHES = [
    { id: "br-1", name: "Main Warehouse - Downtown" },
    { id: "br-2", name: "Branch Office - Northside" },
    { id: "br-3", name: "Distribution Center - Eastside" },
    { id: "br-4", name: "Retail Store - Westside" },
];

const MOCK_PRODUCTS: Product[] = [
    { id: "prod-1", name: "Office Chair - Ergonomic", sku: "FURN-001", category: "Office Furniture", price: 150, uom: "piece", availableUoms: ["piece", "box", "pack"] },
    { id: "prod-2", name: "Desk Lamp - LED", sku: "LGT-002", category: "Office Furniture", price: 45, uom: "piece", availableUoms: ["piece", "box", "pack"] },
    { id: "prod-3", name: "Printer Paper - A4", sku: "PAP-005", category: "Stationery", price: 8, uom: "ream", availableUoms: ["ream", "box", "pack"] },
    { id: "prod-4", name: "Wireless Mouse", sku: "TECH-012", category: "Electronics", price: 25, uom: "piece", availableUoms: ["piece", "box", "pack"] },
    { id: "prod-5", name: "USB Flash Drive 32GB", sku: "TECH-045", category: "Electronics", price: 12, uom: "piece", availableUoms: ["piece", "box", "pack", "tie"] },
    { id: "prod-6", name: "Notebook A5", sku: "PAP-008", category: "Stationery", price: 3.5, uom: "piece", availableUoms: ["piece", "box", "pack", "tie"] },
];

export default function PurchaseOrderModule() {
    const [selectedSupplier, setSelectedSupplier] = React.useState<typeof MOCK_SUPPLIERS[0] | null>(null);
    const [selectedBranches, setSelectedBranches] = React.useState<BranchAllocation[]>([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [activeBranchId, setActiveBranchId] = React.useState<string | null>(null);
    const [tempCart, setTempCart] = React.useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [supplierSearch, setSupplierSearch] = React.useState("");
    const [branchSearch, setBranchSearch] = React.useState("");
    const [showSupplierDropdown, setShowSupplierDropdown] = React.useState(false);
    const [showBranchDropdown, setShowBranchDropdown] = React.useState(false);
    const [poNumber, setPoNumber] = React.useState("");

    // Generate PO Number on mount to avoid hydration mismatch
    React.useEffect(() => {
        const timestamp = Date.now();
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        setPoNumber(`PO-${dateStr}-${timestamp}`);
    }, []);

    // Close dropdowns when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-dropdown-trigger]')) {
                setShowSupplierDropdown(false);
                setShowBranchDropdown(false);
            }
        };

        if (showSupplierDropdown || showBranchDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showSupplierDropdown, showBranchDropdown]);

    // Tax rate (10%)
    const TAX_RATE = 0.10;

    // Filter suppliers
    const filteredSuppliers = MOCK_SUPPLIERS.filter(s =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    // Filter branches
    const filteredBranches = MOCK_BRANCHES.filter(b =>
        b.name.toLowerCase().includes(branchSearch.toLowerCase()) &&
        !selectedBranches.find(sb => sb.branchId === b.id)
    );

    // Filter products for modal
    const filteredProducts = MOCK_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddBranch = (branch: typeof MOCK_BRANCHES[0]) => {
        if (!selectedBranches.find(sb => sb.branchId === branch.id)) {
            setSelectedBranches([
                ...selectedBranches,
                { branchId: branch.id, branchName: branch.name, items: [] }
            ]);
        }
        setBranchSearch("");
        setShowBranchDropdown(false);
    };

    const handleRemoveBranch = (branchId: string) => {
        setSelectedBranches(prev => prev.filter(b => b.branchId !== branchId));
    };

    const handleOpenProductModal = (branchId: string) => {
        setActiveBranchId(branchId);
        setIsModalOpen(true);
        setTempCart([]);
        setSearchQuery("");
    };

    const handleToggleProduct = (product: Product) => {
        const exists = tempCart.find(item => item.id === product.id);
        if (exists) {
            setTempCart(prev => prev.filter(item => item.id !== product.id));
        } else {
            setTempCart(prev => [...prev, { ...product, orderQty: 1, selectedUom: product.uom }]);
        }
    };

    const handleUpdateTempQty = (productId: string, qty: number) => {
        if (qty < 1) return;
        setTempCart(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, orderQty: qty } : item
            )
        );
    };

    const handleUpdateTempUom = (productId: string, uom: string) => {
        setTempCart(prev =>
            prev.map(item =>
                item.id === productId ? { ...item, selectedUom: uom } : item
            )
        );
    };

    const confirmAddProducts = () => {
        if (!activeBranchId) return;

        setSelectedBranches(prev =>
            prev.map(branch => {
                if (branch.branchId === activeBranchId) {
                    // Merge products: update quantity if exists, otherwise add new
                    const updatedItems = [...branch.items];

                    tempCart.forEach(newItem => {
                        const existingIndex = updatedItems.findIndex(item => item.id === newItem.id);
                        if (existingIndex >= 0) {
                            // Update quantity
                            updatedItems[existingIndex] = {
                                ...updatedItems[existingIndex],
                                orderQty: updatedItems[existingIndex].orderQty + newItem.orderQty
                            };
                        } else {
                            // Add new item
                            updatedItems.push(newItem);
                        }
                    });

                    return { ...branch, items: updatedItems };
                }
                return branch;
            })
        );

        setIsModalOpen(false);
        setTempCart([]);
        setActiveBranchId(null);
    };

    const handleUpdateItemQty = (branchId: string, productId: string, newQty: number) => {
        if (newQty < 1) return;

        setSelectedBranches(prev =>
            prev.map(branch =>
                branch.branchId === branchId
                    ? {
                        ...branch,
                        items: branch.items.map(item =>
                            item.id === productId ? { ...item, orderQty: newQty } : item
                        )
                    }
                    : branch
            )
        );
    };

    const handleRemoveItem = (branchId: string, productId: string) => {
        setSelectedBranches(prev =>
            prev.map(branch =>
                branch.branchId === branchId
                    ? {
                        ...branch,
                        items: branch.items.filter(item => item.id !== productId)
                    }
                    : branch
            )
        );
    };

    // Calculate totals
    const subtotal = selectedBranches.reduce(
        (acc, branch) =>
            acc + branch.items.reduce((sum, item) => sum + item.price * item.orderQty, 0),
        0
    );
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;

    const handleSavePO = () => {
        // TODO: Implement save logic
        console.log("Saving PO:", {
            poNumber,
            supplier: selectedSupplier,
            branches: selectedBranches,
            subtotal,
            tax,
            total,
        });
        alert("Purchase Order saved successfully!");
    };

    return (
        <div className="space-y-6">
            {/* PO NUMBER CARD */}
            <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="space-y-1">
                    <p className="text-sm text-zinc-500">
                        Select a branch first, then add products to that branch
                    </p>
                </div>
                <div className="bg-blue-600/10 border border-blue-500/20 px-6 py-3 rounded-xl flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                            PO Number
                        </p>
                        <p className="text-lg font-mono font-bold text-blue-300">
                            {poNumber || "Generating..."}
                        </p>
                    </div>
                </div>
            </div>

            {/* MAIN FORM CARD */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* SUPPLIER SELECTION */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">
                            Supplier <span className="text-red-500">*</span>
                        </label>
                        <div className="relative" data-dropdown-trigger>
                            <input
                                type="text"
                                placeholder="Search and select supplier..."
                                value={selectedSupplier?.name || supplierSearch}
                                onChange={(e) => {
                                    setSupplierSearch(e.target.value);
                                    setShowSupplierDropdown(true);
                                    if (selectedSupplier) setSelectedSupplier(null);
                                }}
                                onFocus={() => setShowSupplierDropdown(true)}
                                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />

                            {showSupplierDropdown && !selectedSupplier && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                                    {filteredSuppliers.length > 0 ? (
                                        filteredSuppliers.map(supplier => (
                                            <button
                                                key={supplier.id}
                                                onClick={() => {
                                                    setSelectedSupplier(supplier);
                                                    setSupplierSearch("");
                                                    setShowSupplierDropdown(false);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                                            >
                                                <p className="text-sm font-medium text-zinc-900">{supplier.name}</p>
                                                <p className="text-xs text-zinc-500">Terms: {supplier.terms}</p>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-zinc-500">No suppliers found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DELIVERY BRANCHES */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700">
                            Delivery Branches <span className="text-red-500">*</span>
                            <span className="text-xs text-zinc-500 font-normal ml-2">
                                (Add a branch, then add products to it)
                            </span>
                        </label>
                        <div className="relative" data-dropdown-trigger>
                            <input
                                type="text"
                                placeholder="Search and add branch..."
                                value={branchSearch}
                                onChange={(e) => {
                                    setBranchSearch(e.target.value);
                                    setShowBranchDropdown(true);
                                }}
                                onFocus={() => setShowBranchDropdown(true)}
                                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />

                            {showBranchDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                                    {filteredBranches.length > 0 ? (
                                        filteredBranches.map(branch => (
                                            <button
                                                key={branch.id}
                                                onClick={() => handleAddBranch(branch)}
                                                className="w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-zinc-400" />
                                                    <span className="text-sm font-medium text-zinc-900">{branch.name}</span>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-zinc-500">
                                            {selectedBranches.length === MOCK_BRANCHES.length
                                                ? "All branches added"
                                                : "No branches found"}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BRANCHES LIST */}
                    <div className="space-y-4 pt-4">
                        {selectedBranches.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 bg-zinc-50">
                                <Store className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium text-zinc-600">Add a branch to get started</p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Products will be organized by delivery branch
                                </p>
                            </div>
                        ) : (
                            selectedBranches.map((branch) => (
                                <div
                                    key={branch.branchId}
                                    className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden"
                                >
                                    {/* Branch Header */}
                                    <div className="px-5 py-3 border-b border-zinc-200 bg-white flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-semibold text-zinc-900">
                                                {branch.branchName}
                                            </span>
                                            <span className="text-xs text-zinc-500">
                                                ({branch.items.length} {branch.items.length === 1 ? 'item' : 'items'})
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveBranch(branch.branchId)}
                                            className="text-zinc-400 hover:text-red-600 transition-colors"
                                            title="Remove branch"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Branch Content */}
                                    <div className="p-5">
                                        {branch.items.length === 0 ? (
                                            <button
                                                onClick={() => handleOpenProductModal(branch.branchId)}
                                                className="w-full py-4 border-2 border-dashed border-zinc-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-zinc-500 hover:text-blue-600 transition-all text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Products for this branch
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* Products Table */}
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead className="text-xs text-zinc-600 uppercase font-semibold border-b border-zinc-200">
                                                        <tr>
                                                            <th className="pb-3 text-left">Item</th>
                                                            <th className="pb-3 text-left">SKU</th>
                                                            <th className="pb-3 text-right">Unit Price</th>
                                                            <th className="pb-3 text-center">UOM</th>
                                                            <th className="pb-3 text-center">Qty</th>
                                                            <th className="pb-3 text-right">Line Total</th>
                                                            <th className="pb-3 text-right">Actions</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody className="text-zinc-700 divide-y divide-zinc-200">
                                                        {branch.items.map((item) => (
                                                            <tr key={item.id} className="hover:bg-white transition-colors">
                                                                <td className="py-3 font-medium text-zinc-900">
                                                                    {item.name}
                                                                </td>
                                                                <td className="py-3 font-mono text-xs text-zinc-500">
                                                                    {item.sku}
                                                                </td>
                                                                <td className="py-3 text-right">
                                                                    ${item.price.toFixed(2)}
                                                                </td>
                                                                <td className="py-3 text-center">
                                                                        <span className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-medium rounded">
                                                                            {item.selectedUom || item.uom}
                                                                        </span>
                                                                </td>
                                                                <td className="py-3">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() =>
                                                                                handleUpdateItemQty(
                                                                                    branch.branchId,
                                                                                    item.id,
                                                                                    item.orderQty - 1
                                                                                )
                                                                            }
                                                                            className="w-6 h-6 flex items-center justify-center rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-700 transition-colors"
                                                                            disabled={item.orderQty <= 1}
                                                                        >
                                                                            <Minus className="w-3 h-3" />
                                                                        </button>
                                                                        <input
                                                                            type="number"
                                                                            value={item.orderQty}
                                                                            onChange={(e) => {
                                                                                const val = parseInt(e.target.value) || 1;
                                                                                handleUpdateItemQty(branch.branchId, item.id, val);
                                                                            }}
                                                                            className="w-16 px-2 py-1 text-center border border-zinc-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                                                                            min="1"
                                                                        />
                                                                        <button
                                                                            onClick={() =>
                                                                                handleUpdateItemQty(
                                                                                    branch.branchId,
                                                                                    item.id,
                                                                                    item.orderQty + 1
                                                                                )
                                                                            }
                                                                            className="w-6 h-6 flex items-center justify-center rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-700 transition-colors"
                                                                        >
                                                                            <Plus className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 text-right font-semibold text-blue-600">
                                                                    ${(item.price * item.orderQty).toFixed(2)}
                                                                </td>
                                                                <td className="py-3 text-right">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleRemoveItem(branch.branchId, item.id)
                                                                        }
                                                                        className="text-zinc-400 hover:text-red-600 transition-colors"
                                                                        title="Remove item"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Add More Products Button */}
                                                <button
                                                    onClick={() => handleOpenProductModal(branch.branchId)}
                                                    className="w-full py-2 border border-zinc-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-zinc-600 hover:text-blue-600 transition-all text-xs font-semibold flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Add More Products
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ORDER SUMMARY & SAVE */}
            {selectedBranches.length > 0 && selectedBranches.some(b => b.items.length > 0) && (
                <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        {/* Summary */}
                        <div className="space-y-2 flex-1">
                            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Order Summary</h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-zinc-600">Subtotal:</span>
                                    <span className="font-medium text-zinc-900">
                                        ${subtotal.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-600">Tax (10%):</span>
                                    <span className="font-medium text-zinc-900">
                                        ${tax.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-zinc-200">
                                    <span className="font-semibold text-zinc-900">Total:</span>
                                    <span className="font-bold text-lg text-blue-600">
                                        ${total.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSavePO}
                            disabled={!selectedSupplier}
                            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                        >
                            Save Purchase Order
                        </button>
                    </div>
                </div>
            )}

            {/* PRODUCT SELECTION MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-7xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-zinc-200 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-zinc-900">Select Products</h3>
                                <p className="text-sm text-zinc-500 mt-1">
                                    Choose products to add to{" "}
                                    {selectedBranches.find(b => b.branchId === activeBranchId)?.branchName}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setTempCart([]);
                                }}
                                className="text-zinc-400 hover:text-zinc-900 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Main Content Area - Two Columns */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* LEFT: Product Selection */}
                            <div className="flex-1 flex flex-col border-r border-zinc-200">
                                {/* Search Bar */}
                                <div className="p-6 border-b border-zinc-200">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, SKU, or category..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Products Grid */}
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredProducts.map((product) => {
                                            const isSelected = tempCart.find(item => item.id === product.id);

                                            return (
                                                <div
                                                    key={product.id}
                                                    onClick={() => handleToggleProduct(product)}
                                                    className={`p-3 border-2 rounded-lg transition-all cursor-pointer ${
                                                        isSelected
                                                            ? "border-blue-500 bg-blue-50"
                                                            : "border-zinc-200 hover:border-zinc-300 bg-white"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <Package
                                                                className={`w-6 h-6 mb-2 transition-colors ${
                                                                    isSelected ? "text-blue-600" : "text-zinc-400"
                                                                }`}
                                                            />
                                                            <p className="text-sm font-semibold text-zinc-900 mb-1 line-clamp-2">
                                                                {product.name}
                                                            </p>
                                                            <p className="text-xs font-mono text-zinc-500 mb-1">
                                                                {product.sku}
                                                            </p>
                                                            <p className="text-xs text-zinc-600 mb-2">
                                                                {product.category}
                                                            </p>
                                                            <p className="text-base font-bold text-blue-600">
                                                                ${product.price.toFixed(2)}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="bg-blue-600 rounded-full p-1 flex-shrink-0">
                                                                <Check className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {filteredProducts.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                                            <Package className="w-12 h-12 mb-3 opacity-30" />
                                            <p className="text-sm font-medium">No products found</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT: Selected Products Panel */}
                            <div className="w-96 flex flex-col bg-zinc-50">
                                <div className="p-4 border-b border-zinc-200 bg-white">
                                    <h4 className="text-sm font-bold text-zinc-900">
                                        Selected Products ({tempCart.length})
                                    </h4>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {tempCart.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                                            <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                                            <p className="text-xs text-center">No products selected</p>
                                        </div>
                                    ) : (
                                        tempCart.map((item) => (
                                            <div key={item.id} className="bg-white border border-zinc-200 rounded-lg p-3 relative">
                                                {/* Remove button */}
                                                <button
                                                    onClick={() => handleToggleProduct(item)}
                                                    className="absolute top-2 right-2 text-zinc-400 hover:text-red-600 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>

                                                <p className="text-sm font-semibold text-zinc-900 mb-1 pr-6">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-zinc-500 mb-1">ID: {item.sku}</p>
                                                <p className="text-xs text-zinc-600 mb-3">
                                                    Price: ${item.price.toFixed(2)}
                                                </p>

                                                {/* Unit of Measurement */}
                                                <div className="mb-3">
                                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                                        Unit of Measurement
                                                    </label>
                                                    <select
                                                        value={item.selectedUom}
                                                        onChange={(e) => handleUpdateTempUom(item.id, e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                    >
                                                        {(item.availableUoms || [item.uom]).map(uom => (
                                                            <option key={uom} value={uom}>
                                                                {uom}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Quantity */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                                        Quantity
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleUpdateTempQty(item.id, item.orderQty - 1)}
                                                            disabled={item.orderQty <= 1}
                                                            className="w-8 h-8 flex items-center justify-center rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={item.orderQty}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 1;
                                                                handleUpdateTempQty(item.id, val);
                                                            }}
                                                            className="flex-1 px-3 py-2 text-center text-sm border border-zinc-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                                                            min="1"
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateTempQty(item.id, item.orderQty + 1)}
                                                            className="w-8 h-8 flex items-center justify-center rounded border border-zinc-300 hover:bg-zinc-100"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Total */}
                                                <div className="mt-3 pt-3 border-t border-zinc-200 flex justify-between items-center">
                                                    <span className="text-xs font-semibold text-zinc-700">Total:</span>
                                                    <span className="text-base font-bold text-blue-600">
                                                        ${(item.price * item.orderQty).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setTempCart([]);
                                }}
                                className="px-6 py-2 text-zinc-600 hover:text-zinc-900 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAddProducts}
                                disabled={tempCart.length === 0}
                                className="px-8 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                            >
                                Add {tempCart.length} Product{tempCart.length !== 1 ? 's' : ''} to Branch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}