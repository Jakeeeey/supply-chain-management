"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AsyncCombobox } from "./AsyncCombobox";
import { ComboboxOption } from "@/components/ui/combobox";
import { InvoicingFilters } from "../types";
import { InvoicingService } from "../services/InvoicingService";
import { subMonths, addMonths, format } from "date-fns";
import { Loader2, X, Hash, FileSignature, User, Users, Building2, MapPin, Calendar, Search } from "lucide-react";

interface InvoicingFiltersProps {
    onFilterChange: (filters: InvoicingFilters) => void;
}

export const InvoicingFiltersComponent: React.FC<InvoicingFiltersProps> = ({ onFilterChange }) => {
    const [filters, setFilters] = useState<InvoicingFilters>({
        orderNo: "",
        poNo: "",
        customer: "",
        salesman: "",
        supplier: "",
        branch: "",
        fromDate: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
        toDate: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleComboboxChange = (name: keyof InvoicingFilters, value: string) => {
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleResetFilters = () => {
        const newFilters = {
            ...filters,
            orderNo: "",
            poNo: "",
            customer: "",
            salesman: "",
            supplier: "",
            branch: "",
        };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    // Fetcher functions mapping API data to ComboboxOption array format
    const fetchCustomers = async (search?: string): Promise<ComboboxOption[]> => {
        const data = await InvoicingService.getCustomers(search);
        const options = data.map(c => ({
            value: c.customer_code,
            label: c.customer_name || `Unknown Customer (${c.customer_code})`,
        }));
        return [{ value: "", label: "All Customers" }, ...options];
    };

    const fetchSalesmen = async (search?: string): Promise<ComboboxOption[]> => {
        const data = await InvoicingService.getSalesmen(search);
        const options = data.map(s => ({
            value: String(s.id),
            label: s.salesman_name || `Unknown Salesman (${s.salesman_code})`,
        }));
        return [{ value: "", label: "All Salesmen" }, ...options];
    };

    const fetchSuppliers = async (search?: string): Promise<ComboboxOption[]> => {
        const data = await InvoicingService.getSuppliers(search);
        const options = data.map(s => ({
            value: String(s.id),
            label: s.supplier_name || s.supplier_shortcut || "Unnamed Supplier",
        }));
        return [{ value: "", label: "All Suppliers" }, ...options];
    };

    const fetchBranches = async (search?: string): Promise<ComboboxOption[]> => {
        const data = await InvoicingService.getBranches(search);
        const options = data.map(b => ({
            value: String(b.id),
            label: b.branch_name || `Unknown Branch (${b.id})`,
        }));
        return [{ value: "", label: "All Branches" }, ...options];
    };

    return (
        <div className="p-2 md:p-6 bg-transparent">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-x-4 gap-y-6">
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="orderNo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Hash size={12} className="text-primary/60" /> Order No.
                    </Label>
                    <div className="relative group">
                        <Input
                            id="orderNo"
                            name="orderNo"
                            placeholder="Search Order No."
                            value={filters.orderNo}
                            onChange={handleChange}
                            className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                        />
                    </div>
                </div>
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="poNo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <FileSignature size={12} className="text-primary/60" /> PO No.
                    </Label>
                    <Input
                        id="poNo"
                        name="poNo"
                        placeholder="Search PO No."
                        value={filters.poNo}
                        onChange={handleChange}
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>
                
                <div className="space-y-2 col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <User size={12} className="text-primary/60" /> Customer
                    </Label>
                    <AsyncCombobox
                        fetchOptions={fetchCustomers}
                        value={filters.customer}
                        onValueChange={(val) => handleComboboxChange("customer", val)}
                        placeholder="All Customers"
                        emptyMessage="No customer found."
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>

                <div className="space-y-2 col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Users size={12} className="text-primary/60" /> Salesman
                    </Label>
                    <AsyncCombobox
                        fetchOptions={fetchSalesmen}
                        value={filters.salesman}
                        onValueChange={(val) => handleComboboxChange("salesman", val)}
                        placeholder="All Salesmen"
                        emptyMessage="No salesman found."
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>

                <div className="space-y-2 col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Building2 size={12} className="text-primary/60" /> Supplier
                    </Label>
                    <AsyncCombobox
                        fetchOptions={fetchSuppliers}
                        value={filters.supplier}
                        onValueChange={(val) => handleComboboxChange("supplier", val)}
                        placeholder="All Suppliers"
                        emptyMessage="No supplier found."
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>

                <div className="space-y-2 col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <MapPin size={12} className="text-primary/60" /> Branch
                    </Label>
                    <AsyncCombobox
                        fetchOptions={fetchBranches}
                        value={filters.branch}
                        onValueChange={(val) => handleComboboxChange("branch", val)}
                        placeholder="All Branches"
                        emptyMessage="No branch found."
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>

                <div className="space-y-2 col-span-1">
                    <Label htmlFor="fromDate" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Calendar size={12} className="text-primary/60" /> From
                    </Label>
                    <Input
                        id="fromDate"
                        name="fromDate"
                        type="date"
                        value={filters.fromDate}
                        onChange={handleChange}
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="toDate" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Calendar size={12} className="text-primary/60" /> To
                    </Label>
                    <Input
                        id="toDate"
                        name="toDate"
                        type="date"
                        value={filters.toDate}
                        onChange={handleChange}
                        className="h-10 text-xs bg-muted/20 border-border/50 focus:bg-background transition-all duration-300 rounded-xl"
                    />
                </div>
            </div>
            
            <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-4">
                <div className="flex items-center gap-2 text-muted-foreground/50">
                    <Search size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Active Search Filters</span>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleResetFilters}
                    className="text-muted-foreground hover:text-primary hover:bg-primary/5 h-8 px-4 text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-primary/20 rounded-full transition-all duration-300"
                >
                    <X className="h-3 w-3 mr-1.5" />
                    Reset Data Filters
                </Button>
            </div>
        </div>
    );
};
