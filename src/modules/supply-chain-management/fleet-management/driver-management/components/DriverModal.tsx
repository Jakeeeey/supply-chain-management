"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveDriver, updateDriver } from "../providers/fetchProvider";
import type { DriverWithDetails, User, Branch } from "../types";

interface DriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingDriver: DriverWithDetails | null;
    users: User[];
    branches: Branch[];
    onSuccess: () => void;
}

export function DriverModal({
    isOpen,
    onClose,
    editingDriver,
    users,
    branches,
    onSuccess,
}: DriverModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [selectedUserId, setSelectedUserId] = React.useState<string>("");
    const [selectedGoodBranchId, setSelectedGoodBranchId] = React.useState<string>("");
    const [selectedBadBranchId, setSelectedBadBranchId] = React.useState<string>("");

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

    // Filter branches: good branches have isReturn = 0
    const goodBranches = React.useMemo(() => {
        return branches.filter((b) => b.isReturn === 0 || b.isReturn === false);
    }, [branches]);

    // Filter branches: bad branches have isReturn = 1
    const badBranches = React.useMemo(() => {
        return branches.filter((b) => b.isReturn === 1 || b.isReturn === true);
    }, [branches]);

    // Memoize user options for combobox
    const userOptions = React.useMemo((): ComboboxOption[] => {
        return users.map((user) => ({
            value: user.user_id.toString(),
            label: `${user.user_fname} ${user.user_lname}`,
        }));
    }, [users]);

    // Memoize good branch options for combobox
    const goodBranchOptions = React.useMemo((): ComboboxOption[] => {
        return goodBranches.map((branch) => ({
            value: branch.id.toString(),
            label: branch.branch_name,
        }));
    }, [goodBranches]);

    // Memoize bad branch options for combobox
    const badBranchOptions = React.useMemo((): ComboboxOption[] => {
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
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md rounded-2xl border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {editingDriver ? "Edit Driver" : "Add Driver"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {editingDriver
                            ? "Update the driver's information and assigned branches."
                            : "Assign a driver to good and bad branches."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                    {/* User Selection */}
                    <div className="space-y-2.5">
                        <label className="text-sm font-bold uppercase tracking-wider text-foreground/80">
                            Select Driver*
                        </label>
                        <Combobox
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
                        <Combobox
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
                        <Combobox
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

                    {/* Submit Button */}
                    <div className="flex gap-3 pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 rounded-lg h-10 font-bold"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 rounded-lg h-10 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingDriver ? "Update Driver" : "Add Driver"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
