"use client";

import * as React from "react";
import { useCreatePurchaseOrder } from "./hooks/useCreatePurchaseOrder";
import { PurchaseOrderSummary } from "./components/PurchaseOrderSummary";
import {
    Loader2,
    ArrowLeft,
    Package,
    CheckSquare,
    ChevronRight,
    Store,
    Truck,
    ShoppingCart,
    Search,
} from "lucide-react";

export default function CreatePurchaseOrderModule() {
    const [mounted, setMounted] = React.useState(false);

    const {
        step,
        setStep,
        isLoading,
        suppliers = [],
        branches = [],
        availableProducts = [],
        selectedSupplier,
        setSelectedSupplierId,
        selectedBranchIds = [],
        setSelectedBranchIds,
        cart = [],
        addToCart,
        removeFromCart,
        financials,
        handleSave,
    } = useCreatePurchaseOrder();

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const isAllSelected =
        branches.length > 0 && selectedBranchIds.length === branches.length;

    const toggleSelectAll = () => {
        if (isAllSelected) setSelectedBranchIds([]);
        else setSelectedBranchIds(branches.map((b) => String(b.id)));
    };

    if (isLoading || !mounted) {
        return (
            <div className="flex h-[80vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary/60" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">
                        Loading Procurement Module...
                    </p>
                </div>
            </div>
        );
    }

    const branchAllocations = selectedBranchIds
        .map((bId) => {
            const branch = branches.find((b) => String(b.id) === String(bId));
            return {
                branchId: String(bId),
                branchName: branch?.branch_name || "Unknown",
                items: cart.filter((c) => String(c.branchId) === String(bId)),
            };
        })
        .filter((b) => b.items.length > 0);

    const flatItems = cart.map((item) => ({
        branchName:
            branches.find((b) => String(b.id) === String(item.branchId))
                ?.branch_name || "Unknown",
        item,
    }));

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen pb-24">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-8">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Package className="h-5 w-5" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        Create Purchase Order
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure your supplier and branch allocations below.
                    </p>
                </div>
            </div>

            {step === 1 && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* SUPPLIER */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Truck className="h-4 w-4 text-primary" />
                            </div>
                            <h2 className="font-semibold text-lg text-foreground">
                                Supplier Information
                            </h2>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium leading-none text-foreground">
                                    Select Vendor
                                </label>

                                <select
                                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                             ring-offset-background focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed
                             disabled:opacity-50 font-medium text-foreground"
                                    value={selectedSupplier?.id || ""}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                >
                                    <option value="">Search or select a supplier...</option>
                                    {suppliers?.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.supplier_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedSupplier && (
                                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-border bg-muted/20">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                            Vendor Code
                                        </p>
                                        <p className="font-mono font-bold text-foreground">
                                            {selectedSupplier.supplier_shortcut}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                            Business Type
                                        </p>
                                        <p className="font-semibold text-foreground">
                                            {selectedSupplier.supplier_type || "General Supplier"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BRANCHES */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Store className="h-4 w-4 text-primary" />
                                </div>
                                <h2 className="font-semibold text-lg text-foreground">
                                    Branch Destinations
                                </h2>
                            </div>

                            <button
                                onClick={toggleSelectAll}
                                className="text-xs font-semibold text-primary hover:underline underline-offset-4 flex items-center gap-2"
                                type="button"
                            >
                                {isAllSelected ? "Deselect All" : "Select All Branches"}
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                                {branches?.map((branch) => {
                                    const id = String(branch.id);
                                    const active = selectedBranchIds.includes(id);

                                    return (
                                        <div
                                            key={id}
                                            onClick={() => {
                                                if (active)
                                                    setSelectedBranchIds(
                                                        selectedBranchIds.filter((x) => x !== id)
                                                    );
                                                else setSelectedBranchIds([...selectedBranchIds, id]);
                                            }}
                                            className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                active
                                                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary"
                                                    : "border-border bg-card hover:border-muted-foreground/30"
                                            }`}
                                        >
                                            <div
                                                className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                                                    active
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "bg-background border-muted-foreground/40"
                                                }`}
                                            >
                                                {active && <CheckSquare className="h-3.5 w-3.5" />}
                                            </div>

                                            <div className="flex flex-col">
                        <span
                            className={`text-sm font-bold ${
                                active ? "text-primary" : "text-foreground"
                            }`}
                        >
                          {branch.branch_name}
                        </span>
                                                <span className="text-[10px] font-mono text-muted-foreground">
                          {branch.branch_code}
                        </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* PROCEED */}
                    <div className="flex justify-end pt-4">
                        <button
                            disabled={!selectedSupplier || selectedBranchIds.length === 0}
                            onClick={() => setStep(2)}
                            className="h-14 px-10 bg-primary text-primary-foreground font-bold rounded-lg shadow-xl
                         hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed
                         transition-all flex items-center gap-3 text-base"
                            type="button"
                        >
                            Proceed to Item Selection
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-700">
                    {/* PRODUCTS */}
                    <div className="col-span-12 lg:col-span-8 space-y-12">
                        {selectedBranchIds.map((branchId) => {
                            const branch = branches.find((b) => String(b.id) === String(branchId));

                            return (
                                <div
                                    key={branchId}
                                    className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
                                >
                                    <div className="bg-muted/30 border-b border-border px-6 py-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-muted px-2 py-1 rounded font-mono text-[10px] font-bold text-foreground/80">
                                                {branch?.branch_code}
                                            </div>
                                            <h3 className="font-bold text-foreground uppercase tracking-tight">
                                                {branch?.branch_name}
                                            </h3>
                                        </div>

                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <ShoppingCart className="h-3 w-3" />
                                            {cart.filter((c) => String(c.branchId) === String(branchId)).length} Items Added
                                        </div>
                                    </div>

                                    <div className="divide-y divide-border">
                                        {Array.isArray(availableProducts) && availableProducts.length > 0 ? (
                                            availableProducts.map((prod) => {
                                                const pId = prod.product_id ?? prod.id ?? prod.productId;
                                                const itemInCart = cart.find(
                                                    (c) =>
                                                        String(c.product_id ?? c.id ?? c.productId) === String(pId) &&
                                                        String(c.branchId) === String(branchId)
                                                );

                                                return (
                                                    <div
                                                        key={String(pId)}
                                                        className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                                                    >
                                                        <div className="space-y-1">
                                                            <h4 className="font-bold text-foreground leading-tight">
                                                                {prod.product_name ?? prod.productName ?? "(No Name)"}
                                                            </h4>

                                                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  {prod.product_code ?? prod.productCode ?? prod.sku ?? "N/A"}
                                </span>
                                                                <span className="text-xs font-semibold text-primary">
                                  ₱{Number(prod.price_per_unit ?? prod.pricePerUnit ?? 0).toLocaleString()}
                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 bg-background border border-border rounded-lg p-1 w-fit shadow-sm">
                                                            <button
                                                                onClick={() => {
                                                                    const q = (itemInCart?.orderQty || 0) - 1;
                                                                    q <= 0
                                                                        ? removeFromCart(pId, String(branchId))
                                                                        : addToCart(prod, String(branchId), q);
                                                                }}
                                                                className="h-9 w-9 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground font-bold"
                                                                type="button"
                                                            >
                                                                —
                                                            </button>

                                                            <input
                                                                type="number"
                                                                className="w-12 text-center font-bold text-sm bg-transparent border-none focus:ring-0 text-foreground"
                                                                value={itemInCart?.orderQty || 0}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value);
                                                                    if (!isNaN(val)) addToCart(prod, String(branchId), val);
                                                                }}
                                                            />

                                                            <button
                                                                onClick={() =>
                                                                    addToCart(prod, String(branchId), (itemInCart?.orderQty || 0) + 1)
                                                                }
                                                                className="h-9 w-9 flex items-center justify-center rounded hover:bg-muted transition-colors text-primary font-bold"
                                                                type="button"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-12 text-center">
                                                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                <p className="text-sm text-muted-foreground font-medium">
                                                    No products available
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* SUMMARY */}
                    <div className="col-span-12 lg:col-span-4">
                        <div className="sticky top-10 space-y-4">
                            <PurchaseOrderSummary
                                visible={true}
                                poNumber="DRAFT-PO"
                                poDate={new Date().toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                                supplier={selectedSupplier}
                                branches={branchAllocations}
                                allItemsFlat={flatItems}
                                subtotal={financials?.subtotal || 0}
                                discount={financials?.discount || 0}
                                tax={financials?.vatAmount || 0}
                                total={financials?.total || 0}
                                onSave={handleSave}
                                canSave={cart.length > 0}
                            />

                            <button
                                onClick={() => setStep(1)}
                                className="w-full py-4 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                type="button"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Setup Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
