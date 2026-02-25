"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface KioskSearchProps {
    search: string;
    onSearchChange: (value: string) => void;
    statusFilter: string;
    onStatusChange: (value: string) => void;
}

export function KioskSearch({
    search,
    onSearchChange,
    statusFilter,
    onStatusChange,
}: KioskSearchProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-background/60 backdrop-blur-xl p-4 rounded-2xl border border-border/50 shadow-sm transition-all hover:shadow-md dark:bg-card/40">
            <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Search by PDP No. or Driver..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 h-11 bg-background/50 border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl dark:bg-muted/20"
                />
            </div>
            <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center text-sm font-medium text-muted-foreground px-2">
                    <Filter className="h-4 w-4 mr-2 text-primary/70" />
                    Status:
                </div>
                <Select value={statusFilter} onValueChange={onStatusChange}>
                    <SelectTrigger className="w-full sm:w-[180px] h-11 bg-background/50 border-border/50 focus:ring-primary/20 rounded-xl dark:bg-muted/20">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 bg-popover/95 backdrop-blur-lg">
                        <SelectItem value="All Statuses">All Statuses</SelectItem>
                        <SelectItem value="For Dispatch">For Dispatch</SelectItem>
                        <SelectItem value="For Inbound">For Inbound</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
