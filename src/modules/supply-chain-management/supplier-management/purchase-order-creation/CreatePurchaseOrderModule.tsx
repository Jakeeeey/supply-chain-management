// src/modules/supply-chain-management/supplier-management/purchase-order-creation/CreatePurchaseOrderModule.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";

import type {
    BranchAllocation,
    CartItem,
    Product,
    Supplier,
    DiscountType,
} from "./types";

import {
    cn,
    deriveUnitsPerBoxFromText,
    calculateVatExclusiveFromAmounts,
    makePoMeta,
} from "./utils/calculations";

import * as provider from "./providers/fetchProviders";
import { toast } from "sonner";

import { BranchAllocations } from "./components/BranchAllocations";

// ✅ Robust imports: works whether components are exported as named OR default
import * as ProductPickerDialogModule from "./components/ProductPickerDialog";
import * as PurchaseOrderSummaryModule from "./components/PurchaseOrderSummary";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";

// ✅ NEW: shadcn snippets
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";

const ProductPickerDialog =
     
    (ProductPickerDialogModule as any).ProductPickerDialog ??
    (ProductPickerDialogModule as any).default;

const PurchaseOrderSummary =
     
    (PurchaseOrderSummaryModule as any).PurchaseOrderSummary ??
    (PurchaseOrderSummaryModule as any).default;

 
type RawSupplier = { id?: string | number; supplier_id?: string | number; supplier_name?: string; name?: string; payment_terms?: string; delivery_terms?: string; apBalance?: number; ap_balance?: number; supplier_type?: string; supplierType?: string };
type RawBranch = { id?: string | number; branch_id?: string | number; branch_code?: string; branch_name?: string; branch_description?: string };
type RawProduct = { product_id?: string | number; id?: string | number; product_name?: string; name?: string; product_code?: string; barcode?: string; sku?: string; category?: string; product_category_name?: string; product_category?: any; brand?: string; product_brand_name?: string; product_brand?: any; cost_price_unit?: number; priceA?: number; price_per_unit?: number; cost_per_unit?: number; price?: number; unit_of_measurement?: any; uom_id?: number | string; unit_id?: number | string; unit_of_measurement_count?: number; description?: string; short_description?: string; uom_name?: string; uom?: any; unit_name?: string };
type RawDiscountType = { id?: string | number; discount_type?: string; name?: string; total_percent?: string | number; percent?: string | number };

const BOX_UOM_ID = 11;
const FALLBACK_NO_DISCOUNT_ID = "24";

function normalizeSupplier(raw: RawSupplier): Supplier {
    return {
        id: String(raw?.id ?? raw?.supplier_id ?? ""),
        name: String(raw?.supplier_name ?? raw?.name ?? "—"),
        terms: String(raw?.payment_terms ?? raw?.delivery_terms ?? ""),
        apBalance: Number(raw?.apBalance ?? raw?.ap_balance ?? 0) || 0,
        supplierType: String(raw?.supplier_type ?? raw?.supplierType ?? "TRADE").toUpperCase(),
    };
}

function normalizeBranch(raw: RawBranch) {
    return {
        id: String(raw?.id ?? raw?.branch_id ?? ""),
        code: String(raw?.branch_code ?? ""),
        name: String(raw?.branch_name ?? raw?.branch_description ?? "—"),
    };
}

function normalizeDiscountType(raw: RawDiscountType): DiscountType {
    const id = String(raw?.id ?? "");
    const name = String(raw?.discount_type ?? raw?.name ?? "No Discount");
    const percent =
        Number.parseFloat(String(raw?.total_percent ?? raw?.percent ?? "0")) || 0;
    return { id, name, percent };
}

/**
 * ✅ BOX conversion rules:
 * - if baseUomId === 11 (BOX): price already per box
 * - else: compute price per box using parsed pieces per box
 */
function normalizeProduct(raw: RawProduct, fixedDiscountTypeId: string): Product {
    const id = String(raw?.product_id ?? raw?.id ?? "");
    const name = String(raw?.product_name ?? raw?.name ?? "—");
    const sku = String(raw?.product_code ?? raw?.barcode ?? raw?.sku ?? "");

    const category =
        String(
            raw?.category ??
            raw?.product_category_name ??
            raw?.product_category?.name ??
            raw?.product_category?.category_name ??
            (raw?.product_category !== undefined
                ? `Category ${raw.product_category}`
                : "Uncategorized")
        ) || "Uncategorized";

    const brand =
        String(
            raw?.brand ??
            raw?.product_brand_name ??
            raw?.product_brand?.name ??
            raw?.product_brand?.brand_name ??
            (raw?.product_brand !== undefined
                ? `Brand ${raw.product_brand}`
                : "No Brand")
        ) || "No Brand";

    const baseUnitPrice =
        Number(
            raw?.cost_price_unit ??
            raw?.priceA ??
            raw?.price_per_unit ??
            raw?.cost_per_unit ??
            raw?.price ??
            0
        ) || 0;

    const baseUomIdRaw = Number(
        raw?.unit_of_measurement?.unit_id ??
            raw?.unit_of_measurement ??
            raw?.uom_id ??
            raw?.unit_id
    );
    const baseUomId = Number.isFinite(baseUomIdRaw) ? baseUomIdRaw : 1;

    const baseUomCountRaw = Number(raw?.unit_of_measurement_count ?? 1);
    const piecesPerBaseUnit = Math.max(
        1,
        Number.isFinite(baseUomCountRaw) ? baseUomCountRaw : 1
    );

    const piecesPerBoxParsed = deriveUnitsPerBoxFromText(
        name,
        String(raw?.description ?? raw?.short_description ?? ""),
        baseUomId === BOX_UOM_ID ? piecesPerBaseUnit : 0
    );

    const parsedMeaningful = piecesPerBoxParsed > 1 ? piecesPerBoxParsed : 0;
    const piecesPerBox = Math.max(1, parsedMeaningful || piecesPerBaseUnit || 1);
    
    // Calculate how many times the base UOM fits into the full Box/Pack size
    let baseUnitsPerBox = piecesPerBox / piecesPerBaseUnit;
    if (!Number.isFinite(baseUnitsPerBox) || baseUnitsPerBox <= 0) {
        baseUnitsPerBox = 1;
    }

    // The price provided by the API (cost_price_unit, priceA, price_per_unit, etc.) 
    // IS EXACTLY the price for the product's defined Unit of Measurement.
    // If the UOM is PCS, this represents 1 PC. If UOM is BOX, it represents 1 BOX.
    // If UOM is TIE, it represents 1 TIE. We should NOT attempt to scale it up or down.
    const pricePerUom = baseUnitPrice;

    return {
        id,
        name,
        sku,
        brand,
        category,
        price: pricePerUom,
        uom: String(
            raw?.unit_of_measurement?.unit_shortcut ??
                raw?.unit_of_measurement?.unit_name ??
                raw?.uom_name ??
                raw?.uom?.unit_name ??
                raw?.unit_name ??
                "BOX"
        ).toUpperCase() || "BOX",
        uomId: Number(
            raw?.unit_of_measurement?.unit_id ??
                raw?.unit_of_measurement ??
                raw?.uom_id ??
                raw?.unit_id ??
                BOX_UOM_ID
        ),
        availableUoms: [
            String(
                raw?.unit_of_measurement?.unit_shortcut ??
                    raw?.unit_of_measurement?.unit_name ??
                    "BOX"
            ).toUpperCase(),
        ],

        discountTypeId: String(fixedDiscountTypeId || ""),
    } as Product;
}

function SupplierSelect(props: {
    suppliers: Supplier[];
    value: Supplier | null;
    onChange: (s: Supplier | null) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <div className="space-y-1.5 w-full min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase text-muted-foreground tracking-tight">
                <span>Supplier</span>
                {props.value ? (
                    <button
                        type="button"
                        onClick={() => props.onChange(null)}
                        className="inline-flex items-center gap-1 hover:text-destructive transition-colors lowercase font-normal"
                        aria-label="Clear supplier"
                    >
                        <X className="w-2.5 h-2.5" /> clear filter
                    </button>
                ) : null}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-11 rounded-xl min-w-0"
                        disabled={props.disabled}
                    >
                        <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-xs font-bold">
                {props.value?.name ?? "Select supplier"}
              </span>
                            {props.value?.id ? (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] font-black shrink-0"
                                >
                                    ID: {props.value.id}
                                </Badge>
                            ) : null}
                        </div>
                        <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
                    </Button>
                </PopoverTrigger>

                {/* ✅ ScrollArea + Separators */}
                <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] min-w-[280px] max-w-[92vw]"
                    align="start"
                >
                    <Command>
                        <CommandInput placeholder="Search supplier..." />
                        <CommandList>
                            <CommandEmpty>No supplier found.</CommandEmpty>

                            <ScrollArea className="h-72">
                                <CommandGroup heading="Suppliers" className="p-2">
                                    {props.suppliers.map((s) => {
                                        const selected = props.value?.id === s.id;
                                        return (
                                                <CommandItem
                                                    key={s.id}
                                                    value={`${s.name} ${s.id}`}
                                                    onSelect={() => {
                                                        props.onChange(selected ? null : s);
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 w-full">
                                                        <div
                                                            className={cn(
                                                                "h-5 w-5 rounded-full border flex items-center justify-center shrink-0",
                                                                selected
                                                                    ? "bg-primary text-primary-foreground border-primary"
                                                                    : "bg-background"
                                                            )}
                                                        >
                                                            {selected ? <Check className="w-3 h-3" /> : null}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs font-bold truncate">
                                                                {s.name}
                                                            </div>
                                                        </div>

                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] font-black shrink-0"
                                                        >
                                                            {s.id}
                                                        </Badge>
                                                    </div>
                                                </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

        </div>
    );
}

function BranchMultiSelect(props: {
    branches: Array<{ id: string; code: string; name: string }>;
    value: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = React.useState(false);

    const selected = React.useMemo(() => new Set(props.value), [props.value]);

    const label = React.useMemo(() => {
        if (props.value.length === 0) return "Select branches";
        if (props.value.length === 1) {
            const b = props.branches.find((x) => x.id === props.value[0]);
            return b ? `${b.code} — ${b.name}` : "1 branch selected";
        }
        return `${props.value.length} branches selected`;
    }, [props.value, props.branches]);

    return (
        <div className="space-y-2 w-full min-w-0">
            <div className="flex items-center justify-between gap-3 px-1">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Delivery Branches
                </div>
                {props.value.length ? (
                    <Badge variant="outline" className="text-[9px] font-black uppercase bg-primary/5 text-primary border-primary/20 transition-all animate-in zoom-in-95">
                        {props.value.length} SELECTED
                    </Badge>
                ) : null}
            </div>

            <div className="flex flex-wrap gap-1.5 empty:hidden mb-2">
                {props.value.slice(0, 8).map((id) => {
                    const b = props.branches.find((x) => x.id === id);
                    return (
                        <Badge key={id} variant="secondary" className="text-[9px] font-bold h-5 uppercase">
                            {b?.code ?? id}
                        </Badge>
                    );
                })}
                {props.value.length > 8 ? (
                    <Badge variant="outline" className="text-[9px] font-bold h-5">
                        +{props.value.length - 8} MORE
                    </Badge>
                ) : null}
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-11 rounded-xl min-w-0"
                        disabled={props.disabled}
                    >
                        <span className="truncate text-xs font-bold">{label}</span>
                        <ChevronDown className="w-4 h-4 opacity-60 shrink-0" />
                    </Button>
                </PopoverTrigger>

                {/* ✅ Actions fixed, list scrollable */}
                <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] min-w-[320px] max-w-[92vw]"
                    align="start"
                >
                    <Command>
                        <CommandInput placeholder="Search branch..." />
                        <CommandList>
                            <CommandEmpty>No branch found.</CommandEmpty>

                            <CommandGroup heading="Actions" className="p-2">
                                <CommandItem
                                    value="__all__"
                                    onSelect={() => {
                                        const all = props.branches.map((b) => b.id);
                                        props.onChange(all);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 opacity-70" />
                                        <span className="text-xs font-black uppercase tracking-wider">
                      Select All
                    </span>
                                    </div>
                                </CommandItem>

                                <CommandItem
                                    value="__clear__"
                                    onSelect={() => {
                                        props.onChange([]);
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2 text-destructive">
                                        <X className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-wider">
                      Clear
                    </span>
                                    </div>
                                </CommandItem>
                            </CommandGroup>

                            <Separator />

                            <ScrollArea className="h-72">
                                <CommandGroup heading="Branches" className="p-2">
                                    {props.branches.map((b) => {
                                        const isOn = selected.has(b.id);
                                        return (
                                                <CommandItem
                                                    key={b.id}
                                                    value={`${b.code} ${b.name}`}
                                                    onSelect={() => {
                                                        const next = new Set(selected);
                                                        if (next.has(b.id)) next.delete(b.id);
                                                        else next.add(b.id);
                                                        props.onChange(Array.from(next));
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 w-full min-w-0">
                                                        <div
                                                            className={cn(
                                                                "h-5 w-5 rounded border flex items-center justify-center shrink-0",
                                                                isOn
                                                                    ? "bg-primary text-primary-foreground border-primary"
                                                                    : "bg-background"
                                                            )}
                                                        >
                                                            {isOn ? <Check className="w-3 h-3" /> : null}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs font-black truncate">
                                                                {b.code}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground truncate">
                                                                {b.name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default function CreatePurchaseOrderModule({ encoderId }: { encoderId?: number }) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState<string>("");

    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
    const [branches, setBranches] = React.useState<Array<{ id: string; code: string; name: string }>>([]);

    const [discountTypes, setDiscountTypes] = React.useState<DiscountType[]>([]);

    const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
    const [selectedBranchIds, setSelectedBranchIds] = React.useState<string[]>([]);
    const [allocations, setAllocations] = React.useState<BranchAllocation[]>([]);

    const [allProducts, setAllProducts] = React.useState<Product[]>([]);

    const [selectedSupplierType, setSelectedSupplierType] = React.useState<"ALL" | "TRADE" | "NON-TRADE">("TRADE");

    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [pickerBranchId, setPickerBranchId] = React.useState<string>("");

    const [selectedCategory, setSelectedCategory] = React.useState<string>("All Categories");
    const [searchQuery, setSearchQuery] = React.useState<string>("");

    const [tempCart, setTempCart] = React.useState<CartItem[]>([]);
    const [isInvoice, setIsInvoice] = React.useState(false);
    const [isLocked, setIsLocked] = React.useState(false);

     
    const meta = React.useMemo(() => (makePoMeta() as any), []);
    const poNumber = String(meta?.poNumber ?? "DRAFT-PO");
    const poDate = String(meta?.poDate ?? "");
    const poDateISO = String(meta?.poDateISO ?? new Date().toISOString());

    const discountTypeById = React.useMemo(() => {
        const m = new Map<string, DiscountType>();
        for (const d of discountTypes) m.set(String(d.id), d);
        return m;
    }, [discountTypes]);

    const defaultNoDiscountId = React.useMemo(() => {
        const byName = discountTypes.find((d) => String(d.name ?? "").toLowerCase() === "no discount");
        if (byName) return byName.id;
        return discountTypes[0]?.id ?? FALLBACK_NO_DISCOUNT_ID;
    }, [discountTypes]);

    // Load suppliers + branches + discount types
    React.useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setIsLoading(true);
                setError("");

                const results = await Promise.allSettled([
                    provider.fetchSuppliers(),
                    provider.fetchBranches(),
                    provider.fetchDiscountTypes(),
                ]);

                if (!alive) return;

                if (results[0].status === "rejected") throw results[0].reason;
                if (results[1].status === "rejected") throw results[1].reason;

                const sRes = results[0].status === "fulfilled" ? results[0].value : [];
                const bRes = results[1].status === "fulfilled" ? results[1].value : [];

                setSuppliers((sRes ?? []).map(normalizeSupplier));
                setBranches((bRes ?? []).map(normalizeBranch));

                if (results[2].status === "fulfilled") {
                    setDiscountTypes((results[2].value ?? []).map(normalizeDiscountType));
                } else {
                    setDiscountTypes([]);
                    console.warn("Discount types failed:", results[2].reason);
                }
            } catch (e: unknown) {
                if (!alive) return;
                const err = e as Error;
                setError(String(err?.message ?? err));
            } finally {
                if (!alive) return;
                setIsLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

    const filteredSuppliers = React.useMemo(() => {
        if (selectedSupplierType === "ALL") return suppliers;
        return suppliers.filter((s) => s.supplierType === selectedSupplierType.toUpperCase());
    }, [suppliers, selectedSupplierType]);

    // supplier change: fetch products + product_per_supplier links then merge discountTypeId
    React.useEffect(() => {
        let alive = true;

        (async () => {
            try {
                setAllProducts([]);
                setSelectedCategory("All Categories");
                setSearchQuery("");

                if (!selectedSupplier?.id) return;

                const [rawProducts, links] = await Promise.all([
                    provider.fetchProducts({ supplierId: selectedSupplier.id }),
                    provider.fetchProductSupplierLinks(selectedSupplier.id),
                ]);

                if (!alive) return;

                const discountByProductId = new Map<string, string>();
                for (const row of links ?? []) {
                     
                    const r: any = row;
                    const pid = String(r?.product_id ?? "");
                    const dtid = String(r?.discount_type ?? "");
                    if (pid) discountByProductId.set(pid, dtid);
                }

                const DEBUG_BOX_CONVERSION = false;
                const MAX_DEBUG_LOGS = 50;
                let debugCount = 0;

                setAllProducts(
                    (rawProducts ?? []).map((rp: any) => {
                        const pid = String(rp?.product_id ?? rp?.id ?? "");
                        const fixedDiscountTypeId =
                            discountByProductId.get(pid) ||
                            defaultNoDiscountId ||
                            FALLBACK_NO_DISCOUNT_ID;

                        const np = normalizeProduct(rp, fixedDiscountTypeId);

                        if (DEBUG_BOX_CONVERSION && debugCount < MAX_DEBUG_LOGS) {
                            debugCount += 1;
                            console.log("[BOX-CONV]", {
                                product_id: (np as any)?.id,
                                name: (np as any)?.name,
                                baseUomId: (np as any)?.baseUomId,
                                baseUnitPrice: (np as any)?.baseUnitPrice,
                                unitsPerBox: (np as any)?.unitsPerBox,
                                baseUnitsPerBox: (np as any)?.baseUnitsPerBox,
                                pricePerBox: (np as any)?.price,
                            });
                        }

                        return np;
                    })
                    .filter((np: any) => np.uomId === BOX_UOM_ID)
                );
                setIsInvoice(false);
            } catch (e: unknown) {
                if (!alive) return;
                const err = e as Error;
                setError(String(err?.message ?? err));
            }
        })();

        return () => {
            alive = false;
        };
    }, [selectedSupplier?.id, defaultNoDiscountId]);

    // Sync allocations with selectedBranchIds
    React.useEffect(() => {
        setAllocations((prev) => {
            const prevMap = new Map(prev.map((x) => [x.branchId, x]));
            const next: BranchAllocation[] = selectedBranchIds.map((id) => {
                const b = branches.find((x) => x.id === id);
                const existing = prevMap.get(id);
                return existing
                    ? { ...existing, branchName: b?.name ?? existing.branchName }
                    : { branchId: id, branchName: b?.name ?? id, items: [] };
            });
            return next;
        });
    }, [selectedBranchIds, branches]);

    const categories = React.useMemo(() => {
        const set = new Set<string>();
        for (const p of allProducts) set.add(p.category || "Uncategorized");
        const arr = Array.from(set).sort((a, b) => a.localeCompare(b));
        return ["All Categories", ...arr];
    }, [allProducts]);

    React.useEffect(() => {
        if (!categories.includes(selectedCategory)) setSelectedCategory("All Categories");
    }, [categories, selectedCategory]);

    const filteredProducts = React.useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return allProducts.filter((p) => {
            const catOk = selectedCategory === "All Categories" || p.category === selectedCategory;
            const qOk =
                !q ||
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                String(p.id).toLowerCase().includes(q);
            return catOk && qOk;
        });
    }, [allProducts, selectedCategory, searchQuery]);

    const canAddProducts = Boolean(selectedSupplier?.id);

    const openPicker = React.useCallback(
        (branchId: string) => {
            if (!canAddProducts) return;

            const branch = allocations.find((b) => b.branchId === branchId);
            if (!branch) return;

            setPickerBranchId(branchId);

            setTempCart(
                 
                (branch.items ?? []).map((it: CartItem) => ({
                    ...it,
                    selectedUom: it.uom || "BOX",
                    uom: it.uom || "BOX",
                    uomId: it.uomId || BOX_UOM_ID,
                    discountTypeId: String(it.discountTypeId || defaultNoDiscountId || FALLBACK_NO_DISCOUNT_ID),
                }))
            );

            setPickerOpen(true);
        },
        [allocations, canAddProducts, defaultNoDiscountId]
    );

    const removeBranch = React.useCallback((branchId: string) => {
        setSelectedBranchIds((prev) => prev.filter((x) => x !== branchId));
    }, []);

    const updateQty = React.useCallback((branchId: string, productId: string, qty: number) => {
        setAllocations((prev) =>
            prev.map((b) => {
                if (b.branchId !== branchId) return b;
                return {
                    ...b,
                     
                    items: b.items.map((it: any) =>
                        it.id === productId ? { ...it, orderQty: Math.max(1, qty) } : it
                    ),
                };
            })
        );
    }, []);

    const removeItem = React.useCallback((branchId: string, productId: string) => {
        setAllocations((prev) =>
            prev.map((b) => {
                if (b.branchId !== branchId) return b;
                 
                return { ...b, items: b.items.filter((it: any) => it.id !== productId) };
            })
        );
    }, []);

    // temp cart handlers (dialog)
    const toggleProduct = React.useCallback(
        (p: Product) => {
            setTempCart((prev) => {
                const exists = prev.some((x) => x.id === p.id);
                if (exists) return prev.filter((x) => x.id !== p.id);

                const item: CartItem = {
                    ...(p as any),
                    orderQty: 1,
                    selectedUom: p.uom,
                    uom: p.uom,
                    uomId: p.uomId,
                    discountTypeId: String((p as any).discountTypeId || defaultNoDiscountId || FALLBACK_NO_DISCOUNT_ID),
                } as any;

                return [...prev, item];
            });
        },
        [defaultNoDiscountId]
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updateTempUom = React.useCallback((productId: string, _uom: string) => {
        setTempCart((prev) =>
             
            prev.map((x: any) =>
                x.id === productId ? { ...x, selectedUom: x.uom, uom: x.uom, uomId: x.uomId } : x
            )
        );
    }, []);

    const updateTempQty = React.useCallback((productId: string, qty: number) => {
        setTempCart((prev) =>
             
            prev.map((x: any) => (x.id === productId ? { ...x, orderQty: Math.max(1, qty) } : x))
        );
    }, []);

    const removeFromTemp = React.useCallback((item: CartItem) => {
        setTempCart((prev) => prev.filter((x) => x.id !== item.id));
    }, []);

    const confirmPicker = React.useCallback(() => {
        const branchId = pickerBranchId;
        if (!branchId) {
            setPickerOpen(false);
            return;
        }

         
        const normalized = tempCart.map((it: any) => ({
            ...it,
            selectedUom: it.uom,
            uom: it.uom,
            uomId: it.uomId,
            discountTypeId: String(it.discountTypeId || defaultNoDiscountId || FALLBACK_NO_DISCOUNT_ID),
        }));

        setAllocations((prev) =>
             
            prev.map((b) => (b.branchId === branchId ? { ...b, items: normalized as any } : b))
        );

        // ✅ Toast: confirm product selection
        const branchLabel = allocations.find((x) => x.branchId === branchId)?.branchName ?? "branch";
        if (normalized.length > 0) {
            toast.success(`Products confirmed for ${branchLabel}`, {
                description: `${normalized.length} product${normalized.length !== 1 ? "s" : ""} added to the order.`,
            });
        } else {
            toast.info(`Products cleared for ${branchLabel}`, {
                description: "No products were selected for this branch.",
            });
        }

        setPickerOpen(false);
    }, [pickerBranchId, tempCart, defaultNoDiscountId, allocations]);

    // Summary
    const allItemsFlat = React.useMemo(() => {
        return allocations.flatMap((b) => b.items.map((item) => ({ branchName: b.branchName, item })));
    }, [allocations]);

    const grossAmount = React.useMemo(() => {
        return allItemsFlat.reduce(
            (sum, x) => sum + Number(x.item.price || 0) * Number(x.item.orderQty || 0),
            0
        );
    }, [allItemsFlat]);

    const discountAmount = React.useMemo(() => {
        return allItemsFlat.reduce((sum, x) => {
             
            const item: any = x.item;
            const gross = Number(item.price || 0) * Number(item.orderQty || 0);

            const id = String(item.discountTypeId || defaultNoDiscountId || "");
            const dt = id ? discountTypeById.get(id) : undefined;

            const pct = Math.max(0, Number(dt?.percent ?? 0));
            return sum + gross * (pct / 100);
        }, 0);
    }, [allItemsFlat, discountTypeById, defaultNoDiscountId]);

    const financials = React.useMemo(() => {
        return calculateVatExclusiveFromAmounts(grossAmount, discountAmount);
    }, [grossAmount, discountAmount]);

    const canSave = Boolean(selectedSupplier?.id) && allItemsFlat.length > 0 && !isSaving;

    const onSave = React.useCallback(async () => {
        if (!selectedSupplier?.id) return;
        if (!allItemsFlat.length) return;

        try {
            setIsSaving(true);
            setError("");

            const nowISO = new Date().toISOString();
            const dateOnly = nowISO.slice(0, 10);

             
            const payload: any = {
                purchase_order_no: poNumber,
                supplier_name: Number(selectedSupplier.id),
                is_invoice: isInvoice,

                date: dateOnly,
                date_encoded: nowISO,

                gross_amount: financials.grossAmount,
                discounted_amount: financials.discountAmount,

                vat_amount: financials.vatAmount,
                withholding_tax_amount: financials.ewtGoods,
                total_amount: financials.total,

                inventory_status: 1,
                encoder_id: encoderId,

                poNumber,
                poDate,
                poDateISO,
                supplierId: selectedSupplier.id,
                grossAmount: financials.grossAmount,
                discountAmount: financials.discountAmount,
                netAmount: financials.netAmount,
                vatAmount: financials.vatAmount,
                ewtGoods: financials.ewtGoods,
                total: financials.total,

                allocations,
                items: allItemsFlat.map((x) => {
                    const it: any = x.item;
                    return {
                        branchName: x.branchName,
                        productId: it.id,
                        qtyBoxes: it.orderQty,
                        uomId: BOX_UOM_ID,
                        pricePerBox: it.price,
                        pcsPerBox: it.unitsPerBox ?? 1,
                        baseUomId: it.baseUomId ?? null,
                        baseUnitPrice: it.baseUnitPrice ?? null,
                        baseUnitsPerBox: it.baseUnitsPerBox ?? null,
                        discountTypeId: it.discountTypeId ?? null,
                    };
                }),
            };

            const json = await provider.createPurchaseOrder(payload);

            console.log("PO RESPONSE:", (json as any)?.data ?? json);
            setIsLocked(true);
            toast.success("Purchase Order created successfully!", {
                description: `PO ${poNumber} has been saved and locked.`,
            });
            return json;
        } catch (e: unknown) {
            const err = e as Error;
            const msg = String(err?.message ?? err);
            setError(msg);
            toast.error("Failed to create Purchase Order", { description: msg });
            throw new Error(msg);
        } finally {
            setIsSaving(false);
        }
    }, [selectedSupplier, allItemsFlat, poNumber, poDate, poDateISO, allocations, financials, isInvoice, encoderId]);

    const pickerBranchLabel = React.useMemo(() => {
        const b = allocations.find((x) => x.branchId === pickerBranchId);
        return b?.branchName ?? "Branch";
    }, [allocations, pickerBranchId]);

    // ✅ Allocations pagination
    const [allocPage, setAllocPage] = React.useState(1);
    const allocPerPage = 5;

    const allocTotalPages = React.useMemo(() => {
        return Math.max(1, Math.ceil((allocations?.length ?? 0) / allocPerPage));
    }, [allocations?.length]);

    React.useEffect(() => {
        setAllocPage((p) => Math.min(Math.max(1, p), allocTotalPages));
    }, [allocTotalPages, allocations?.length]);

    const selectedBranchIdsJoined = selectedBranchIds.join("|");
    React.useEffect(() => {
        setAllocPage(1);
    }, [selectedSupplier?.id, selectedBranchIdsJoined]);

    const paginatedAllocations = React.useMemo(() => {
        const start = (allocPage - 1) * allocPerPage;
        return (allocations ?? []).slice(start, start + allocPerPage);
    }, [allocations, allocPage]);

    const allocDotPages = React.useMemo(() => {
        const total = allocTotalPages;
        const current = Math.min(Math.max(1, allocPage), total);
        const maxDots = 5;
        const half = Math.floor(maxDots / 2);

        let start = Math.max(1, current - half);
        const end = Math.min(total, start + maxDots - 1);
        start = Math.max(1, end - maxDots + 1);

        const pages: number[] = [];
        for (let p = start; p <= end; p++) pages.push(p);
        return pages;
    }, [allocPage, allocTotalPages]);

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                    <div className="text-xl font-black text-foreground">Create Purchase Order</div>
                    <div className="text-sm text-muted-foreground">
                        Configure your supplier and branch allocations below.
                    </div>
                </div>

                {/* Loader shifted to Top Right */}
                {isLoading || isSaving ? (
                    <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-2xl border border-border/50 shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
                        <Spinner className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {isSaving ? "Saving Order..." : "Loading Data..."}
                        </span>
                    </div>
                ) : null}
            </div>

            <Separator />

            {/* ✅ Optimized 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end w-full min-w-0">
                {/* 1) SUPPLIER TYPE FILTER (3/12) */}
                <div className="lg:col-span-3 min-w-0 space-y-1.5 flex flex-col justify-end">
                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">
                        Supplier Type
                    </div>
                    <div className="flex gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 h-11 items-center backdrop-blur-sm">
                        {["TRADE", "NON-TRADE", "ALL"].map((type) => {
                            const active = selectedSupplierType === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                         
                                        setSelectedSupplierType(type as any);
                                        if (selectedSupplier && type !== "ALL" && selectedSupplier.supplierType !== type) {
                                            setSelectedSupplier(null);
                                            setAllocations([]);
                                            setSelectedBranchIds([]);
                                        }
                                    }}
                                    className={cn(
                                        "flex-1 h-full px-2 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all duration-200",
                                        active
                                            ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                    )}
                                >
                                    {type.replace("-", " ")}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2) SUPPLIER SELECT (4/12) */}
                <div className="lg:col-span-4 min-w-0">
                    <SupplierSelect
                        suppliers={filteredSuppliers}
                        value={selectedSupplier}
                        onChange={(s) => {
                            setSelectedSupplier(s);
                            setAllocations([]);
                            setSelectedBranchIds([]);
                            setPickerOpen(false);
                            setPickerBranchId("");
                            setTempCart([]);
                        }}
                        disabled={isLoading || isSaving || isLocked}
                    />
                </div>

                {/* 3) DELIVERY BRANCHES (5/12) */}
                <div className="lg:col-span-5 min-w-0">
                    <BranchMultiSelect
                        branches={branches}
                        value={selectedBranchIds}
                        onChange={setSelectedBranchIds}
                        disabled={isLoading || isSaving || isLocked}
                    />
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            {/* Pagination controls */}
            {allocations.length > allocPerPage ? (
                <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold text-muted-foreground bg-background px-2 py-0.5 rounded border uppercase">
            Page {allocPage} of {allocTotalPages}
          </span>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-[10px] font-black uppercase"
                            disabled={allocPage === 1}
                            onClick={() => setAllocPage((p) => Math.max(1, p - 1))}
                        >
                            Prev
                        </Button>

                        <div className="flex gap-1.5">
                            {allocDotPages.map((p) => (
                                <div
                                    key={p}
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        allocPage === p ? "bg-primary" : "bg-border"
                                    )}
                                />
                            ))}
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-[10px] font-black uppercase"
                            disabled={allocPage >= allocTotalPages}
                            onClick={() => setAllocPage((p) => Math.min(allocTotalPages, p + 1))}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : null}

            <BranchAllocations
                branches={paginatedAllocations}
                canAddProducts={canAddProducts && !isLocked}
                onRemoveBranch={removeBranch}
                onOpenPicker={openPicker}
                onUpdateQty={updateQty}
                onRemoveItem={removeItem}
                discountTypes={discountTypes}
                disabled={isLocked}
            />

            <PurchaseOrderSummary
                visible={selectedBranchIds.length > 0}
                poNumber={poNumber}
                poDate={poDate}
                supplier={selectedSupplier}
                branches={allocations}
                allItemsFlat={allItemsFlat}
                subtotal={financials.grossAmount}
                discount={financials.discountAmount}
                tax={financials.vatAmount}
                ewtGoods={financials.ewtGoods}
                total={financials.total}
                onSave={onSave}
                canSave={canSave}
                discountTypes={discountTypes}
                isInvoice={isInvoice}
                setIsInvoice={setIsInvoice}
                isLocked={isLocked}
                onReset={() => window.location.reload()}
            />

            <ProductPickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                branchLabel={pickerBranchLabel}
                supplierName={selectedSupplier?.name ?? "—"}
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                products={filteredProducts}
                tempCart={tempCart}
                onToggleProduct={toggleProduct}
                onUpdateTempUom={updateTempUom}
                onRemoveFromTemp={removeFromTemp}
                onUpdateTempQty={updateTempQty}
                onConfirm={confirmPicker}
            />
        </div>
    );
}
