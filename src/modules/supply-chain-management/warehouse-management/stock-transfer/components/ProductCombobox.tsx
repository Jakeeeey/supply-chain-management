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
import { SKU } from '@/modules/supply-chain-management/product-management/sku/sku-creation/types/sku.schema';

interface ProductComboboxProps {
  onSelect: (product: SKU) => void;
}

export function ProductCombobox({ onSelect }: ProductComboboxProps) {
  const [products, setProducts] = useState<SKU[]>([]);
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
      onValueChange={(val: SKU | null) => {
        if (val) {
          onSelect(val);
          setSearch('');
        }
      }}
    >
      <ComboboxInput
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        showTrigger
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
              <div className="flex flex-col">
                <span className="font-medium">{product.product_name}</span>
                <span className="text-[10px] text-muted-foreground uppercase">
                  {product.barcode || (product as { product_code?: string }).product_code || 'No Code'} • {' '}
                  Brand: {typeof product.product_brand === 'object' && product.product_brand !== null 
                    ? (product.product_brand as { brand_name?: string }).brand_name || 'N/A' 
                    : product.product_brand || 'N/A'}
                </span>
              </div>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

