"use client";

import * as React from "react";
import { Plus, Search, Building2, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useBranchManagement } from "./hooks/useBranchManagement";
import { BranchTable } from "./components/BranchTable";
import { BranchModal } from "./components/BranchModal";

export default function BranchManagementModule() {
    const {
        branches,
        users,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        filterType,
        setFilterType,
        refresh,
    } = useBranchManagement();

    const [isModalOpen, setIsModalOpen] = React.useState(false);

    return (
        <div className="flex flex-col space-y-8 p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                        <Building2 className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Branch Management</h1>
                        <p className="text-muted-foreground text-sm mt-1 font-medium">Register and manage company branches and warehouses.</p>
                    </div>
                </div>

                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-xl px-6 h-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Add New Branch
                </Button>
            </div>

            {/* Filters & Search Section */}
            <div className="bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                        placeholder="Search Branches (Name, Code, Province, City)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 h-12 bg-muted/30 border-input rounded-xl focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring transition-all outline-none"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="p-2 border border-white/5 bg-muted/30 rounded-lg flex items-center gap-1">
                        <Button
                            variant={filterType === "All" ? "default" : "ghost"}
                            onClick={() => setFilterType("All")}
                            className={`h-9 px-6 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${filterType === "All" ? "" : "hover:bg-white/5"}`}
                        >
                            All
                        </Button>
                        <Button
                            variant={filterType === "Badstock" ? "destructive" : "ghost"}
                            onClick={() => setFilterType("Badstock")}
                            className={`h-9 px-6 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${filterType === "Badstock" ? "" : "hover:bg-red-500/10 hover:text-red-500"}`}
                        >
                            Badstock
                        </Button>
                    </div>

                    <div className="h-10 w-px bg-white/10 mx-1 hidden md:block" />

                    <Select defaultValue="name">
                        <SelectTrigger className="w-[180px] h-12 bg-muted/30 border-input rounded-xl font-medium focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all outline-none">
                            <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-xl">
                            <SelectItem value="name">Branch Name</SelectItem>
                            <SelectItem value="code">Branch Code</SelectItem>
                            <SelectItem value="date">Date Added</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Table Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-150">
                {error ? (
                    <div className="p-12 text-center rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 font-medium">
                        <p className="text-lg font-bold">Error loading data</p>
                        <p className="text-sm opacity-80 mt-1">{error}</p>
                        <Button variant="outline" onClick={refresh} className="mt-4 border-red-500/20 hover:bg-red-500/10 text-red-500">
                            Try Again
                        </Button>
                    </div>
                ) : (
                    <BranchTable branches={branches} users={users} loading={loading} />
                )}
            </div>

            {/* Registration Modal */}
            <BranchModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                users={users}
                onSuccess={refresh}
            />
        </div>
    );
}
