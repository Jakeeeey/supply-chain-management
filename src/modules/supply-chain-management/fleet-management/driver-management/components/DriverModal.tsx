"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
<<<<<<< HEAD
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
    value: string;
    label: string;
};

interface LocalComboboxProps {
    options: ComboboxOption[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    className?: string;
}

function LocalCombobox({
    options,
    value,
    onValueChange,
    placeholder = "Search...",
    emptyMessage = "No results found.",
    className,
}: LocalComboboxProps) {
    const [open, setOpen] = React.useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal text-muted-foreground", className, value && "text-foreground")}
                >
                    {value
                        ? options.find((opt) => opt.value === value)?.label || placeholder
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onValueChange(option.value === value ? "" : option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

=======
>>>>>>> origin
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { saveDriver, updateDriver } from "../providers/fetchProvider";
import type { DriverWithDetails, User, Branch } from "../types";

interface DriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingDriver: DriverWithDetails | null;
    users: User[];
    branches: Branch[];
    drivers: DriverWithDetails[];
    onSuccess: () => void;
}

export function DriverModal({
    isOpen,
    onClose,
    editingDriver,
    users,
    branches,
    drivers,
    onSuccess,
}: DriverModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [selectedUserId, setSelectedUserId] = React.useState<string>("");
    const [selectedGoodBranchId, setSelectedGoodBranchId] = React.useState<string>("");
    const [selectedBadBranchId, setSelectedBadBranchId] = React.useState<string>("");

    const [userOpen, setUserOpen] = React.useState(false);
    const [goodBranchOpen, setGoodBranchOpen] = React.useState(false);
    const [badBranchOpen, setBadBranchOpen] = React.useState(false);

    // Filter branches: good branches have isReturn = 0
    const goodBranches = React.useMemo(() => {
        return branches.filter((b) => b.isReturn === 0 || b.isReturn === false);
    }, [branches]);

    // Filter branches: bad branches have isReturn = 1
    const badBranches = React.useMemo(() => {
        return branches.filter((b) => b.isReturn === 1 || b.isReturn === true);
    }, [branches]);

    // Handle good branch selection change
    const onGoodBranchChange = (value: string) => {
        setSelectedGoodBranchId(value);
        setGoodBranchOpen(false);

        // Find the selected good branch details
        const selectedGoodBranch = goodBranches.find(b => b.id.toString() === value);
        if (selectedGoodBranch) {
            const goodName = selectedGoodBranch.branch_name.toLowerCase();
            
            // Try to find a bad branch with a similar name
            const suggestion = badBranches.find(bb => {
                const badName = bb.branch_name.toLowerCase();
                return badName.includes(goodName) || goodName.includes(badName);
            });

            if (suggestion) {
                setSelectedBadBranchId(suggestion.id.toString());
            } else {
                setSelectedBadBranchId("none");
            }
        }
    };

    // Initialize form with editing driver data
    React.useEffect(() => {
        if (editingDriver) {
            setSelectedUserId(editingDriver.user_id.toString());
            setSelectedGoodBranchId(editingDriver.branch_id.toString());
            setSelectedBadBranchId(editingDriver.bad_branch_id?.toString() || "none");
        } else {
            setSelectedUserId("");
            setSelectedGoodBranchId("");
            setSelectedBadBranchId("none");
        }
    }, [editingDriver, isOpen]);

    // Memoize user options - exclude already assigned users unless editing
    const userOptions = React.useMemo((): { value: string; label: string }[] => {
        const assignedUserIds = new Set(drivers.map((d) => d.user_id));
        return users
            .filter((user) => !assignedUserIds.has(user.user_id) || (editingDriver?.user_id === user.user_id))
            .map((user) => ({
                value: user.user_id.toString(),
                label: `${user.user_fname} ${user.user_lname}`,
            }));
    }, [users, drivers, editingDriver?.user_id]);

    // Memoize good branch options
    const goodBranchOptions = React.useMemo((): { value: string; label: string }[] => {
        return goodBranches.map((branch) => ({
            value: branch.id.toString(),
            label: branch.branch_name,
        }));
    }, [goodBranches]);

    // Memoize bad branch options
    const badBranchOptions = React.useMemo((): { value: string; label: string }[] => {
        return [
            { value: "none", label: "None (Optional)" },
            ...badBranches.map((branch) => ({
                value: branch.id.toString(),
                label: branch.branch_name,
            })),
        ];
    }, [badBranches]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedUserId || !selectedGoodBranchId) {
            toast.error("Please select a driver and good branch");
            return;
        }

        setLoading(true);
        try {
            const driverData = {
                user_id: parseInt(selectedUserId),
                branch_id: parseInt(selectedGoodBranchId),
                bad_branch_id: selectedBadBranchId !== "none" ? parseInt(selectedBadBranchId) : null,
            };

            if (editingDriver) {
                await updateDriver(editingDriver.id, driverData);
                toast.success("Driver updated successfully");
            } else {
                await saveDriver(driverData);
                toast.success("Driver added successfully");
            }

            onSuccess();
            onClose();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "An error occurred";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] p-0 flex flex-col rounded-2xl border-white/10 overflow-hidden">
                <DialogHeader className="p-6 pb-2 shrink-0 border-b">
                    <DialogTitle className="text-2xl font-bold">
                        {editingDriver ? "Edit Driver" : "Add Driver"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                        {editingDriver
                            ? "Update the driver's information and assigned branches."
                            : "Assign a driver to good and bad branches."}
                    </DialogDescription>
                </DialogHeader>

<<<<<<< HEAD
                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                    {/* User Selection */}
                    <div className="space-y-2.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                            Select Driver*
                        </label>
                        <LocalCombobox
                            options={userOptions}
                            value={selectedUserId}
                            onValueChange={setSelectedUserId}
                            placeholder="Search drivers..."
                            emptyMessage="No drivers found."
                            className="w-full h-10 rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                        />
                        <p className="text-xs text-muted-foreground/60 font-medium">Select the user to assign as driver</p>
                    </div>

                    {/* Good Branch Selection */}
                    <div className="space-y-2.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                            Good Branch*
                        </label>
                        <LocalCombobox
                            options={goodBranchOptions}
                            value={selectedGoodBranchId}
                            onValueChange={setSelectedGoodBranchId}
                            placeholder="Search branches..."
                            emptyMessage="No branches found."
                            className="w-full h-10 rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                        />
                        <p className="text-xs text-muted-foreground/60 font-medium">
                            {goodBranches.length} good branch(es) available
                        </p>
                    </div>

                    {/* Bad Branch Selection */}
                    <div className="space-y-2.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                            Bad Branch
                        </label>
                        <LocalCombobox
                            options={badBranchOptions}
                            value={selectedBadBranchId}
                            onValueChange={setSelectedBadBranchId}
                            placeholder="Search branches..."
                            emptyMessage="No branches found."
                            className="w-full h-10 rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                        />
                        <p className="text-xs text-muted-foreground/60 font-medium">
                            {badBranches.length} bad branch(es) available (Optional)
                        </p>
                    </div>
=======
                <div className="flex-1 overflow-y-auto min-h-0">
                    <form id="driver-form" onSubmit={handleSubmit} className="space-y-6 p-6">
                        {/* User Selection */}
                        <div className="space-y-2.5">
                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                                Select Driver*
                            </label>
                            <Popover open={userOpen} onOpenChange={setUserOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={userOpen}
                                        className="w-full h-10 justify-between rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                                    >
                                        {selectedUserId
                                            ? userOptions.find((opt) => opt.value === selectedUserId)?.label
                                            : "Search drivers..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command className="max-h-[300px] flex flex-col" onWheel={(e) => e.stopPropagation()}>
                                        <CommandInput placeholder="Search drivers..." />
                                        <CommandList className="flex-1 overflow-y-auto min-h-0">
                                            <CommandEmpty>No drivers found.</CommandEmpty>
                                            <CommandGroup>
                                                {userOptions.map((opt) => (
                                                    <CommandItem
                                                        key={opt.value}
                                                        value={opt.label}
                                                        onSelect={() => {
                                                            setSelectedUserId(opt.value);
                                                            setUserOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedUserId === opt.value ? "opacity-100" : "opacity-0")} />
                                                        {opt.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground/60 font-medium">Select the user to assign as driver</p>
                        </div>

                        {/* Good Branch Selection */}
                        <div className="space-y-2.5">
                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                                Good Branch*
                            </label>
                            <Popover open={goodBranchOpen} onOpenChange={setGoodBranchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={goodBranchOpen}
                                        className="w-full h-10 justify-between rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                                    >
                                        {selectedGoodBranchId
                                            ? goodBranchOptions.find((opt) => opt.value === selectedGoodBranchId)?.label
                                            : "Search branches..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command className="max-h-[300px] flex flex-col" onWheel={(e) => e.stopPropagation()}>
                                        <CommandInput placeholder="Search branches..." />
                                        <CommandList className="flex-1 overflow-y-auto min-h-0">
                                            <CommandEmpty>No branches found.</CommandEmpty>
                                            <CommandGroup>
                                                {goodBranchOptions.map((opt) => (
                                                    <CommandItem
                                                        key={opt.value}
                                                        value={opt.label}
                                                        onSelect={() => onGoodBranchChange(opt.value)}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedGoodBranchId === opt.value ? "opacity-100" : "opacity-0")} />
                                                        {opt.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground/60 font-medium">
                                {goodBranches.length} good branch(es) available
                            </p>
                        </div>

                        {/* Bad Branch Selection */}
                        <div className="space-y-2.5">
                            <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                                Bad Branch
                            </label>
                            <Popover open={badBranchOpen} onOpenChange={setBadBranchOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={badBranchOpen}
                                        className="w-full h-10 justify-between rounded-lg border-input bg-background text-foreground font-medium focus:ring-2 focus:ring-ring transition-all"
                                    >
                                        {selectedBadBranchId && selectedBadBranchId !== "none"
                                            ? badBranchOptions.find((opt) => opt.value === selectedBadBranchId)?.label
                                            : "None (Optional)"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command className="max-h-[300px] flex flex-col" onWheel={(e) => e.stopPropagation()}>
                                        <CommandInput placeholder="Search branches..." />
                                        <CommandList className="flex-1 overflow-y-auto min-h-0">
                                            <CommandEmpty>No branches found.</CommandEmpty>
                                            <CommandGroup>
                                                {badBranchOptions.map((opt) => (
                                                    <CommandItem
                                                        key={opt.value}
                                                        value={opt.label}
                                                        onSelect={() => {
                                                            setSelectedBadBranchId(opt.value);
                                                            setBadBranchOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedBadBranchId === opt.value ? "opacity-100" : "opacity-0")} />
                                                        {opt.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground/60 font-medium">
                                {badBranches.length} bad branch(es) available (Optional)
                            </p>
                        </div>
                    </form>
                </div>
>>>>>>> origin

                <div className="p-6 flex justify-end gap-3 mt-auto border-t shrink-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="rounded-xl font-bold h-11 px-6 hover:bg-muted/50 transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        form="driver-form"
                        type="submit"
                        disabled={loading}
                        className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all bg-primary"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingDriver ? "Update Driver" : "Save Driver"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
