"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Users, Building2, Search, UserPlus,
    UserMinus, ShieldCheck, AlertCircle, Loader2, ArrowRightLeft
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { usePickerAssignments } from "../hooks/usePickerAssignments";
import { SupplierDto } from "../types";
import { cn } from "@/lib/utils";

interface ManagePickersSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ManagePickersSheet({ isOpen, onClose }: ManagePickersSheetProps) {
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
            {/* 🚀 FIX: Widened to max-w-6xl for better dual-list display */}
            <SheetContent className="w-full sm:max-w-4xl xl:max-w-6xl overflow-hidden p-0 flex flex-col border-l border-border/40 shadow-2xl bg-background">

                {/* HEADER (Fixed Height) */}
                <div className="p-6 bg-muted/10 border-b border-border/50 shrink-0">
                    <SheetHeader className="text-left">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                                <Users className="h-7 w-7" />
                            </div>
                            <div>
                                <SheetTitle className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">
                                    Picker Assignments
                                </SheetTitle>
                                <SheetDescription className="font-medium text-xs md:text-sm mt-1 uppercase tracking-widest text-muted-foreground">
                                    Map warehouse staff to suppliers for targeted order fulfillment
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                {/* 🚀 FIX: min-h-0 prevents flex children from expanding infinitely */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

                    {/* --- LEFT PANEL: SUPPLIER LIST --- */}
                    <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border/50 bg-muted/5 flex flex-col min-h-[30vh] md:min-h-0 shrink-0 md:shrink">
                        <div className="p-4 border-b border-border/50 shrink-0 bg-background/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                <Input
                                    placeholder="Search suppliers..."
                                    className="h-10 pl-9 text-sm bg-background shadow-sm rounded-xl focus-visible:ring-primary/30"
                                    value={searchSupplier}
                                    onChange={(e) => setSearchSupplier(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 🚀 FIX: Native overflow-y-auto replaces ScrollArea for guaranteed scrolling */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {isLoadingLists ? (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary/50 mb-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Loading Suppliers...</span>
                                </div>
                            ) : filteredSuppliers.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60">
                                    No suppliers found
                                </div>
                            ) : (
                                filteredSuppliers.map(supplier => {
                                    const isSelected = selectedSupplier?.supplier_id === supplier.supplier_id;
                                    return (
                                        <button
                                            key={supplier.supplier_id}
                                            onClick={() => setSelectedSupplier(supplier)}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl text-sm transition-all flex items-center justify-between group border shadow-sm",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-[0.98]"
                                                    : "bg-card text-foreground border-border/50 hover:border-primary/40 hover:bg-muted/50 hover:-translate-y-0.5"
                                            )}
                                        >
                                            <div className="flex flex-col truncate pr-3">
                                                <span className="font-black uppercase tracking-tight truncate">{supplier.supplier_name}</span>
                                                <span className={cn(
                                                    "text-[10px] font-bold tracking-widest uppercase mt-1 flex items-center gap-1",
                                                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                                )}>
                                                    <Users className="w-3 h-3" />
                                                    {supplier.assignedCount || 0} Pickers
                                                </span>
                                            </div>
                                            <Building2 className={cn(
                                                "h-5 w-5 shrink-0 transition-opacity",
                                                isSelected ? "opacity-100" : "opacity-20 group-hover:opacity-60"
                                            )} />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* --- RIGHT PANEL: USER ASSIGNMENT DUAL-LIST --- */}
                    <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
                        {!selectedSupplier ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/5">
                                <Building2 className="h-20 w-20 mb-6 opacity-30" />
                                <p className="font-black tracking-widest uppercase text-base">Select a supplier</p>
                                <p className="text-xs font-bold mt-2 opacity-60">Map authorized staff to begin picking</p>
                            </div>
                        ) : (
                            <>
                                {/* Active Supplier Header */}
                                <div className="p-5 border-b border-border/50 flex justify-between items-center shrink-0 bg-card/80 backdrop-blur-sm z-10 shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" /> Active Mapping
                                        </span>
                                        <h3 className="font-black text-xl md:text-2xl text-foreground uppercase tracking-tight leading-none">
                                            {selectedSupplier.supplier_name}
                                        </h3>
                                    </div>
                                    <Badge variant="secondary" className="font-black uppercase tracking-widest px-3 py-1 bg-primary/10 text-primary border-primary/20">
                                        {assignedPickers.length} Assigned
                                    </Badge>
                                </div>

                                {/* Dual List Container */}
                                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 lg:p-6 gap-4 lg:gap-6 min-h-0 bg-muted/10">

                                    {/* Column 1: Available Staff */}
                                    <div className="flex-1 flex flex-col border border-border/60 rounded-2xl overflow-hidden shadow-sm bg-card min-h-0">
                                        <div className="p-3 border-b border-border/50 bg-muted/30 shrink-0">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                                                <Input
                                                    placeholder="Search available staff..."
                                                    className="h-9 pl-9 text-xs bg-background shadow-sm rounded-lg"
                                                    value={searchUser}
                                                    onChange={(e) => setSearchUser(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* 🚀 Native Scroll Container */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                            {isLoadingLists ? (
                                                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                                            ) : availableUsers.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                                    <Users className="h-10 w-10 mb-3 text-muted-foreground" />
                                                    <p className="text-center text-xs font-black text-muted-foreground uppercase tracking-widest">No available staff</p>
                                                </div>
                                            ) : (
                                                availableUsers.map(user => (
                                                    <div key={user.user_id} className="flex items-center justify-between p-3 border border-border/40 rounded-xl bg-background hover:border-primary/40 transition-colors group shadow-sm">
                                                        <div className="truncate pr-3">
                                                            <p className="text-sm font-black text-foreground truncate uppercase">{user.user_fname} {user.user_lname}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">ID: {user.user_id}</p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="h-9 w-9 p-0 shrink-0 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-transform active:scale-90"
                                                            onClick={() => handleAssign(user.user_id, selectedSupplier.supplier_id, selectedSupplier.supplier_name)}
                                                        >
                                                            <UserPlus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Center Icon (Desktop Only) */}
                                    <div className="hidden lg:flex flex-col justify-center items-center shrink-0 opacity-20">
                                        <ArrowRightLeft className="w-8 h-8 text-muted-foreground" />
                                    </div>

                                    {/* Column 2: Assigned Pickers */}
                                    <div className="flex-1 flex flex-col border border-emerald-500/20 rounded-2xl overflow-hidden shadow-sm bg-emerald-500/5 min-h-0">
                                        <div className="p-3.5 border-b border-emerald-500/20 bg-emerald-500/10 shrink-0 flex justify-center items-center">
                                            <span className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-500 flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4" /> Authorized Pickers
                                            </span>
                                        </div>

                                        {/* 🚀 Native Scroll Container */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                            {isUpdating ? (
                                                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                                            ) : assignedPickers.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                                                    <AlertCircle className="h-10 w-10 mb-3 text-emerald-600/50" />
                                                    <p className="text-center text-xs font-black text-emerald-700 dark:text-emerald-500 uppercase tracking-widest">No staff mapped</p>
                                                </div>
                                            ) : (
                                                assignedPickers.map(picker => (
                                                    <div key={picker.userId} className="flex items-center justify-between p-3 border border-emerald-500/20 rounded-xl bg-background shadow-sm hover:border-destructive/40 transition-colors group">
                                                        <div className="truncate pr-3">
                                                            <p className="text-sm font-black text-foreground truncate uppercase">{picker.userName}</p>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">
                                                                Assigned: {format(new Date(picker.assignedAt), "MMM dd, yyyy")}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 shrink-0 text-muted-foreground bg-muted/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-transform active:scale-90"
                                                            onClick={() => handleUnassign(picker.userId, selectedSupplier.supplier_id)}
                                                        >
                                                            <UserMinus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
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