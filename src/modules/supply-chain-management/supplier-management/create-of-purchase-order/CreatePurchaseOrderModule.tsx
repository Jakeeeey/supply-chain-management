// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/CreatePurchaseOrderModule.tsx
"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

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

import * as provider from "./providers/purchaseOrderProvider";
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
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

const ProductPickerDialog =
    (ProductPickerDialogModule as any).ProductPickerDialog ??
    (ProductPickerDialogModule as any).default;

const PurchaseOrderSummary =
    (PurchaseOrderSummaryModule as any).PurchaseOrderSummary ??
    (PurchaseOrderSummaryModule as any).default;

type RawSupplier = any;
type RawBranch = any;
type RawProduct = any;
type RawDiscountType = any;

const BOX_UOM_ID = 11;
const FALLBACK_NO_DISCOUNT_ID = "24";

function normalizeSupplier(raw: RawSupplier): Supplier {
    return {
        id: String(raw?.id ?? raw?.supplier_id ?? ""),
        name: String(raw?.supplier_name ?? raw?.name ?? "—"),
        terms: String(raw?.payment_terms ?? raw?.delivery_terms ?? ""),
        apBalance: Number(raw?.apBalance ?? raw?.ap_balance ?? 0) || 0,
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

    const baseUnitPrice =
        Number(
            raw?.priceA ??
            raw?.price_per_unit ??
            raw?.cost_per_unit ??
            raw?.price ??
            0
        ) || 0;

    const baseUomIdRaw = Number(
        raw?.unit_of_measurement ?? raw?.uom_id ?? raw?.unit_id
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

    let pricePerBox = baseUnitPrice;
    let piecesPerBox = 1;
    let baseUnitsPerBox = 1;

    if (baseUomId === BOX_UOM_ID) {
        pricePerBox = baseUnitPrice;
        piecesPerBox = Math.max(1, piecesPerBaseUnit || piecesPerBoxParsed || 1);
        baseUnitsPerBox = 1;
    } else {
        piecesPerBox = Math.max(1, piecesPerBoxParsed || 0);
        baseUnitsPerBox = piecesPerBox > 0 ? piecesPerBox / piecesPerBaseUnit : 1;
        if (!Number.isFinite(baseUnitsPerBox) || baseUnitsPerBox <= 0)
            baseUnitsPerBox = 1;
        pricePerBox = baseUnitPrice * baseUnitsPerBox;
    }

    return {
        id,
        name,
        sku,
        category,
        price: pricePerBox,
        uom: "BOX",
        uomId: BOX_UOM_ID,
        availableUoms: ["BOX"],

        baseUnitPrice,
        baseUomId,
        unitsPerBox: piecesPerBox,
        baseUnitsPerBox,
        discountTypeId: String(fixedDiscountTypeId || ""),
    } as any;
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
            <div className="text-xs font-bold uppercase text-muted-foreground tracking-tight">
                Supplier
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
                                    {props.suppliers.map((s, idx) => {
                                        const selected = props.value?.id === s.id;
                                        return (
                                            <React.Fragment key={s.id}>
                                                <CommandItem
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
                                                            <div className="text-[10px] text-muted-foreground truncate">
                                                                A/P: {s.apBalance.toLocaleString()}
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

                                                {idx < props.suppliers.length - 1 ? (
                                                    <Separator className="my-2" />
                                                ) : null}
                                            </React.Fragment>
                                        );
                                    })}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {props.value ? (
                <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="truncate">
            A/P Balance:{" "}
              <span className="font-bold text-foreground">
              {props.value.apBalance.toLocaleString()}
            </span>
          </span>
                    <button
                        type="button"
                        onClick={() => props.onChange(null)}
                        className="inline-flex items-center gap-1 hover:text-destructive shrink-0"
                        aria-label="Clear supplier"
                    >
                        <X className="w-3 h-3" /> Clear
                    </button>
                </div>
            ) : null}
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
        <div className="space-y-1.5 w-full min-w-0">
            <div className="text-xs font-bold uppercase text-muted-foreground tracking-tight">
                Delivery Branches
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
                                    {props.branches.map((b, idx) => {
                                        const isOn = selected.has(b.id);
                                        return (
                                            <React.Fragment key={b.id}>
                                                <CommandItem
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

                                                {idx < props.branches.length - 1 ? (
                                                    <Separator className="my-2" />
                                                ) : null}
                                            </React.Fragment>
                                        );
                                    })}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {props.value.length ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {props.value.slice(0, 6).map((id) => {
                        const b = props.branches.find((x) => x.id === id);
                        return (
                            <Badge key={id} variant="secondary" className="text-[10px] font-black">
                                {b?.code ?? id}
                            </Badge>
                        );
                    })}
                    {props.value.length > 6 ? (
                        <Badge variant="outline" className="text-[10px] font-black">
                            +{props.value.length - 6}
                        </Badge>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

export default function CreatePurchaseOrderModule() {
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
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [pickerBranchId, setPickerBranchId] = React.useState<string>("");

    const [selectedCategory, setSelectedCategory] = React.useState<string>("All Categories");
    const [searchQuery, setSearchQuery] = React.useState<string>("");

    const [tempCart, setTempCart] = React.useState<CartItem[]>([]);

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
            } catch (e: any) {
                if (!alive) return;
                setError(String(e?.message ?? e));
            } finally {
                if (!alive) return;
                setIsLoading(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, []);

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
                    const pid = String(row?.product_id ?? "");
                    const dtid = String(row?.discount_type ?? "");
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
                );
            } catch (e: any) {
                if (!alive) return;
                setError(String(e?.message ?? e));
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
                (branch.items ?? []).map((it: any) => ({
                    ...it,
                    selectedUom: "BOX",
                    uom: "BOX",
                    uomId: BOX_UOM_ID,
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
                    selectedUom: "BOX",
                    uom: "BOX",
                    uomId: BOX_UOM_ID,
                    discountTypeId: String((p as any).discountTypeId || defaultNoDiscountId || FALLBACK_NO_DISCOUNT_ID),
                } as any;

                return [...prev, item];
            });
        },
        [defaultNoDiscountId]
    );

    const updateTempUom = React.useCallback((productId: string, _uom: string) => {
        setTempCart((prev) =>
            prev.map((x: any) =>
                x.id === productId ? { ...x, selectedUom: "BOX", uom: "BOX", uomId: BOX_UOM_ID } : x
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
            selectedUom: "BOX",
            uom: "BOX",
            uomId: BOX_UOM_ID,
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

                date: dateOnly,
                date_encoded: nowISO,

                gross_amount: financials.grossAmount,
                discounted_amount: financials.discountAmount,

                vat_amount: financials.vatAmount,
                withholding_tax_amount: financials.ewtGoods,
                total_amount: financials.total,

                inventory_status: 1,

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

            console.log("PO RESPONSE:", json?.data ?? json);
            return json;
        } catch (e: any) {
            const msg = String(e?.message ?? e);
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSaving(false);
        }
    }, [selectedSupplier, allItemsFlat, poNumber, poDate, poDateISO, allocations, financials]);

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

    React.useEffect(() => {
        setAllocPage(1);
    }, [selectedSupplier?.id, selectedBranchIds.join("|")]);

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
        let end = Math.min(total, start + maxDots - 1);
        start = Math.max(1, end - maxDots + 1);

        const pages: number[] = [];
        for (let p = start; p <= end; p++) pages.push(p);
        return pages;
    }, [allocPage, allocTotalPages]);

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="space-y-1">
                <div className="text-xl font-black text-foreground">Create Purchase Order</div>
                <div className="text-sm text-muted-foreground">
                    Configure your supplier and branch allocations below.
                </div>
            </div>

            <Separator />

            {/* ✅ Responsive controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full min-w-0">
                <div className="lg:col-span-4 min-w-0">
                    <SupplierSelect
                        suppliers={suppliers}
                        value={selectedSupplier}
                        onChange={(s) => {
                            setSelectedSupplier(s);
                            setAllocations([]);
                            setSelectedBranchIds([]);
                            setPickerOpen(false);
                            setPickerBranchId("");
                            setTempCart([]);
                        }}
                        disabled={isLoading || isSaving}
                    />
                </div>

                <div className="lg:col-span-6 min-w-0">
                    <BranchMultiSelect
                        branches={branches}
                        value={selectedBranchIds}
                        onChange={setSelectedBranchIds}
                        disabled={isLoading || isSaving}
                    />
                </div>

                {/* ✅ Loader updated */}
                <div className="lg:col-span-2 min-w-0 flex items-end">
                    {isLoading || isSaving ? (
                        <div className="w-full [--radius:1rem]">
                            <Item variant="muted" className="h-11 rounded-xl">
                                <ItemMedia>
                                    <Spinner />
                                </ItemMedia>

                                <ItemContent>
                                    <ItemTitle className="line-clamp-1">
                                        {isSaving ? "Saving purchase order..." : "Loading Please WAIT..."}
                                    </ItemTitle>
                                </ItemContent>

                                <ItemContent className="flex-none justify-end">
                  <span className="text-sm tabular-nums">
                    {isSaving ? "Please wait" : "Fetching"}
                  </span>
                                </ItemContent>
                            </Item>
                        </div>
                    ) : null}
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
                canAddProducts={canAddProducts}
                onRemoveBranch={removeBranch}
                onOpenPicker={openPicker}
                onUpdateQty={updateQty}
                onRemoveItem={removeItem}
                discountTypes={discountTypes}
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
