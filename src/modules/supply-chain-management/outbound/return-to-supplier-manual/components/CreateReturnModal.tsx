"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  X,
  Package,
  Loader2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReturnCreationData } from "../hooks/useReturnCreationData";
import { createTransaction } from "../providers/fetchProviders";
import { ProductPicker } from "./ProductPicker";
import { ReturnReviewPanel } from "./ReturnReviewPanel";
import { calculateLineItem } from "../utils/calculations";
import { validateBarcode } from "../utils/barcodeUtils";
import { useGlobalScanner } from "../hooks/useGlobalScanner";
import type { CartItem, InventoryRecord } from "../types/rts.schema";

export function CreateReturnModal({
  isOpen,
  onClose,
  onReturnCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onReturnCreated: () => void;
}) {
  const {
    refs,
    inventory,
    loadInventory,
    isLoading: isLoadingInventory,
  } = useReturnCreationData(isOpen);


  const [selection, setSelection] = useState({
    supplierId: "",
    branchId: "",
    remarks: "",
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [openSupplier, setOpenSupplier] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");



  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return refs.suppliers;
    return refs.suppliers.filter((s) =>
      s.supplier_name.toLowerCase().includes(supplierSearch.toLowerCase()),
    );
  }, [refs.suppliers, supplierSearch]);

  const filteredBranches = useMemo(() => {
    if (!branchSearch) return refs.branches;
    return refs.branches.filter((b) =>
      b.branch_name.toLowerCase().includes(branchSearch.toLowerCase()),
    );
  }, [refs.branches, branchSearch]);

  /**
   * Groups the flat inventory records into product families for the picker.
   * Enriches each variant with supplier discount from reference data.
   * The view already provides: product_name, unit_name, unit_count,
   * running_inventory (floored, remainder cascaded), price.
   */
  const groupedProducts = useMemo(() => {
    if (inventory.length === 0) return [];

    // Build connection + discount maps for enrichment
    const connectionMap = new Map<string, (typeof refs.connections)[0]>();
    refs.connections.forEach((c) =>
      connectionMap.set(`${c.product_id}-${c.supplier_id}`, c),
    );

    const discountMap = new Map<string, (typeof refs.lineDiscounts)[0]>();
    refs.lineDiscounts.forEach((d) => discountMap.set(String(d.id), d));

    const discountTypeMap = new Map<string, any>();
    refs.discountTypes.forEach((dt) => discountTypeMap.set(String(dt.id), dt));

    const linePerDiscountMap = new Map<string, number[]>();
    refs.linePerDiscountType.forEach((lpd) => {
      const typeId = String(lpd.type_id);
      if (!linePerDiscountMap.has(typeId)) linePerDiscountMap.set(typeId, []);
      linePerDiscountMap.get(typeId)?.push(Number(lpd.line_id));
    });

    // Build unit order map (unit_name/shortcut -> order) for filtering
    const unitOrderMap = new Map<string, number>();
    refs.units.forEach((u) => {
      unitOrderMap.set(u.unit_name, u.order);
      unitOrderMap.set(u.unit_shortcut, u.order);
    });

    // Enrich inventory records
    const enrichedItems = inventory
      .map((item: InventoryRecord) => {
        const connection = connectionMap.get(
          `${item.product_id}-${selection.supplierId}`,
        );

        let discountLabel: string | undefined;
        let computedDiscount = 0;
        let currentDiscountTypeId: number | undefined;

        if (connection?.discount_type) {
          const discountTypeObj = discountTypeMap.get(String(connection.discount_type));
          if (discountTypeObj) {
            currentDiscountTypeId = discountTypeObj.id;
            discountLabel = discountTypeObj.discount_type_name ||
              discountTypeObj.discount_type ||
              discountTypeObj.name;
            
            // Resolve to first percentage found in junction
            const lineIds = linePerDiscountMap.get(String(discountTypeObj.id));
            if (lineIds && lineIds.length > 0) {
              const lineDiscountObj = discountMap.get(String(lineIds[0]));
              if (lineDiscountObj) {
                computedDiscount = parseFloat(lineDiscountObj.percentage) / 100;
              }
            }
          }
        }

        const matchedUnit = refs.units.find(
          (u) => u.unit_name === item.unit_name,
        );

        return {
          id: String(item.product_id), // Search ID (for quantity increment logic)
          product_id: item.product_id,
          masterId: String(item.familyId),
          code: item.product_code || "N/A",
          name: item.product_name,
          unit: item.unit_name,
          unitCount: item.unit_count,
          stock: item.running_inventory,
          price: item.price,
          uom_id: matchedUnit?.unit_id || 0,
          discountType: discountLabel,
          supplierDiscount: computedDiscount,
          discountTypeId: currentDiscountTypeId,
        };
      })
      // Filter: only products with stock > 0
      .filter((p) => Number(p.stock ?? 0) > 0);

    interface VariantItem {
      id: string;
      masterId: string;
      code: string;
      name: string;
      unit: string;
      unitCount: number;
      stock: number;
      price: number;
      uom_id: number;
      discountType?: string;
      supplierDiscount: number;
      discountTypeId?: number;
    }

    // Group by familyId
    const groups: Record<string, {
      masterId: string;
      masterCode: string;
      masterName: string;
      variants: VariantItem[];
    }> = {};

    enrichedItems.forEach((item) => {
      const groupKey = item.masterId;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          masterId: groupKey,
          masterCode: item.code,
          masterName: item.name,
          variants: [],
        };
      }
      groups[groupKey].variants.push(item);
    });

    return Object.values(groups).map((group) => {
      // Propagate parent discount to children missing it
      const parentDiscount = group.variants.find(
        (v) => v.supplierDiscount > 0 || v.discountType,
      );

      if (parentDiscount) {
        group.variants = group.variants.map((v) => ({
          ...v,
          supplierDiscount:
            v.supplierDiscount || parentDiscount.supplierDiscount,
          discountType: v.discountType || parentDiscount.discountType,
          discountTypeId: v.discountTypeId || parentDiscount.discountTypeId,
        }));
      }

      // Sort: smallest unit first for naming, then largest first for display
      group.variants.sort((a, b) => a.unitCount - b.unitCount);
      if (group.variants.length > 0) {
        group.masterName = group.variants[0].name;
      }
      group.variants.sort((a, b) => b.unitCount - a.unitCount);

      return group;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, refs.connections, refs.lineDiscounts, refs.units, selection.supplierId]);

  useEffect(() => {
    if (selection.supplierId && selection.branchId) {
      loadInventory(Number(selection.branchId), Number(selection.supplierId));
    }
  }, [selection.supplierId, selection.branchId, loadInventory]);



  const addToCart = useCallback((p_raw: unknown, qty = 1) => {
    const p = p_raw as CartItem;
    setCart((prev) => {
      const exists = prev.find((i) => String(i.id) === String(p.id) && i.uom_id === p.uom_id);
      if (exists)
        return prev.map((i) =>
          String(i.id) === String(p.id) && i.uom_id === p.uom_id
            ? { ...i, quantity: i.quantity + qty }
            : i,
        );
      return [
        ...prev,
        {
          ...p,
          cartId: Math.random().toString(36).substring(2, 15),
          quantity: qty,
          onHand: p.stock ?? 0,
          discount: (p.supplierDiscount || 0),
          discountTypeId: p.discountTypeId,
          customPrice: p.price,
        } as CartItem,
      ];
    });
  }, []);

  /**
   * Handles Barcode scan: finds the product in current inventory/references → adds to cart.
   * Logic enforces that the product must belong to the selected supplier and branch.
   */
  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      if (!barcode.trim()) return;
      if (!selection.branchId || !selection.supplierId) {
        toast.error("Please select Supplier and Branch first.");
        return;
      }

      const validation = validateBarcode(barcode);
      if (!validation.isValid) {
        toast.error("Barcode Error", { description: validation.error });
        return;
      }

      // Find product in LOADED inventory (which is already filtered by Supplier + Branch)
      let invRecord = inventory.find((r) => r.product_barcode === barcode);
      
      // Fallback: search by product_code if barcode matches a code (sometimes used interchangeably in some systems)
      if (!invRecord) {
        invRecord = inventory.find((r) => r.product_code === barcode);
      }

      if (!invRecord) {
        toast.error("Product Not Found", {
          description: `Barcode "${barcode}" does not match any stock items for the selected Supplier and Branch.`,
        });
        return;
      }

      // Match UOM
      const matchedUnit = refs.units.find((u) => u.unit_name === invRecord!.unit_name);
      if (!matchedUnit) {
        toast.error("UOM Error", { description: `Could not resolve UOM for unit "${invRecord!.unit_name}"` });
        return;
      }

      const connection = refs.connections.find(
        (c) => c.product_id === invRecord!.product_id && c.supplier_id === Number(selection.supplierId),
      );

      let computedDiscount = 0;
      let currentDiscountTypeId: number | undefined;

      if (connection?.discount_type) {
        const discountTypeObj = refs.discountTypes.find(
          (dt) => dt.id === connection.discount_type
        );
        if (discountTypeObj) {
          currentDiscountTypeId = discountTypeObj.id;
          
          const junctions = refs.linePerDiscountType.filter(
            (lpd) => lpd.type_id === discountTypeObj.id
          );
          if (junctions.length > 0) {
            const lineDiscountObj = refs.lineDiscounts.find(
              (ld) => ld.id === junctions[0].line_id
            );
            if (lineDiscountObj) {
              computedDiscount = parseFloat(lineDiscountObj.percentage) / 100;
            }
          }
        }
      }

      // Add to cart
      addToCart({
        id: String(invRecord!.product_id), // Standard Identity
        cartId: Math.random().toString(36).substring(2, 15),
        code: invRecord!.product_code,
        name: invRecord!.product_name,
        unit: invRecord!.unit_name,
        unitCount: invRecord!.unit_count,
        stock: invRecord!.running_inventory,
        price: invRecord!.price,
        uom_id: matchedUnit.unit_id,
        supplierDiscount: computedDiscount,
        discountTypeId: currentDiscountTypeId,
      }, 1);

      toast.success("Barcode Scanned", {
        description: `Added "${invRecord.product_name}"`,
      });
    },
    [selection.branchId, selection.supplierId, inventory, addToCart, refs.units],
  );

  /**
   * GLOBAL SCAN CAPTURE: Routes barcode scans to the handler.
   */
  useGlobalScanner({
    enabled: isOpen && !showPicker,
    onScan: (val) => {
      handleBarcodeScan(val);
    }
  });

  const updateCart = (cartId: string, field: keyof CartItem, val: any) => {
    setCart((prev) =>
      prev.map((i) => ((i.cartId || i.id) === cartId ? { ...i, [field]: val } : i)),
    );
  };

  const handleCloseFull = () => {
    setSelection({ supplierId: "", branchId: "", remarks: "" });
    setCart([]);
    setShowPicker(false);
    onClose();
  };

  const handleSubmit = async () => {
    // Validate: supplier and branch must be selected
    if (!selection.supplierId || !selection.branchId) {
      toast.error("Validation Error", {
        description: "Please select a Supplier and Branch before confirming.",
      });
      return;
    }

    // Validate: cart must not be empty
    if (cart.length === 0) {
      toast.error("Validation Error", {
        description: "Please add at least one product to return.",
      });
      return;
    }

    // Validate: all items must have a return type
    const missingReturnType = cart.some((item) => !item.return_type_id);
    if (missingReturnType) {
      toast.error("Validation Error", {
        description:
          "Please select a 'Return Type' for all items before confirming.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const rts_items = cart.map((item) => {
        const { gross, discountAmount, net } = calculateLineItem(item);
        return {
          product_id: Number(item.product_id), // Clean mapping
          uom_id: item.uom_id || 1,
          quantity: item.quantity * (item.unitCount || 1),
          gross_unit_price: item.customPrice || item.price,
          gross_amount: gross,
          discount_rate: item.discount * 100,
          discount_amount: discountAmount,
          net_amount: net,
          item_remarks: "",
          return_type_id: item.return_type_id || null,
          discount_type_id: item.discountTypeId || null,
        };
      });

      await createTransaction({
        supplier_id: Number(selection.supplierId),
        branch_id: Number(selection.branchId),
        transaction_date: new Date().toISOString().split("T")[0],
        is_posted: 0,
        remarks: selection.remarks,
        rts_items,
      });

      toast.success("Success", {
        description: "Return transaction created successfully.",
      });
      onReturnCreated();
      handleCloseFull();
    } catch (err: unknown) {
      toast.error("Error", {
        description: (err as { message?: string })?.message || "Failed to create return transaction.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getModalWidth = () => {
    if (showPicker) return "w-[98vw] !max-w-[90vw] h-[95vh]";
    return "w-[95vw] !max-w-[1300px] h-[80vh]";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseFull()}>
      <DialogContent
        className={`p-0 overflow-hidden gap-0 ${getModalWidth()} border-none shadow-2xl [&>button]:hidden transition-all duration-300`}
      >
        <DialogHeader className="px-6 py-5 border-b flex flex-row items-center justify-between bg-background z-20 shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {showPicker ? (
              <>
                <div className="bg-primary/10 p-2 rounded-lg">
                   <Plus className="h-5 w-5 text-primary" />
                </div>
                Add Products
              </>
            ) : (
              "Create Return"
            )}
          </DialogTitle>
          <button
            onClick={showPicker ? () => setShowPicker(false) : handleCloseFull}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground p-2 rounded-md shadow-sm transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <div
          className={`${showPicker ? "overflow-hidden h-[calc(95vh-70px)]" : "overflow-y-auto p-8 max-h-[85vh] bg-muted/30"}`}
        >
          {showPicker ? (
            <ProductPicker
              isVisible={true}
              onClose={() => setShowPicker(false)}
              products={groupedProducts}
              addedProducts={cart}
              onAdd={addToCart}
              onRemove={(cartId) => setCart((c) => c.filter((i) => (i.cartId || i.id) !== cartId))}
              onUpdateQty={(cartId, q) => updateCart(cartId, "quantity", q)}
              onClearAll={() => setCart([])}
              onBarcodeScan={handleBarcodeScan}
              isLoading={isLoadingInventory}
            />
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-card p-6 rounded-xl border shadow-sm">
                {/* Supplier Select */}
                <div className="space-y-2 flex flex-col">
                  <Label className="text-xs font-bold uppercase">
                    Supplier *
                  </Label>
                  <Popover
                    open={openSupplier}
                    onOpenChange={setOpenSupplier}
                    modal={true}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full h-11 justify-between bg-muted/50"
                      >
                        {selection.supplierId
                          ? refs.suppliers.find(
                              (s) => String(s.id) === selection.supplierId,
                            )?.supplier_name
                          : "Select Supplier..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search supplier..."
                          value={supplierSearch}
                          onValueChange={setSupplierSearch}
                        />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandGroup>
                            {filteredSuppliers.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={String(s.id)}
                                onSelect={() => {
                                  setSelection((prev) => ({
                                    ...prev,
                                    supplierId: String(s.id),
                                  }));
                                  setCart([]);
                                  setOpenSupplier(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selection.supplierId === String(s.id)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {s.supplier_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Branch Select */}
                <div className="space-y-2 flex flex-col">
                  <Label className="text-xs font-bold uppercase">
                    Branch *
                  </Label>
                  <Popover
                    open={openBranch}
                    onOpenChange={setOpenBranch}
                    modal={true}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full h-11 justify-between bg-muted/50"
                      >
                        {selection.branchId
                          ? refs.branches.find(
                              (b) => String(b.id) === selection.branchId,
                            )?.branch_name
                          : "Select Branch..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search branch..."
                          value={branchSearch}
                          onValueChange={setBranchSearch}
                        />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandGroup>
                            {filteredBranches.map((b) => (
                              <CommandItem
                                key={b.id}
                                value={String(b.id)}
                                onSelect={() => {
                                  setSelection((prev) => ({
                                    ...prev,
                                    branchId: String(b.id),
                                  }));
                                  setCart([]);
                                  setOpenBranch(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selection.branchId === String(b.id)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {b.branch_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Cart Section */}
              {selection.supplierId && selection.branchId ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold flex items-center gap-2">
                       <Package className="h-4 w-4 text-primary" /> Items
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowPicker(true)}
                        className="h-9 text-xs"
                      >
                        <Plus className="mr-2 h-3 w-3" /> Add
                      </Button>
                    </div>
                  </div>
                  {cart.length > 0 ? (
                    <ReturnReviewPanel
                      items={cart}
                      lineDiscounts={refs.lineDiscounts}
                      discountTypes={refs.discountTypes}
                      linePerDiscountType={refs.linePerDiscountType}
                      returnTypes={refs.returnTypes || []}
                      onUpdateItem={updateCart}
                      onRemoveItem={(cartId) =>
                        setCart((c) => c.filter((i) => (i.cartId || i.id) !== cartId))
                      }
                      remarks={selection.remarks}
                      setRemarks={(r) =>
                        setSelection((s) => ({ ...s, remarks: r }))
                      }
                      readOnly={false}
                    />
                  ) : (
                    <div className="border-2 border-dashed h-32 flex items-center justify-center text-muted-foreground text-sm">
                      No items selected
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed h-32 flex items-center justify-center text-muted-foreground text-sm">
                  Please select Supplier and Branch first.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!showPicker && (
          <DialogFooter className="px-8 py-5 border-t bg-background shrink-0">
            <Button
              variant="outline"
              onClick={handleCloseFull}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !selection.supplierId ||
                !selection.branchId ||
                cart.length === 0
              }
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submitting ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                "Confirm Return"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
