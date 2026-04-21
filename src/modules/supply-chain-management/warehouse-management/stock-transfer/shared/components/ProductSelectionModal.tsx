'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Loader2, Package, CheckCircle2, Trash2 } from 'lucide-react';
import { EnrichedProduct } from '../../types/stock-transfer.types';
import { QuantityStepper } from './QuantityStepper';

interface ProductSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: EnrichedProduct) => void;
  sourceBranch?: string;
  selectedProducts?: EnrichedProduct[];
  onUpdateQty?: (productId: number, qty: number) => void;
  onRemoveItem?: (productId: number) => void;
}

export function ProductSelectionModal({ open, onOpenChange, onSelect, sourceBranch, selectedProducts = [], onUpdateQty, onRemoveItem }: ProductSelectionModalProps) {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch products
  useEffect(() => {
    if (!open) return;
    
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const query = search ? `&search=${encodeURIComponent(search)}` : '';
        const branchQuery = sourceBranch ? `&branch_id=${sourceBranch}` : '';
        const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=products${query}${branchQuery}`);
        if (!res.ok) throw new Error('Failed to fetch products');
        const json = await res.json();
        if (active) {
          setProducts(json.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch products for modal:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, search, sourceBranch]);

  const handleSelect = (product: EnrichedProduct) => {
    onSelect(product);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none w-[90vw] 2xl:w-[1400px] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl">
        <div className="flex flex-1 overflow-hidden">
          {/* CATALOG SECTION */}
          <div className="flex-1 flex flex-col min-w-0">
            <DialogHeader className="p-6 border-b border-border bg-card">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Master Inventory Catalog
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground uppercase font-bold tracking-widest opacity-60">
                    Select products from Master SKU for this transfer.
                  </DialogDescription>
                </div>
                <Button 
                  size="sm"
                  variant="default"
                  onClick={() => onOpenChange(false)}
                  className="font-bold text-xs h-9 shadow-none rounded-lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Selection
                </Button>
              </div>
              
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input
                  placeholder="Filter catalog by name, code, or brand..."
                  className="pl-10 h-10 bg-background border-border shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-sm rounded-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 bg-muted/5 scrollbar-hide">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all">Fetching Catalog...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground opacity-30">
                  <Package className="w-12 h-12" />
                  <p className="text-sm font-bold uppercase tracking-widest leading-none">Catalog is Empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                  {products.map((product) => (
                    <div 
                      key={product.product_id}
                      className="group relative bg-background border border-border/60 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all duration-300 flex flex-col"
                    >
                      <div className="aspect-square bg-muted/30 flex items-center justify-center relative">
                        <div className="text-2xl font-black text-muted-foreground/10 group-hover:scale-110 transition-transform duration-500 font-mono">
                          {product.product_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="absolute top-2 left-2">
                          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[8px] font-black tracking-widest uppercase border-border/50">
                            {typeof product.product_brand === 'object' && product.product_brand !== null 
                              ? (product.product_brand as { brand_name?: string }).brand_name 
                              : product.product_brand || 'GENERIC'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-3 flex-1 flex flex-col gap-3">
                        <div className="space-y-1.5 flex-1">
                          <h3 className="font-bold text-xs line-clamp-2 leading-[1.3] text-foreground/90 font-sans group-hover:text-primary transition-colors">
                            {product.product_name}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                             <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-mono">
                              <span>ID: {product.product_id}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-primary/70 font-bold uppercase tracking-tighter">
                              <Package className="w-2.5 h-2.5" />
                              <span>{typeof product.unit_of_measurement === 'object' && product.unit_of_measurement !== null ? (product.unit_of_measurement as { unit_name?: string }).unit_name : String(product.unit_of_measurement || 'PCS')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <div className="text-xs font-black text-primary font-mono bg-primary/5 px-2 py-0.5 rounded">
                            ₱{Number((product as { cost_per_unit?: number }).cost_per_unit || 0).toLocaleString()}
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-[10px] font-black uppercase tracking-widest hov hover:bg-primary/10 hover:text-primary rounded-md"
                            onClick={() => handleSelect(product)}
                          >
                            SELECT
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SIDE CART */}
          <div className="w-72 border-l border-border bg-muted/10 flex flex-col hidden lg:flex">
            <div className="p-6 border-b border-border bg-card">
              <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                <ShoppingCart className="w-4 h-4 text-primary" />
                DRAFT LIST
                <Badge variant="secondary" className="ml-auto font-mono text-[10px] bg-primary/10 text-primary border-none">{selectedProducts.length}</Badge>
              </h3>
            </div>
            <ScrollArea className="flex-1 min-h-0 bg-card/40">
              <div className="p-3 space-y-2">
                {selectedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-20 filter grayscale">
                    <ShoppingCart className="w-10 h-10 mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">List is empty</p>
                  </div>
                ) : (
                  selectedProducts.map((p, idx) => {
                    const pid = p.product_id;
                    const uom = typeof p.unit_of_measurement === 'object' && p.unit_of_measurement !== null 
                      ? (p.unit_of_measurement as { unit_name?: string }).unit_name 
                      : (p.unit_of_measurement || 'PCS');
                    const qty = (p as EnrichedProduct & { quantity?: number }).quantity || 1;

                    return (
                      <div key={idx} className="bg-background border border-border/40 rounded-lg p-2.5 hover:border-primary/30 transition-all group/item shadow-none">
                        <div className="flex items-start justify-between gap-1.5 mb-2">
                          <p className="text-[10px] font-bold line-clamp-2 leading-tight flex-1 text-foreground/80">{p.product_name}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground/30 hover:text-destructive hover:bg-transparent -mt-1 -mr-1"
                            onClick={() => onRemoveItem?.(Number(pid))}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                           <QuantityStepper 
                             value={qty}
                             max={9999}
                             onChange={(val) => onUpdateQty?.(Number(pid), val)}
                             className="h-7 w-fit"
                             size="sm"
                           />
                          <div className="flex flex-col items-end">
                            <span className="font-black text-primary text-[11px] font-mono tracking-tighter">₱{Number((p as { totalAmount?: number }).totalAmount || (p as { cost_per_unit?: number }).cost_per_unit || 0).toLocaleString()}</span>
                            <span className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest">{uom}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {selectedProducts.length > 0 && (
              <div className="p-4 border-t border-border bg-card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Estimated Total</span>
                  <span className="text-sm font-black text-primary font-mono tracking-tighter">
                    ₱{selectedProducts.reduce((sum, p) => sum + Number((p as { totalAmount?: number }).totalAmount || (p as { cost_per_unit?: number }).cost_per_unit || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
