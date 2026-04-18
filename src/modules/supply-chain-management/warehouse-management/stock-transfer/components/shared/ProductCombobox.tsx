'use client';

import React, { useState, useEffect } from 'react';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
import { EnrichedProduct } from '../../types/stock-transfer.types';

interface ProductComboboxProps {
  onSelect: (product: EnrichedProduct) => void;
}

export function ProductCombobox({ onSelect }: ProductComboboxProps) {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch approved products
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const query = search ? `&search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`/api/scm/warehouse-management/stock-transfer?action=products${query}`);
        if (!res.ok) throw new Error('Failed to fetch products');
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
    <Combobox
      value={null}
      onValueChange={(val: EnrichedProduct | null) => {
        if (val) {
          onSelect(val);
          setSearch('');
        }
      }}
    >
      <ComboboxInput
        placeholder="Search inventory..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        showTrigger
        className="bg-background border-border shadow-none"
      />
      <ComboboxContent>
        <ComboboxList>
          {loading && <ComboboxEmpty>Searching...</ComboboxEmpty>}
          {!loading && products.length === 0 && <ComboboxEmpty>No products found.</ComboboxEmpty>}
          {products.map((product) => (
            <ComboboxItem
              key={product.id || product.product_id}
              value={product}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-xs">{product.product_name}</span>
                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-70">
                  {product.barcode || (product as { product_code?: string }).product_code || 'NO-REF'} • {' '}
                  {typeof product.product_brand === 'object' && product.product_brand !== null 
                    ? (product.product_brand as { brand_name?: string }).brand_name || 'GENERIC' 
                    : String(product.product_brand || 'GENERIC')}
                </span>
              </div>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
