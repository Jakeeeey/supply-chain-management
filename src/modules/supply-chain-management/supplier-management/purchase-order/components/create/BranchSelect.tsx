"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

const BRANCHES = [
    "Manila",
    "Cebu",
    "Davao",
    "Baguio",
    "Iloilo",
];

export function BranchSelect({
                                 value,
                                 onChange,
                             }: {
    value: string[];
    onChange: (v: string[]) => void;
}) {
    const [search, setSearch] = useState("");

    const filteredBranches = BRANCHES.filter(branch =>
        branch.toLowerCase().includes(search.toLowerCase())
    );

    const toggleBranch = (branch: string) => {
        if (value.includes(branch)) {
            onChange(value.filter(b => b !== branch));
        } else {
            onChange([...value, branch]);
        }
    };

    return (
        <div className="space-y-3">
            <Label>
                Delivery Branches <span className="text-destructive">*</span>
            </Label>

            <p className="text-xs text-muted-foreground">
                Search and select one or more branches
            </p>

            <input
                type="text"
                placeholder="Search branches..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border rounded p-2 text-sm"
            />

            <div className="max-h-40 overflow-y-auto border rounded mt-2">
                {filteredBranches.length > 0 ? (
                    filteredBranches.map(branch => (
                        <label
                            key={branch}
                            className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100"
                        >
                            <input
                                type="checkbox"
                                checked={value.includes(branch)}
                                onChange={() => toggleBranch(branch)}
                                className="form-checkbox"
                            />
                            <span className="text-sm">{branch}</span>
                        </label>
                    ))
                ) : (
                    <p className="p-2 text-sm text-muted-foreground">
                        No branches found
                    </p>
                )}
            </div>
        </div>
    );
}
