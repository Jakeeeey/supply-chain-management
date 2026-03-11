"use client";

import React, {useState, useEffect} from "react";
import {format} from "date-fns";
import {
    Users, Building2, Search, UserPlus,
    UserMinus, ShieldCheck, AlertCircle, Loader2
} from "lucide-react";
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription} from "@/components/ui/sheet";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";

import {usePickerAssignments} from "../hooks/usePickerAssignments";
import {SupplierDto} from "../types";

interface ManagePickersSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ManagePickersSheet({isOpen, onClose}: ManagePickersSheetProps) {
    const {
        suppliers,
        allUsers,
        assignedPickers,
        isLoadingLists,
        isUpdating,
        loadSelectionLists,
        loadAssignments,
        handleAssign,
        handleUnassign
    } = usePickerAssignments();

    const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | null>(null);
    const [searchUser, setSearchUser] = useState("");
    const [searchSupplier, setSearchSupplier] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadSelectionLists("TRADE", 5);
        }
    }, [isOpen, loadSelectionLists]);

    useEffect(() => {
        if (selectedSupplier) {
            loadAssignments(selectedSupplier.supplier_id);
        }
    }, [selectedSupplier, loadAssignments]);

    const handleCloseModal = () => {
        setSelectedSupplier(null);
        setSearchUser("");
        setSearchSupplier("");
        onClose();
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.supplier_name.toLowerCase().includes(searchSupplier.toLowerCase())
    );

    const assignedUserIds = new Set(assignedPickers.map(p => p.userId));
    const availableUsers = allUsers.filter(u =>
        !assignedUserIds.has(u.user_id) &&
        (`${u.user_fname} ${u.user_lname}`).toLowerCase().includes(searchUser.toLowerCase())
    );

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
            <SheetContent
                className="w-full sm:max-w-4xl overflow-hidden p-0 flex flex-col border-l-border/40 shadow-2xl bg-background">

                <div className="p-6 bg-muted/10 border-b border-border/50 shrink-0">
                    <SheetHeader className="text-left">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                <Users className="h-6 w-6"/>
                            </div>
                            <div>
                                <SheetTitle className="text-2xl font-black tracking-tight">Manage Picker
                                    Assignments</SheetTitle>
                                <SheetDescription className="font-medium mt-1">
                                    Assign warehouse staff to specific suppliers for targeted order consolidation.
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* --- LEFT PANEL: SUPPLIER LIST WITH COUNTS --- */}
                    <div className="w-1/3 border-r border-border/50 bg-muted/5 flex flex-col">
                        <div className="p-4 border-b border-border/50 shrink-0">
                            <div className="relative">
                                <Search
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                <Input
                                    placeholder="Search suppliers..."
                                    className="h-9 pl-9 text-xs bg-background shadow-sm"
                                    value={searchSupplier}
                                    onChange={(e) => setSearchSupplier(e.target.value)}
                                />
                            </div>
                        </div>
                        <ScrollArea className="flex-1 p-3">
                            {isLoadingLists ? (
                                <div className="flex justify-center py-10"><Loader2
                                    className="h-6 w-6 animate-spin text-primary/50"/></div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredSuppliers.map(supplier => {
                                        const isSelected = selectedSupplier?.supplier_id === supplier.supplier_id;
                                        return (
                                            <button
                                                key={supplier.supplier_id}
                                                onClick={() => setSelectedSupplier(supplier)}
                                                className={`w-full text-left p-3 rounded-lg text-sm transition-all flex items-center justify-between group border shadow-sm ${
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                                        : 'bg-card text-foreground border-border/50 hover:border-primary/40 hover:bg-muted/50'
                                                }`}
                                            >
                                                <div className="flex flex-col truncate pr-2">
                                                    <span className="font-bold truncate">{supplier.supplier_name}</span>
                                                    <span
                                                        className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                        {supplier.assignedCount || 0} Pickers
                                                    </span>
                                                </div>
                                                <Building2
                                                    className={`h-5 w-5 shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-20 group-hover:opacity-60'}`}/>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* --- RIGHT PANEL: USER ASSIGNMENT DUAL-LIST --- */}
                    <div className="flex-1 flex flex-col bg-background">
                        {!selectedSupplier ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50">
                                <Building2 className="h-16 w-16 mb-4 opacity-50"/>
                                <p className="font-bold tracking-widest uppercase text-sm">Select a supplier to map
                                    staff</p>
                            </div>
                        ) : (
                            <>
                                <div
                                    className="p-4 border-b border-border/50 flex justify-between items-center shrink-0 bg-card/50">
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Active
                                            Assignment</p>
                                        <h3 className="font-black text-lg text-foreground">{selectedSupplier.supplier_name}</h3>
                                    </div>
                                    <Badge variant="secondary"
                                           className="font-mono">{assignedPickers.length} Assigned</Badge>
                                </div>

                                <div className="flex-1 flex overflow-hidden p-4 gap-6">
                                    {/* Column 1: Available Staff */}
                                    <div
                                        className="flex-1 flex flex-col border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                        <div className="p-3 border-b border-border/50 bg-muted/20">
                                            <Input
                                                placeholder="Search staff..."
                                                className="h-8 text-xs bg-background"
                                                value={searchUser}
                                                onChange={(e) => setSearchUser(e.target.value)}
                                            />
                                        </div>
                                        <ScrollArea className="flex-1 p-2 bg-muted/5">
                                            <div className="space-y-2">
                                                {isLoadingLists ? (
                                                    <div className="flex justify-center py-10"><Loader2
                                                        className="h-4 w-4 animate-spin text-muted-foreground"/></div>
                                                ) : availableUsers.length === 0 ? (
                                                    <p className="text-center text-xs font-bold text-muted-foreground py-10 uppercase tracking-widest">No
                                                        available staff</p>
                                                ) : (
                                                    availableUsers.map(user => (
                                                        <div key={user.user_id}
                                                             className="flex items-center justify-between p-3 border border-border/40 rounded-lg bg-background hover:border-primary/30 transition-colors group shadow-sm">
                                                            <div className="truncate pr-2">
                                                                <p className="text-sm font-bold text-foreground truncate">{user.user_fname} {user.user_lname}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">User
                                                                    ID: {user.user_id}</p>
                                                            </div>
                                                            <Button size="sm" variant="secondary"
                                                                    className="h-7 w-7 p-0 shrink-0 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                                                                    onClick={() => handleAssign(user.user_id, selectedSupplier.supplier_id, selectedSupplier.supplier_name)}>
                                                                <UserPlus className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>

                                    {/* Column 2: Assigned Pickers */}
                                    <div
                                        className="flex-1 flex flex-col border border-border/50 rounded-xl overflow-hidden shadow-sm border-primary/20 bg-primary/5">
                                        <div
                                            className="p-3 border-b border-border/50 bg-primary/10 flex items-center justify-between">
                                            <span
                                                className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4"/> Authorized Pickers
                                            </span>
                                        </div>
                                        <ScrollArea className="flex-1 p-2">
                                            <div className="space-y-2">
                                                {isUpdating ? (
                                                    <div className="flex justify-center py-10"><Loader2
                                                        className="h-6 w-6 animate-spin text-primary"/></div>
                                                ) : assignedPickers.length === 0 ? (
                                                    <div className="text-center py-10 opacity-50">
                                                        <AlertCircle
                                                            className="h-8 w-8 mx-auto mb-2 text-muted-foreground"/>
                                                        <p className="text-xs font-bold uppercase tracking-widest">No
                                                            staff assigned</p>
                                                    </div>
                                                ) : (
                                                    assignedPickers.map(picker => (
                                                        <div key={picker.userId}
                                                             className="flex items-center justify-between p-3 border border-primary/20 rounded-lg bg-background shadow-sm hover:border-destructive/40 group transition-colors">
                                                            <div className="truncate pr-2">
                                                                <p className="text-sm font-bold text-foreground truncate">{picker.userName}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono mt-0.5">Assigned: {format(new Date(picker.assignedAt), "MMM dd")}</p>
                                                            </div>
                                                            <Button size="sm" variant="ghost"
                                                                    className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleUnassign(picker.userId, selectedSupplier.supplier_id)}>
                                                                <UserMinus className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}