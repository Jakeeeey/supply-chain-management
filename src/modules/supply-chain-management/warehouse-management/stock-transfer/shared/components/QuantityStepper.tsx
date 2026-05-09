'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function QuantityStepper({
  value,
  min = 0,
  max,
  onChange,
  disabled = false,
  className,
  size = 'md'
}: QuantityStepperProps) {
  const isSm = size === 'sm';

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    onChange(Math.min(max, Math.max(min, val)));
  };

  return (
    <div className={cn(
      "inline-flex items-center border border-border rounded-lg overflow-hidden bg-background group-hover:border-primary/30 transition-colors shadow-none",
      className
    )}>
      <button
        type="button"
        tabIndex={-1}
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={cn(
          "flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-r border-border/50",
          isSm ? "w-6 h-7" : "w-8 h-9"
        )}
      >
        <Minus className={cn(isSm ? "w-2.5 h-2.5" : "w-3 h-3")} />
      </button>
      
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        className={cn(
          "text-center font-bold text-foreground bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          isSm ? "w-8 text-[11px]" : "w-12 text-xs"
        )}
      />

      <button
        type="button"
        tabIndex={-1}
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={cn(
          "flex items-center justify-center text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-l border-border/50",
          isSm ? "w-6 h-7" : "w-8 h-9"
        )}
      >
        <Plus className={cn(isSm ? "w-2.5 h-2.5" : "w-3 h-3")} />
      </button>
    </div>
  );
}
