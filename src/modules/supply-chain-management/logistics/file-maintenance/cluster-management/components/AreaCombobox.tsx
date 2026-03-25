"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface AreaComboboxOption {
  value: string
  label: string
}

interface AreaComboboxProps {
  options: AreaComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  renderItem?: (option: AreaComboboxOption) => React.ReactNode
}

export function AreaCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  emptyMessage = "No option found.",
  className,
  disabled,
  renderItem
}: AreaComboboxProps) {
  const sortedOptions = React.useMemo(() => {
    return [...options].sort((a, b) => a.label.localeCompare(b.label))
  }, [options])

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full bg-background border-input", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
        {sortedOptions.length > 0 ? (
          sortedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {renderItem ? renderItem(option) : option.label}
            </SelectItem>
          ))
        ) : (
          <div className="p-2 text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </SelectContent>
    </Select>
  )
}



