"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const SUPPLIERS = [
    "ABC TRADING CO",
    "GLOBAL SUPPLY INC",
    "PRIME INDUSTRIAL",
    "NORTH STAR CORP",
    "PACIFIC VENTURES",
    "METRO DISTRIBUTORS",
    "UNITY MERCHANTS",
    "GOLDEN HARVEST",
    "ALLIED SUPPLY",
    "EVEREST TRADING",
];

export function SupplierSelect({
                                   value,
                                   onChange,
                               }: {
    value?: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="space-y-2">
            <Label>
                Supplier <span className="text-destructive">*</span>
            </Label>

            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Search and select supplier..." />
                </SelectTrigger>

                <SelectContent>
                    {SUPPLIERS.map(supplier => (
                        <SelectItem key={supplier} value={supplier}>
                            {supplier}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
