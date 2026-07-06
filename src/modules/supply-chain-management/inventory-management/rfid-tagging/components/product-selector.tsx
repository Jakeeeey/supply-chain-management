"use client";

import { useEffect, useState } from "react";
import { Product } from "../types";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductSelectorProps {
  onSelect: (productId: number | null) => void;
  disabled?: boolean;
}

export function ProductSelector({ onSelect, disabled }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  // removed loading state
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/scm/inventory-management/rfid-tagging/products?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch products", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleSelect = (productId: number) => {
    setValue(productId === value ? null : productId);
    onSelect(productId === value ? null : productId);
    setOpen(false);
  };

  const selectedProduct = products.find((p) => {
    const id = p.product_id ?? p.id;
    return id === value;
  });

  const selectedName = selectedProduct
    ? `${selectedProduct.product_code ?? selectedProduct.item_code ?? ""} - ${selectedProduct.description ?? selectedProduct.product_name ?? ""}`
    : "Select a product...";

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="product-select">Select Product</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-[300px] justify-between font-normal overflow-hidden"
          >
            <span className="truncate">
              {selectedName}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command filter={() => 1}>
            <CommandInput 
              placeholder="Search code, name, or scan barcode..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No product found.</CommandEmpty>
              <CommandGroup>
                {products.map((p, index) => {
                  const id = p.product_id ?? p.id ?? index;
                  const code = p.product_code ?? p.item_code ?? "No Code";
                  const name = p.description ?? p.product_name ?? "Unnamed Product";
                  return (
                    <CommandItem
                      key={id}
                      value={id.toString()}
                      onSelect={(currentValue) => {
                        handleSelect(Number(currentValue));
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{code} - {name}</span>
                        {p.barcode && <span className="text-xs text-muted-foreground">{p.barcode}</span>}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
