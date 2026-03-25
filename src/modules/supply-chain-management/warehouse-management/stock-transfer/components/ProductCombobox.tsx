'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SKU } from '@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema';

interface ProductComboboxProps {
  onSelect: (product: SKU) => void;
}

export function ProductCombobox({ onSelect }: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [products, setProducts] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch approved SKUs
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const query = search ? `&search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`/api/scm/product-management/sku?type=approved&limit=50${query}`);
        if (!res.ok) throw new Error('Failed to fetch SKUs');
        const json = await res.json();
        if (active) {
          setProducts(json.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch products for combobox:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={loading && products.length === 0}
        >
          {value
            ? products.find((p) => p.product_name === value)?.product_name || 'Select a product...'
            : 'Select a product...'}
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 opacity-50 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search products..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{loading ? 'Searching...' : 'No products found.'}</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id || product.product_id}
                  value={product.product_name}
                  onSelect={(currentValue) => {
                    setValue(currentValue);
                    setOpen(false);
                    onSelect(product);
                    // Reset after selection
                    setValue('');
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === product.product_name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{product.product_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.barcode || (product as any).sku_code || 'No Barcode'} • {' '}
                      Brand: {typeof product.product_brand === 'object' && product.product_brand !== null 
                        ? (product.product_brand as any).brand_name || 'N/A' 
                        : product.product_brand || 'N/A'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
