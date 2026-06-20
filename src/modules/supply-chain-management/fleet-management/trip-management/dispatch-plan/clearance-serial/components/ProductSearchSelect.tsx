'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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

export interface ProductOption {
    product_id: number;
    product_name: string;
    product_code: string;
}

interface ProductSearchSelectProps {
    options: ProductOption[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ProductSearchSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select Product...",
    disabled = false,
}: ProductSearchSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selectedProduct = React.useMemo(() => {
        return options.find((opt) => String(opt.product_id) === value);
    }, [options, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between h-9 bg-background border-border rounded-lg text-xs font-bold text-left",
                        !value && "text-muted-foreground font-normal"
                    )}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedProduct 
                            ? `${selectedProduct.product_name} (${selectedProduct.product_code})` 
                            : placeholder
                        }
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search product..." className="text-xs h-9" />
                    <CommandList className="max-h-[220px]">
                        <CommandEmpty className="text-xs p-3 text-muted-foreground">No products found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((opt) => {
                                const key = String(opt.product_id);
                                const label = `${opt.product_name} (${opt.product_code})`;
                                return (
                                    <CommandItem
                                        key={key}
                                        value={label}
                                        onSelect={() => {
                                            onValueChange(key);
                                            setOpen(false);
                                        }}
                                        className="text-xs rounded-md mb-0.5 cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4.5 w-4.5 text-primary shrink-0",
                                                value === key ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="font-medium">{opt.product_name}</span>
                                        <span className="ml-1 text-[10px] text-muted-foreground font-mono">({opt.product_code})</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
