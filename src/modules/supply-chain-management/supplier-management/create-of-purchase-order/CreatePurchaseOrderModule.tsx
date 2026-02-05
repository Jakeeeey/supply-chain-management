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
    deriveDiscountPercentFromCode,
    deriveUnitsPerBoxFromText,
} from "./utils/calculations";
import * as provider from "./providers/purchaseOrderProvider";

import { BranchAllocations } from "./components/BranchAllocations";
import { ProductPickerDialog } from "./components/ProductPickerDialog";
import { PurchaseOrderSummary } from "./components/PurchaseOrderSummary";

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

type RawSupplier = any;
type RawBranch = any;
type RawProduct = any;
type RawDiscountType = any;

const BOX_UOM_ID = 11;
const FALLBACK_NO_DISCOUNT_ID = "24"; // your "No Discount" id

function normalizeSupplier(raw: RawSupplier): Supplier {
    return {
        id: String(raw?.id ?? ""),
        name: String(raw?.supplier_name ?? raw?.name ?? "—"),
        terms: String(raw?.payment_terms ?? raw?.delivery_terms ?? ""),
        apBalance: Number(raw?.apBalance ?? raw?.ap_balance ?? 0) || 0,
    };
}

function normalizeBranch(raw: RawBranch) {
    return {
        id: String(raw?.id ?? ""),
        code: String(raw?.branch_code ?? ""),
        name: String(raw?.branch_name ?? raw?.branch_description ?? "—"),
    };
}

function normalizeDiscountType(raw: RawDiscountType): DiscountType {
    const id = String(raw?.id ?? "");
    const name = String(raw?.discount_type ?? raw?.name ?? "No Discount");
    const percent = Number.parseFloat(String(raw?.total_percent ?? "0")) || 0;
    return { id, name, percent };
}

function formatDateToday() {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/**
 * ✅ BOX conversion rules:
 * - if baseUomId === 11 (BOX): price is already per box. DO NOT multiply.
 * - else:
 *   piecesPerBaseUnit = unit_of_measurement_count (ex: pack=10 pcs)
 *   piecesPerBox = parse from name/description (ex: x48)
 *   baseUnitsPerBox = piecesPerBox / piecesPerBaseUnit (ex: 200/10=20 packs)
 *   pricePerBox = baseUnitPrice * baseUnitsPerBox
 */
function normalizeProduct(
    raw: RawProduct,
    fixedDiscountTypeId: string
): Product {
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
    const piecesPerBaseUnit = Math.max(1, Number.isFinite(baseUomCountRaw) ? baseUomCountRaw : 1);

    // parse pieces-per-box from text (ignore weights)
    const piecesPerBoxParsed = deriveUnitsPerBoxFromText(
        name,
        String(raw?.description ?? raw?.short_description ?? ""),
        baseUomId === BOX_UOM_ID ? piecesPerBaseUnit : 0
    );

    // final price per BOX
    let pricePerBox = baseUnitPrice;
    let piecesPerBox = 1;
    let baseUnitsPerBox = 1;

    if (baseUomId === BOX_UOM_ID) {
        // ✅ already a BOX product
        pricePerBox = baseUnitPrice;
        // for display/reference: how many pcs inside the box
        piecesPerBox = Math.max(1, piecesPerBaseUnit || piecesPerBoxParsed || 1);
        baseUnitsPerBox = 1;
    } else {
        piecesPerBox = Math.max(1, piecesPerBoxParsed || 0);

        // base units per box (packs/ties/pieces needed to complete 1 box)
        baseUnitsPerBox = piecesPerBox > 0 ? piecesPerBox / piecesPerBaseUnit : 1;
        if (!Number.isFinite(baseUnitsPerBox) || baseUnitsPerBox <= 0) baseUnitsPerBox = 1;

        pricePerBox = baseUnitPrice * baseUnitsPerBox;
    }

    return {
        id,
        name,
        sku,
        category,

        // ✅ everything becomes BOX
        price: pricePerBox,
        uom: "BOX",
        uomId: BOX_UOM_ID,
        availableUoms: ["BOX"],

        // keep reference fields (useful for audit / saving)
        baseUnitPrice,
        baseUomId,
        unitsPerBox: piecesPerBox,        // pcs per box
        baseUnitsPerBox,                 // packs/ties/pieces per box (for pack conversion)
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
        <div className="space-y-1.5 min-w-[280px]">
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Supplier
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-11 rounded-xl"
                        disabled={props.disabled}
                    >
                        <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-xs font-bold">
                {props.value?.name ?? "Select supplier"}
              </span>
                            {props.value?.id ? (
                                <Badge variant="secondary" className="text-[10px] font-black">
                                    ID: {props.value.id}
                                </Badge>
                            ) : null}
                        </div>
                        <ChevronDown className="w-4 h-4 opacity-60" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0 w-[420px] max-w-[92vw]" align="start">
                    <Command>
                        <CommandInput placeholder="Search supplier..." />
                        <CommandList>
                            <CommandEmpty>No supplier found.</CommandEmpty>
                            <CommandGroup heading="Suppliers">
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
                                                        "h-5 w-5 rounded-full border flex items-center justify-center",
                                                        selected
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-background"
                                                    )}
                                                >
                                                    {selected ? <Check className="w-3 h-3" /> : null}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold truncate">{s.name}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate">
                                                        A/P: {s.apBalance.toLocaleString()}
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="text-[10px] font-black">
                                                    {s.id}
                                                </Badge>
                                            </div>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {props.value ? (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            A/P Balance:{" "}
              <span className="font-bold text-foreground">
              {props.value.apBalance.toLocaleString()}
            </span>
          </span>
                    <button
                        type="button"
                        onClick={() => props.onChange(null)}
                        className="inline-flex items-center gap-1 hover:text-destructive"
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
        <div className="space-y-1.5 flex-1 min-w-[320px]">
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Delivery Branches
            </div>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-11 rounded-xl"
                        disabled={props.disabled}
                    >
                        <span className="truncate text-xs font-bold">{label}</span>
                        <ChevronDown className="w-4 h-4 opacity-60" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0 w-[520px] max-w-[92vw]" align="start">
                    <Command>
                        <CommandInput placeholder="Search branch..." />
                        <CommandList>
                            <CommandEmpty>No branch found.</CommandEmpty>

                            <CommandGroup heading="Actions">
                                <CommandItem
                                    value="__all__"
                                    onSelect={() => {
                                        const all = props.branches.map((b) => b.id);
                                        props.onChange(all);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 opacity-70" />
                                        <span className="text-xs font-black uppercase tracking-wider">
                      Select All
                    </span>
                                    </div>
                                </CommandItem>

                                <CommandItem value="__clear__" onSelect={() => props.onChange([])}>
                                    <div className="flex items-center gap-2 text-destructive">
                                        <X className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-wider">
                      Clear
                    </span>
                                    </div>
                                </CommandItem>
                            </CommandGroup>

                            <Separator />

                            <CommandGroup heading="Branches">
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
                                                        "h-5 w-5 rounded border flex items-center justify-center",
                                                        isOn
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-background"
                                                    )}
                                                >
                                                    {isOn ? <Check className="w-3 h-3" /> : null}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-black truncate">{b.code}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate">
                                                        {b.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
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

    const poNumber = "DRAFT-PO";
    const poDate = React.useMemo(() => formatDateToday(), []);

    const discountTypeById = React.useMemo(() => {
        const m = new Map<string, DiscountType>();
        for (const d of discountTypes) m.set(String(d.id), d);
        return m;
    }, [discountTypes]);

    const defaultNoDiscountId = React.useMemo(() => {
        const byName = discountTypes.find((d) => d.name?.toLowerCase() === "no discount");
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

    // ✅ supplier change: fetch products + product_per_supplier links then merge discountTypeId
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

                setAllProducts(
                    (rawProducts ?? []).map((rp: any) => {
                        const pid = String(rp?.product_id ?? rp?.id ?? "");
                        const fixedDiscountTypeId = discountByProductId.get(pid) || defaultNoDiscountId || FALLBACK_NO_DISCOUNT_ID;
                        return normalizeProduct(rp, fixedDiscountTypeId);
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
            setPickerBranchId(branchId);

            setTempCart(
                (branch?.items ?? []).map((it: any) => ({
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
                    orderQty: 1, // 1 BOX
                    selectedUom: "BOX",
                    uom: "BOX",
                    uomId: BOX_UOM_ID,
                    // ✅ fixed discount from product_per_supplier mapping
                    discountTypeId: String((p as any).discountTypeId || defaultNoDiscountId || FALLBACK_NO_DISCOUNT_ID),
                } as any;

                return [...prev, item];
            });
        },
        [defaultNoDiscountId]
    );

    // keep for compatibility (UI removed; forced BOX)
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
        setPickerOpen(false);
    }, [pickerBranchId, tempCart, defaultNoDiscountId]);

    // Summary
    const allItemsFlat = React.useMemo(() => {
        return allocations.flatMap((b) => b.items.map((item) => ({ branchName: b.branchName, item })));
    }, [allocations]);

    const subtotal = React.useMemo(() => {
        return allItemsFlat.reduce((sum, x) => sum + Number(x.item.price || 0) * Number(x.item.orderQty || 0), 0);
    }, [allItemsFlat]);

    // ✅ discount FIXED (dt.percent if >0 else derive from code like L10/5)
    const discount = React.useMemo(() => {
        return allItemsFlat.reduce((sum, x) => {
            const item: any = x.item;
            const gross = Number(item.price || 0) * Number(item.orderQty || 0);

            const id = String(item.discountTypeId || defaultNoDiscountId || "");
            const dt = id ? discountTypeById.get(id) : undefined;

            const code = String(dt?.name ?? "");
            const pct =
                Number(dt?.percent ?? 0) > 0
                    ? Number(dt?.percent)
                    : deriveDiscountPercentFromCode(code);

            return sum + gross * (pct / 100);
        }, 0);
    }, [allItemsFlat, discountTypeById, defaultNoDiscountId]);

    const taxableBase = Math.max(0, subtotal - discount);
    const tax = taxableBase * 0.12; // VAT 12%
    const total = taxableBase + tax;

    const canSave = Boolean(selectedSupplier?.id) && allItemsFlat.length > 0;

    const onSave = React.useCallback(() => {
        // ✅ if you already added provider.createPurchaseOrder(), switch to that here.
        // For now, keeping your log but with correct payload shape.
        console.log("SAVE PO", {
            poNumber,
            poDate,
            supplierId: selectedSupplier?.id ?? null,
            branches: allocations,
            subtotal,
            discount,
            vat: tax,
            total,
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
        });

        // Example (enable kapag ready na route mo):
        // void (async () => {
        //   await provider.createPurchaseOrder({
        //     poNumber,
        //     poDate,
        //     supplierId: selectedSupplier?.id,
        //     allocations,
        //     subtotal,
        //     discount,
        //     vat: tax,
        //     total,
        //     items: allItemsFlat.map((x) => ({
        //       branchName: x.branchName,
        //       productId: (x.item as any).id,
        //       qtyBoxes: (x.item as any).orderQty,
        //       uomId: BOX_UOM_ID,
        //       pricePerBox: (x.item as any).price,
        //       pcsPerBox: (x.item as any).unitsPerBox ?? 1,
        //       discountTypeId: (x.item as any).discountTypeId ?? null,
        //     })),
        //   });
        // })();
    }, [poNumber, poDate, selectedSupplier, allocations, subtotal, discount, tax, total, allItemsFlat]);

    const pickerBranchLabel = React.useMemo(() => {
        const b = allocations.find((x) => x.branchId === pickerBranchId);
        return b?.branchName ?? "Branch";
    }, [allocations, pickerBranchId]);

    return (
        <div className="w-full min-w-0 space-y-6">
            <div className="space-y-1">
                <div className="text-xl font-black text-foreground">Create Purchase Order</div>
                <div className="text-sm text-muted-foreground">
                    Configure your supplier and branch allocations below.
                </div>
            </div>

            <Separator />

            <div className="flex flex-col lg:flex-row gap-4 w-full min-w-0">
                <SupplierSelect
                    suppliers={suppliers}
                    value={selectedSupplier}
                    onChange={(s) => {
                        setSelectedSupplier(s);
                        setAllocations([]);
                        setSelectedBranchIds([]);
                    }}
                    disabled={isLoading}
                />

                <BranchMultiSelect
                    branches={branches}
                    value={selectedBranchIds}
                    onChange={setSelectedBranchIds}
                    disabled={isLoading}
                />

                <div className="flex items-end gap-2">
                    <Button type="button" variant="outline" className="h-11 rounded-xl" disabled>
                        <Search className="w-4 h-4 mr-2" />
                        {isLoading ? "Loading…" : "Ready"}
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <BranchAllocations
                branches={allocations}
                canAddProducts={canAddProducts}
                onRemoveBranch={removeBranch}
                onOpenPicker={openPicker}
                onUpdateQty={updateQty}
                onRemoveItem={removeItem}
                discountTypes={discountTypes} // display only
            />

            <PurchaseOrderSummary
                visible={selectedBranchIds.length > 0}
                poNumber={poNumber}
                poDate={poDate}
                supplier={selectedSupplier}
                branches={allocations}
                allItemsFlat={allItemsFlat}
                subtotal={subtotal}
                discount={discount}
                tax={tax}
                total={total}
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
                onUpdateTempUom={updateTempUom} // locked to BOX
                onRemoveFromTemp={removeFromTemp}
                onUpdateTempQty={updateTempQty}
                onConfirm={confirmPicker}
            />
        </div>
    );
}
