"use client";

import React, { useState, useEffect } from "react";
import { Play, UserCircle2, Loader2, Shield, AlertTriangle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchAllUsers } from "../providers/fetchProvider";
import { toast } from "sonner"; // 🚀 Sonner import

interface WarehouseUser {
    user_id: number;
    user_fname: string;
    user_lname: string;
    user_position: string;
}

interface StartPickingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (checkerId: number) => Promise<void>;
    batchNo: string;
}

export function StartPickingDialog({ isOpen, onClose, onConfirm, batchNo }: StartPickingDialogProps) {
    const [checkers, setCheckers] = useState<WarehouseUser[]>([]);
    const [selectedChecker, setSelectedChecker] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingUsers(true);
            setFetchError(false);

            // 🚀 Fetching specifically for Warehouse Department (ID: 5)
            fetchAllUsers(5)
                .then((data) => {
                    setCheckers(Array.isArray(data) ? data : []);
                })
                .catch((err) => {
                    console.error("VOS: Failed to fetch warehouse checkers", err);
                    setFetchError(true);

                    // 🚀 Sonner Error Toast
                    toast.error("Connection Error", {
                        description: "Failed to retrieve warehouse personnel.",
                    });
                })
                .finally(() => setIsLoadingUsers(false));
        } else {
            // 🚀 Reset selection when closed
            setSelectedChecker("");
        }
    }, [isOpen]); // Removed 'toast' from dependencies since Sonner imports it globally

    const handleConfirm = async () => {
        if (!selectedChecker) return;
        setIsSubmitting(true);
        try {
            await onConfirm(Number(selectedChecker));

            // 🚀 Sonner SUCCESS TOAST
            toast.success("SYSTEM PROTOCOL ENGAGED", {
                description: `Batch ${batchNo} is now active. Generating manifest...`,
                className: "bg-emerald-500 text-white border-none font-bold uppercase tracking-widest text-[10px]",
            });

        } catch (error) {
            console.error("VOS: Workflow initiation failed", error);

            // 🚀 Sonner ERROR TOAST
            toast.error("INITIALIZATION FAILED", {
                description: "The system could not lock the batch. Please try again.",
                className: "font-bold uppercase tracking-widest text-[10px]",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] border-none shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] bg-card/95 backdrop-blur-xl rounded-[2.5rem] p-0 overflow-hidden">
                <DialogHeader className="p-8 pb-0">
                    <DialogTitle className="text-4xl font-black uppercase tracking-tighter flex items-center gap-4 italic leading-none">
                        <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                            <Shield className="w-10 h-10 text-primary animate-pulse stroke-[2.5px]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-primary text-sm tracking-[0.3em] not-italic mb-1 uppercase font-bold">Initialization</span>
                            <span>Start <span className="text-primary">Picking</span></span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 pt-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1 opacity-70">
                            Assign Warehouse Checker
                        </label>

                        {fetchError ? (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-widest border border-destructive/20">
                                <AlertCircle className="h-4 w-4" /> Connection to Personnel API Failed
                            </div>
                        ) : (
                            <Select onValueChange={setSelectedChecker} value={selectedChecker} disabled={isLoadingUsers || isSubmitting}>
                                <SelectTrigger className="h-16 bg-background/40 border-border/40 font-bold rounded-2xl ring-offset-background focus:ring-primary/20 transition-all text-base px-5">
                                    {isLoadingUsers ? (
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span className="animate-pulse">Accessing Personnel...</span>
                                        </div>
                                    ) : (
                                        <SelectValue placeholder="Identify Checker" />
                                    )}
                                </SelectTrigger>
                                <SelectContent className="bg-card/98 backdrop-blur-2xl border-border/40 rounded-2xl max-h-[350px] shadow-2xl">
                                    {checkers.length > 0 ? (
                                        checkers.map((user) => (
                                            <SelectItem
                                                key={user.user_id}
                                                value={user.user_id.toString()}
                                                className="font-bold py-4 px-4 focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer border-b border-border/10 last:border-0 group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <UserCircle2 className="w-5 h-5 opacity-40 group-focus:opacity-100" />
                                                    <div className="flex flex-col text-left">
                                                        <span className="uppercase text-sm leading-tight tracking-tight">
                                                            {user.user_fname} {user.user_lname}
                                                        </span>
                                                        <span className="text-[9px] text-muted-foreground font-medium uppercase opacity-60 tracking-widest">
                                                            {user.user_position || "Warehouse Staff"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : !isLoadingUsers && (
                                        <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                                            No Personnel found in Dept 5
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="relative group overflow-hidden bg-primary/[0.03] p-6 rounded-[2rem] border border-primary/10 space-y-4">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <AlertTriangle className="w-12 h-12 text-primary" />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">System Protocol: {batchNo}</p>
                        </div>
                        <ul className="text-xs font-bold text-muted-foreground/80 space-y-3 leading-relaxed">
                            <li className="flex gap-3 items-start italic">
                                <span className="text-primary mt-0.5">•</span>
                                Lock batch and notify assigned suppliers.
                            </li>
                            <li className="flex gap-3 items-start italic">
                                <span className="text-primary mt-0.5">•</span>
                                Map picking tasks to inherited supplier pickers.
                            </li>
                            <li className="flex gap-3 items-start italic">
                                <span className="text-primary mt-0.5">•</span>
                                Activate tablet interface for designated personnel.
                            </li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 font-black uppercase text-[10px] tracking-widest opacity-40 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive h-14 rounded-2xl transition-all"
                    >
                        Abort
                    </Button>
                    <Button
                        disabled={!selectedChecker || isSubmitting}
                        onClick={handleConfirm}
                        className="flex-[2] h-14 px-8 gap-3 font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 text-xs group"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin h-5 w-5" />
                        ) : (
                            <>
                                <Play className="h-4 w-4 fill-current group-hover:translate-x-1 transition-transform" />
                                Begin Workflow
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}