"use client";

import * as React from "react";
import { Plus, Users, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useDriverManagement } from "./hooks/useDriverManagement";
import { DriverTable } from "./components/DriverTable";
import { DriverModal } from "./components/DriverModal";
import { LegacyCombobox as Combobox } from "@/components/ui/legacy-combobox";
import { ComboboxOption } from "@/components/ui/combobox";
import { toast } from "sonner";
import type { DriverWithDetails } from "./types";

export default function DriverManagementModule() {
    const {
        drivers,
        users,
        branches,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        filterGoodBranch,
        setFilterGoodBranch,
        filterBadBranch,
        setFilterBadBranch,
        refresh,
        currentPage,
        setCurrentPage,
        totalPages,
        itemsPerPage,
        setItemsPerPage,
    } = useDriverManagement();

    const slicedDrivers = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return drivers.slice(start, start + itemsPerPage);
    }, [drivers, currentPage, itemsPerPage]);

    const goodBranchOptions = React.useMemo((): ComboboxOption[] => {
        return [
            { value: "all", label: "All Good Branches" },
            ...branches
                .filter((b) => b.isReturn === 0 || b.isReturn === false)
                .map((branch) => ({
                    value: branch.id.toString(),
                    label: branch.branch_name,
                })),
        ];
    }, [branches]);

    const badBranchOptions = React.useMemo((): ComboboxOption[] => {
        return [
            { value: "all", label: "All Bad Branches" },
            ...branches
                .filter((b) => b.isReturn === 1 || b.isReturn === true)
                .map((branch) => ({
                    value: branch.id.toString(),
                    label: branch.branch_name,
                })),
        ];
    }, [branches]);

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingDriver, setEditingDriver] = React.useState<DriverWithDetails | null>(null);

    const handleAdd = () => {
        setEditingDriver(null);
        setIsModalOpen(true);
    };

    const handleEdit = (driver: DriverWithDetails) => {
        setEditingDriver(driver);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-col space-y-8 p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                        <Users className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Driver Management</h1>
                        <p className="text-muted-foreground text-sm mt-1 font-medium">Manage drivers and assign them to good and bad branches.</p>
                    </div>
                </div>

                <Button
                    onClick={handleAdd}
                    className="rounded-xl px-6 h-12 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Driver
                </Button>
            </div>

            {/* Filters & Search Section */}
            <div className="bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="relative flex-1 w-full flex gap-2">
                    <Input
                        placeholder="Search Drivers (ID or Name)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 h-12 bg-background border-input rounded-xl transition-all outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring"
                    />
                    <Button
                        onClick={refresh}
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-xl border-input hover:bg-primary/10 hover:text-primary transition-all"
                        title="Refresh data"
                    >
                        <RotateCw className="h-5 w-5" />
                    </Button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Combobox
                        options={goodBranchOptions}
                        value={filterGoodBranch}
                        onValueChange={setFilterGoodBranch}
                        placeholder="Search good branches..."
                        emptyMessage="No branches found."
                        className="w-[220px] h-12 bg-background border border-input rounded-xl font-medium focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all outline-none shadow-sm hover:border-primary/50"
                    />

                    <Combobox
                        options={badBranchOptions}
                        value={filterBadBranch}
                        onValueChange={setFilterBadBranch}
                        placeholder="Search bad branches..."
                        emptyMessage="No branches found."
                        className="w-[220px] h-12 bg-background border border-input rounded-xl font-medium focus:ring-2 focus:ring-ring/40 focus:border-ring transition-all outline-none shadow-sm hover:border-primary/50"
                    />
                </div>
            </div>

            {/* Main Table Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-150">
                {error ? (
                    <div className="p-12 text-center rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 font-medium">
                        <p className="text-lg font-bold">Error loading data</p>
                        <p className="text-sm opacity-80 mt-1">{error}</p>
                        <Button 
                            variant="outline" 
                            onClick={refresh} 
                            className="mt-4 border-red-500/20 hover:bg-red-500/10 text-red-500"
                        >
                            Try Again
                        </Button>
                    </div>
                ) : (
                    <DriverTable
                        drivers={slicedDrivers}
                        users={users}
                        loading={loading}
                        onEdit={handleEdit}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(value) => {
                            setItemsPerPage(value);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>

            {/* Driver Modal */}
            <DriverModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingDriver(null);
                }}
                editingDriver={editingDriver}
                users={users}
                branches={branches}
                drivers={drivers}
                onSuccess={refresh}
            />
        </div>
    );
}
