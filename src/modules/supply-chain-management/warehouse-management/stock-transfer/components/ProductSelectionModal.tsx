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
import { Search, ShoppingCart, Loader2, Package, Tag } from 'lucide-react';
import { SKU } from '@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema';

interface ProductSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: SKU) => void;
  sourceBranch?: string;
}

export function ProductSelectionModal({ open, onOpenChange, onSelect, sourceBranch }: ProductSelectionModalProps) {
  const [products, setProducts] = useState<SKU[]>([]);
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
  }, [open, search]);

  const handleSelect = (product: SKU) => {
    onSelect(product);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!sm:max-w-none sm:max-w-[90vw] 2xl:max-w-[1400px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-none shadow-2xl">
        <DialogHeader className="p-8 pb-6 border-b bg-muted/5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <DialogTitle className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
                <ShoppingCart className="w-8 h-8 text-primary" />
                Product Selection Catalog
              </DialogTitle>
              <DialogDescription className="text-base">
                Select products from the master inventory to include in this stock transfer.
              </DialogDescription>
            </div>
          </div>
          
          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
            <Input
              placeholder="Filter by name, barcode, or brand..."
              className="pl-12 h-14 text-lg bg-background border-2 border-muted focus-visible:ring-2 focus-visible:ring-primary/20 transition-all rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 bg-muted/5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading Inventory...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <Package className="w-16 h-16 opacity-10" />
              <p className="text-lg font-medium">No results found for "{search}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 pb-8">
              {products.map((product) => (
                <div 
                  key={product.id || product.product_id}
                  className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-[16/9] bg-muted/30 flex items-center justify-center relative overflow-hidden">
                     {/* Product Initial Placeholder */}
                    <div className="text-4xl font-bold text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500">
                      {product.product_name?.substring(0, 2).toUpperCase()}
                    </div>
                    {/* Badge for Brand if exists */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-[9px] uppercase font-bold tracking-tighter">
                        {typeof product.product_brand === 'object' && product.product_brand !== null 
                          ? (product.product_brand as any).brand_name 
                          : product.product_brand || 'No Brand'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {product.product_name}
                      </h3>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Tag className="w-3 h-3 shrink-0" />
                          <span className="font-mono truncate">{product.barcode || (product as any).product_code || 'NO-BARCODE'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Package className="w-3 h-3 shrink-0 text-primary/60" />
                          <span className="font-bold text-primary/80">
                            Available: { (product as any).qtyAvailable || 0 } {typeof product.unit_of_measurement === 'object' && product.unit_of_measurement !== null ? (product.unit_of_measurement as any).unit_name : 'Pieces'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-auto">
                      <div className="text-xs font-bold text-primary">
                        ₱{Number((product as any).cost_per_unit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-3 hover:bg-primary hover:text-primary-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        onClick={() => handleSelect(product)}
                      >
                        Add to List
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-muted/20 border-t flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
