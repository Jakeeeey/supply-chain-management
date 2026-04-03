"use client";

import * as React from "react";
import { Plus, Building2, SlidersHorizontal } from "lucide-react";
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
import type { Branch } from "./types";

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
        currentPage,
        setCurrentPage,
        totalPages,
        itemsPerPage,
    } = useBranchManagement();

    const slicedBranches = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return branches.slice(start, start + itemsPerPage);
    }, [branches, currentPage, itemsPerPage]);

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingBranch, setEditingBranch] = React.useState<Branch | null>(null);

    const handleAdd = () => {
        setEditingBranch(null);
        setIsModalOpen(true);
    };

    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setIsModalOpen(true);
    };


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
                    onClick={handleAdd}
                    className="rounded-xl px-6 h-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Add New Branch
                </Button>
            </div>

            {/* Filters & Search Section */}
            <div className="bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 w-full group">
                    <Input
                        placeholder="Search Branches (Name, Code, Province, City)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 bg-background border-input rounded-xl transition-all outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Select value={filterType} onValueChange={(value: "All" | "Active" | "Inactive" | "Moving" | "Not Moving" | "Badstock") => setFilterType(value)}>
                        <SelectTrigger className="w-[160px] h-12 bg-background border border-input rounded-xl font-medium focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all outline-none group shadow-sm hover:border-primary/50">
                            <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-xl border border-input bg-popover text-popover-foreground shadow-xl ring-1 ring-black/5 dark:ring-white/5">
                            <SelectItem value="All" className="font-bold text-[10px] uppercase tracking-wider py-3 focus:bg-primary/5 cursor-pointer">All Branches</SelectItem>
                            <SelectItem value="Active" className="font-bold text-[10px] uppercase tracking-wider py-3 text-emerald-600 dark:text-emerald-400 focus:bg-emerald-50/50 dark:focus:bg-emerald-500/10 cursor-pointer">Active</SelectItem>
                            <SelectItem value="Inactive" className="font-bold text-[10px] uppercase tracking-wider py-3 text-slate-500 dark:text-slate-400 focus:bg-slate-50/50 dark:focus:bg-slate-500/10 cursor-pointer">Inactive</SelectItem>
                            <SelectItem value="Moving" className="font-bold text-[10px] uppercase tracking-wider py-3 text-amber-600 dark:text-amber-400 focus:bg-amber-50/50 dark:focus:bg-amber-500/10 cursor-pointer">Moving</SelectItem>
                            <SelectItem value="Not Moving" className="font-bold text-[10px] uppercase tracking-wider py-3 text-slate-400 dark:text-slate-500 focus:bg-slate-50/50 dark:focus:bg-slate-500/10 cursor-pointer">Not Moving</SelectItem>
                            <SelectItem value="Badstock" className="font-bold text-[10px] uppercase tracking-wider py-3 text-red-600 dark:text-red-400 focus:bg-red-50/50 dark:focus:bg-red-500/10 cursor-pointer">Badstock</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="h-10 w-px bg-border mx-1 hidden md:block" />

                    <Select defaultValue="name">
                        <SelectTrigger className="w-[180px] h-12 bg-background border border-input rounded-xl font-medium focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all outline-none shadow-sm hover:border-primary/50">
                            <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-xl border border-input bg-popover text-popover-foreground shadow-xl ring-1 ring-black/5 dark:ring-white/5">
                            <SelectItem value="name" className="font-bold text-[10px] uppercase tracking-wider py-3 focus:bg-primary/5 cursor-pointer">Branch Name</SelectItem>
                            <SelectItem value="code" className="font-bold text-[10px] uppercase tracking-wider py-3 focus:bg-primary/5 cursor-pointer">Branch Code</SelectItem>
                            <SelectItem value="date" className="font-bold text-[10px] uppercase tracking-wider py-3 focus:bg-primary/5 cursor-pointer">Date Added</SelectItem>
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
                    <BranchTable
                        branches={slicedBranches}
                        users={users}
                        loading={loading}
                        onEdit={handleEdit}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            {/* Registration Modal */}
            <BranchModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingBranch(null);
                }}
                editingBranch={editingBranch}
                users={users}
                onSuccess={refresh}
            />
        </div>
    );
}
