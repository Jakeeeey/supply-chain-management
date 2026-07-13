import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Package, Minus, Plus, Tag } from "lucide-react";
import { StockAdjustmentProduct, StockAdjustmentItem } from "../../types/stock-adjustment.schema";

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierName: string;
  branchName: string;
  products: StockAdjustmentProduct[];
  isLoading: boolean;
  rfidProductIds: Set<number>;
  initialSelectedItems: StockAdjustmentItem[];
  onConfirm: (items: StockAdjustmentItem[]) => void;
}

export function ProductSelectionModal({
  isOpen,
  onClose,
  supplierName,
  branchName,
  products,
  isLoading,
  initialSelectedItems,
  onConfirm,
}: ProductSelectionModalProps) {
  const [catalogSearch, setCatalogSearch] = useState("");
  const [cartItems, setCartItems] = useState<StockAdjustmentItem[]>(initialSelectedItems || []);

  const filteredProducts = useMemo(() => {
    if (!catalogSearch.trim()) return products;
    const t = catalogSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.product_name?.toLowerCase().includes(t) ||
        p.product_code?.toLowerCase().includes(t) ||
        p.barcode?.toLowerCase().includes(t)
    );
  }, [products, catalogSearch]);

  const addedProductIds = useMemo(() => {
    const ids = new Set<number>();
    cartItems.forEach((item) => {
      if (item.product_id) ids.add(Number(item.product_id));
    });
    return ids;
  }, [cartItems]);

  const handleAddToCart = (product: StockAdjustmentProduct) => {
    const productId = product.product_id || product.id;
    if (addedProductIds.has(Number(productId))) return;

    const hasRfid = product.unit_of_measurement?.order === 3;

    const newItem: StockAdjustmentItem = {
      product_id: Number(productId),
      product_name: product.product_name,
      product_code: product.product_code,
      quantity: 1,
      branch_id: 0, // Will be set by form
      type: "IN",   // Will be set by form
      cost_per_unit: product.cost_per_unit || product.price_per_unit || 0,
      unit_name: product.unit_name || "pcs",
      brand_name: product.brand_name || "N/A",
      barcode: product.barcode || "N/A",
      description: product.description || "No description available.",
      unit_order: product.unit_of_measurement?.order || 1,
      has_rfid: hasRfid,
      rfid_tags: [],
      rfid_count: 0,
      remarks: "",
    };

    setCartItems([...cartItems, newItem]);
  };

  const handleRemoveFromCart = (productId: number) => {
    setCartItems(cartItems.filter((item) => Number(item.product_id) !== productId));
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCartItems(
      cartItems.map((item) => {
        if (Number(item.product_id) === productId) {
          const newQty = Math.max(1, (item.quantity || 1) + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.cost_per_unit || 0);
    }, 0);
  }, [cartItems]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] w-[1400px] h-[90vh] max-h-[1000px] p-0 overflow-hidden flex flex-col bg-background border-none shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between shrink-0 bg-card">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              Add Products to {(branchName || "Selected Branch").toUpperCase()}
            </DialogTitle>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              SUPPLIER: <span className="text-primary">{supplierName || "Selected Supplier"}</span>
            </span>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL - CATALOG */}
          <div className="w-[65%] flex flex-col border-r border-border bg-background">
            <div className="p-4 border-b border-border shrink-0 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by SKU or Product Name..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 h-11 text-xs font-semibold border border-primary/50 rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse border border-border" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    {catalogSearch ? `No products match "${catalogSearch}"` : "No products available from this supplier."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => {
                    const pid = Number(product.product_id || product.id);
                    const isAdded = addedProductIds.has(pid);
                    const isProductRfid = product.unit_of_measurement?.order === 3;
                    
                    return (
                      <div
                        key={pid}
                        className={`flex flex-col bg-card rounded-xl border p-4 transition-all shadow-sm ${
                          isAdded ? "border-primary/50 dark:border-blue-800/40" : "border-border hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 pr-2">
                              {product.product_name}
                            </h3>
                            {isAdded && (
                              <div className="bg-primary text-white rounded-full p-0.5 shrink-0 mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-muted-foreground uppercase mb-3 font-semibold">
                            SKU: {product.product_code || "N/A"}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                            {product.unit_name && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-300 text-green-600 text-[9px] font-bold uppercase shadow-sm bg-green-50 dark:bg-green-950/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                {product.unit_name}
                              </div>
                            )}
                            {isProductRfid && (
                              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-amber-300 text-amber-600 text-[9px] font-bold uppercase shadow-sm bg-amber-50 dark:bg-amber-950/20">
                                <Tag className="h-2.5 w-2.5 fill-amber-500" />
                                RFID
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-auto pt-2 text-center">
                          <div className="text-xl font-bold text-primary mb-0.5">
                            ₱{Number(product.cost_per_unit || product.price_per_unit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] text-muted-foreground uppercase mb-4">/ {product.unit_name || "UNIT"}</div>
                          
                          {isAdded ? (
                            <Button
                              variant="outline"
                              className="w-full h-10 text-[11px] font-bold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 uppercase rounded-md transition-colors"
                              onClick={() => handleRemoveFromCart(pid)}
                            >
                              REMOVE
                            </Button>
                          ) : (
                            <Button
                              className="w-full h-10 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm uppercase rounded-md transition-all duration-250"
                              onClick={() => handleAddToCart(product)}
                            >
                              ADD TO ORDER
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - CART SUMMARY */}
          <div className="w-[35%] flex flex-col bg-muted/5">
            <div className="p-4 border-b border-border shrink-0 flex items-center justify-between bg-card">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                CART SUMMARY
              </div>
              <div className="w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-[11px] font-black rounded-full shadow-sm">
                {cartItems.length}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="p-4 rounded-full border border-dashed border-border mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 text-muted-foreground/30">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">EMPTY CART</p>
                  <p className="text-[11px] text-muted-foreground/70">Select products from the grid to add<br/>them to your order.</p>
                </div>
              ) : (
                cartItems.map((item) => {
                  const pid = Number(item.product_id);
                  const cost = Number(item.cost_per_unit || 0);
                  const qty = item.quantity || 1;
                  const total = cost * qty;
                  const isItemRfid = item.unit_order === 3;
                  
                  return (
                    <div key={pid} className="bg-card rounded-2xl border border-border p-4 shadow-sm relative">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2 pr-4">
                          {item.product_name}
                        </h4>
                      </div>
                      
                      <div className="text-[11px] text-muted-foreground mb-2 font-medium">
                        ₱{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                        {item.unit_name && (
                          <div className="inline-block text-[10px] font-bold uppercase text-green-600 tracking-wide">
                            {item.unit_name}
                          </div>
                        )}
                        {isItemRfid && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-500 tracking-wide">
                            <Tag className="h-2.5 w-2.5 fill-amber-500" />
                            RFID
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        {isItemRfid ? (
                          <div className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 px-2 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm max-w-[170px] select-none">
                            <Tag className="h-3 w-3 text-amber-500 fill-amber-500" />
                            Scan RFID tags in form to change qty
                          </div>
                        ) : (
                          <div className="flex items-center bg-background border border-border rounded-md overflow-hidden h-9 shadow-sm">
                            <button 
                              className="w-9 flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                              onClick={() => handleUpdateQuantity(pid, -1)}
                              disabled={qty <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              value={qty === 0 ? "" : qty}
                              onChange={(e) => {
                                let val = parseInt(e.target.value, 10);
                                if (isNaN(val) || val < 1) val = 1;
                                setCartItems(cartItems.map((cItem) => {
                                  if (Number(cItem.product_id) === pid) {
                                    return { ...cItem, quantity: val };
                                  }
                                  return cItem;
                                }));
                              }}
                              className="w-12 h-9 text-center text-xs font-bold border-x border-border focus:outline-none focus:ring-0 bg-transparent p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              min={1}
                            />
                            <button 
                              className="w-9 flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                              onClick={() => handleUpdateQuantity(pid, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        
                        <div className="text-right flex flex-col justify-end h-9">
                          <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Subtotal</div>
                          <div className="text-sm font-bold text-foreground leading-none">
                            ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-border bg-card shrink-0">
              <div className="flex items-center justify-between mb-4 px-4 py-3 bg-card rounded-xl border border-border shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Grand</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total</span>
                </div>
                <span className="text-xl font-bold text-primary">
                  ₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <Button
                className="w-full h-12 text-xs font-black bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/20 dark:shadow-none uppercase rounded-xl transition-all duration-300 hover:scale-[1.02]"
                disabled={cartItems.length === 0}
                onClick={() => {
                  onConfirm(cartItems);
                  onClose();
                }}
              >
                CONFIRM ORDER
              </Button>
              
              <Button
                variant="ghost"
                className="w-full h-9 text-[10px] font-bold text-muted-foreground hover:text-foreground rounded-lg uppercase tracking-wider mt-1"
                onClick={onClose}
              >
                BACK TO BRANCH
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
