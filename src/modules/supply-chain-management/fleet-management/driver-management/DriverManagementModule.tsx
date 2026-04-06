"use client";

import * as React from "react";
import { Plus, Users, RotateCw, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useDriverManagement } from "./hooks/useDriverManagement";
import { DriverTable } from "./components/DriverTable";
import { DriverModal } from "./components/DriverModal";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DriverWithDetails } from "./types";

type ComboboxOption = { value: string; label: string };

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

    const [openGood, setOpenGood] = React.useState(false);
    const [openBad, setOpenBad] = React.useState(false);

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
                    <Popover open={openGood} onOpenChange={setOpenGood}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openGood}
                                className="w-[220px] h-12 bg-background border border-input rounded-xl font-medium justify-between shadow-sm hover:border-primary/50"
                            >
                                {filterGoodBranch !== "all"
                                    ? goodBranchOptions.find((opt) => opt.value === filterGoodBranch)?.label
                                    : "All Good Branches"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-0">
                            <Command>
                                <CommandInput placeholder="Search Good Branch..." />
                                <CommandList>
                                    <CommandEmpty>No branch found.</CommandEmpty>
                                    <CommandGroup>
                                        {goodBranchOptions.map((opt) => (
                                            <CommandItem
                                                key={opt.value}
                                                value={opt.value}
                                                onSelect={(currentValue) => {
                                                    setFilterGoodBranch(currentValue === filterGoodBranch ? "all" : currentValue);
                                                    setOpenGood(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        filterGoodBranch === opt.value ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {opt.label}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <Popover open={openBad} onOpenChange={setOpenBad}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openBad}
                                className="w-[220px] h-12 bg-background border border-input rounded-xl font-medium justify-between shadow-sm hover:border-primary/50"
                            >
                                {filterBadBranch !== "all"
                                    ? badBranchOptions.find((opt) => opt.value === filterBadBranch)?.label
                                    : "All Bad Branches"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[220px] p-0">
                            <Command>
                                <CommandInput placeholder="Search Bad Branch..." />
                                <CommandList>
                                    <CommandEmpty>No branch found.</CommandEmpty>
                                    <CommandGroup>
                                        {badBranchOptions.map((opt) => (
                                            <CommandItem
                                                key={opt.value}
                                                value={opt.value}
                                                onSelect={(currentValue) => {
                                                    setFilterBadBranch(currentValue === filterBadBranch ? "all" : currentValue);
                                                    setOpenBad(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        filterBadBranch === opt.value ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {opt.label}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
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
