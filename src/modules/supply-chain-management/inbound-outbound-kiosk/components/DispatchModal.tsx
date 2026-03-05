"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KioskDispatchPlan } from "../types";
import { format } from "date-fns";
import { Calendar, Truck, User, Fingerprint, CheckCircle2, ArrowRight } from "lucide-react";
import { DispatchSummaryModal } from "./DispatchSummaryModal";
import { ArrivalDetailsModal } from "./ArrivalDetailsModal";



import { toast } from "sonner";

interface DispatchModalProps {
    plan: KioskDispatchPlan | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function DispatchModal({ plan, open, onOpenChange, onSuccess }: DispatchModalProps) {
    const [rfid, setRfid] = React.useState("");
    const [driverChecked, setDriverChecked] = React.useState(false);
    const [verifiedHelperRfids, setVerifiedHelperRfids] = React.useState<string[]>([]);
    const [isConfirming, setIsConfirming] = React.useState(false);

    // Identity states
    const [isLookingUp, setIsLookingUp] = React.useState(false);
    const [subUser, setSubUser] = React.useState<{ user_id: number; name: string; rfid: string } | null>(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = React.useState(false);
    const [showSummaryModal, setShowSummaryModal] = React.useState(false);
    const [showArrivalSummaryModal, setShowArrivalSummaryModal] = React.useState(false);



    // Overrides for substitution
    const [driverOverride, setDriverOverride] = React.useState<{ name: string; rfid: string; id: number } | null>(null);
    const [helperOverrides, setHelperOverrides] = React.useState<{ name: string; rfid: string; id: number }[]>([]);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const processingRef = React.useRef(false);

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (open) {
            setRfid("");
            setDriverChecked(false);
            setVerifiedHelperRfids([]);
            setDriverOverride(null);
            setHelperOverrides([]);
            setIsConfirming(false);
            setShowSummaryModal(false);
            setShowArrivalSummaryModal(false);
        }


    }, [open]);

    // Focus management effect
    React.useEffect(() => {
        if (open && !isRoleModalOpen && !isLookingUp) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open, isRoleModalOpen, isLookingUp]);

    const handleInputBlur = () => {
        // Aggressively refocus if modal is open and not role selecting/confirming
        if (open && !isRoleModalOpen && !isConfirming && !isLookingUp) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
        }
    };

    const handleUnknownRfid = React.useCallback(async (scannedRfid: string) => {
        setIsLookingUp(true);
        try {
            const response = await fetch("/api/scm/inbound-outbound-kiosk/lookup-rfid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rfid: scannedRfid })
            });

            if (response.ok) {
                const data = await response.json();
                setSubUser(data);
                setIsRoleModalOpen(true);
            } else if (response.status === 404) {
                toast.error("RFID not recognized in system", {
                    description: "Please use an authorized driver or helper card."
                });
            } else {
                toast.error("RFID Lookup failed", {
                    description: "There was a problem checking the database."
                });
            }
        } catch (error) {
            console.error("RFID lookup failed:", error);
            toast.error("Connection Error", {
                description: "Could not reach the identity server."
            });
        } finally {
            setIsLookingUp(false);
            setRfid("");
        }
    }, []);

    const processRfid = React.useCallback(async (value: string) => {
        if (!plan || !value || processingRef.current) return;

        processingRef.current = true;
        try {
            const cleanRfid = value.trim();
            const cleanRfidLower = cleanRfid.toLowerCase();

            // 0. Check for duplicate assignment
            const activeDriverRfid = driverOverride?.rfid || plan.driver_rfid;
            const activeHelperRfids = [
                ...plan.helpers.map(h => h.rf_id),
                ...helperOverrides.map(ho => ho.rfid)
            ];

            if (driverChecked && cleanRfidLower === activeDriverRfid?.toLowerCase()) {
                toast.info("RFID already assigned", { description: "Verified as Driver" });
                setRfid("");
                return;
            }

            if (activeHelperRfids.some(r => r?.toLowerCase() === cleanRfidLower)) {
                if (verifiedHelperRfids.some(r => r.toLowerCase() === cleanRfidLower)) {
                    toast.info("RFID already assigned", { description: "Verified as Helper" });
                    setRfid("");
                    return;
                }
                // If it's a planned helper but not yet verified, we'll verify it in section 2
            }

            // 1. Check if matches assigned Driver
            if (plan.driver_rfid && cleanRfidLower === plan.driver_rfid.toLowerCase()) {
                setDriverChecked(true);
                setRfid("");
                toast.success("Driver Verified", {
                    description: plan.driver_name
                });
                return;
            }

            // 2. Check if matches any assigned Helper
            const matchingHelper = plan.helpers.find(h => h.rf_id?.toLowerCase() === cleanRfidLower);
            if (matchingHelper && matchingHelper.rf_id) {
                setVerifiedHelperRfids(prev => Array.from(new Set([...prev, matchingHelper.rf_id!])));
                setRfid("");
                toast.success("Helper Verified", {
                    description: matchingHelper.name
                });
                return;
            }

            // 3. If no match, check if substitution is allowed (Only for Dispatch)
            if (isDispatch) {
                await handleUnknownRfid(cleanRfid);
            } else {
                toast.error("Unauthorized Staff", {
                    description: "RFID does not match the assigned staff for this arrival."
                });
                setRfid("");
            }
        } finally {
            processingRef.current = false;
        }
    }, [plan, handleUnknownRfid]);

    // Debounce effect for scanning
    React.useEffect(() => {
        if (!rfid) return;

        const timer = setTimeout(() => {
            processRfid(rfid);
        }, 200); // Fast 200ms debounce for kiosk scanners

        return () => clearTimeout(timer);
    }, [rfid, processRfid]);

    if (!plan) return null;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && rfid) {
            processRfid(rfid);
        }
    };

    const handleRoleSelect = (role: "Driver" | "Helper") => {
        if (!subUser) return;

        // Check if this user is already assigned to the OTHER role
        const isAlreadyDriver = driverChecked && (driverOverride?.rfid?.toLowerCase() === subUser.rfid.toLowerCase() || plan.driver_rfid?.toLowerCase() === subUser.rfid.toLowerCase());
        const isAlreadyHelper = verifiedHelperRfids.some(r => r.toLowerCase() === subUser.rfid.toLowerCase());

        if (role === "Driver" && isAlreadyHelper) {
            toast.error("User already assigned", {
                description: `${subUser.name} is already verified as Helper.`
            });
            return;
        }

        if (role === "Helper" && isAlreadyDriver) {
            toast.error("User already assigned", {
                description: `${subUser.name} is already verified as Driver.`
            });
            return;
        }

        if (role === "Driver") {
            setDriverOverride({ name: subUser.name, rfid: subUser.rfid, id: subUser.user_id });
            setDriverChecked(true);
        } else {
            // Append another helper instead of substituting
            setHelperOverrides(prev => [...prev, { name: subUser.name, rfid: subUser.rfid, id: subUser.user_id }]);
            setVerifiedHelperRfids(prev => Array.from(new Set([...prev, subUser.rfid])));
        }

        setIsRoleModalOpen(false);
        setSubUser(null);
    };

    const statusLower = (plan?.status || "").trim().toLowerCase();
    const isDispatch = statusLower === "for dispatch";
    const isInbound = statusLower === "for inbound";

    const currentDriverName = driverOverride?.name || plan?.driver_name || "No Driver";

    // Explicit color mapping for Tailwind stability
    const colors = {
        emerald: {
            bar: "bg-emerald-500",
            text: "text-emerald-600",
            border: "border-emerald-200",
            button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
            check: "data-[state=checked]:bg-emerald-500",
            focus: "focus-visible:ring-emerald-500/20",
            icon: "text-emerald-500",
            iconBg: "bg-emerald-50"
        },
        red: {
            bar: "bg-red-500",
            text: "text-red-600",
            border: "border-red-200",
            button: "bg-red-600 hover:bg-red-700 shadow-red-500/20",
            check: "data-[state=checked]:bg-red-500",
            focus: "focus-visible:ring-red-500/20",
            icon: "text-red-500",
            iconBg: "bg-red-50"
        },
        primary: {
            bar: "bg-primary",
            text: "text-primary",
            border: "border-primary/20",
            button: "bg-primary hover:bg-primary/90 shadow-primary/20",
            check: "data-[state=checked]:bg-primary",
            focus: "focus-visible:ring-primary/20",
            icon: "text-primary",
            iconBg: "bg-primary/5"
        }
    };

    const theme = isDispatch ? colors.emerald : isInbound ? colors.red : colors.primary;

    const canConfirm = isConfirming ? false : (
        isDispatch
            ? (driverChecked && verifiedHelperRfids.length > 0)
            : driverChecked
    );

    const handleConfirm = async (deliveryStatuses?: Record<string, string | null>, remarks?: string) => {
        if (isDispatch && !showSummaryModal) {
            setShowSummaryModal(true);
            return;
        }
        if (isInbound && !showArrivalSummaryModal) {
            setShowArrivalSummaryModal(true);
            return;
        }
        setIsConfirming(true);

        try {
            const nextStatus = isDispatch ? "For Inbound" : isInbound ? "For Clearance" : plan.status;

            const response = await fetch("/api/scm/inbound-outbound-kiosk", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan_id: plan.id,
                    status: nextStatus,
                    driver_id: driverOverride?.id || plan.driver_id, // Ensure driver_id is always passed
                    helper_ids: helperOverrides.map(h => h.id), // Send all new helpers
                    driver_verified: driverChecked,
                    helper_verified_rfids: verifiedHelperRfids, // Send all verified RFIDs (original + overrides)
                    [isDispatch ? "time_of_dispatch" : "time_of_arrival"]: new Date().toISOString(), // Correct timestamp field based on mode
                    deliveryStatuses,
                    remarks
                })
            });

            if (response.ok) {
                onSuccess?.();
                onOpenChange(false);
            } else {
                console.error("Confirmation failed:", await response.text());
            }
        } catch (error) {
            console.error("Error during confirmation:", error);
            setIsConfirming(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[500px] w-full rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
                    {/* Status bar at the top as a subtle accent */}
                    <div className={`h-1.5 w-full ${theme.bar}`} />

                    <div className="bg-background">
                        <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border/40">
                            <DialogTitle className="text-xl font-bold text-foreground">
                                {isDispatch ? "Confirm Dispatch" : isInbound ? "Confirm Arrival" : "Staff Verification"}
                            </DialogTitle>
                            <div className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border shadow-sm ${theme.text} ${theme.border} bg-white dark:bg-muted/30`}>
                                {plan.status}
                            </div>
                        </DialogHeader>

                        <div className="p-6 space-y-6">
                            {/* PDP Info Section - Reference Grid Style */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        DP Number <span className="text-red-500"></span>
                                    </label>
                                    <p className="text-base font-bold text-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/20">
                                        {plan.doc_no}
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        Vehicle Plate <span className="text-red-500"></span>
                                    </label>
                                    <p className="text-base font-bold text-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/20">
                                        {plan.vehicle_plate || "N/A"}
                                    </p>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                        {isDispatch ? "Estimated Dispatch Date" : isInbound ? "Estimated Arrival Date" : "Encoded Date"}
                                    </label>
                                    <div className="flex items-center gap-2 bg-muted/20 px-3 py-2 rounded-lg border border-border/10">
                                        <Calendar className={`h-4 w-4 ${theme.text} opacity-70`} />
                                        <span className="text-sm font-medium">
                                            {isDispatch && plan.estimated_time_of_dispatch
                                                ? format(new Date(plan.estimated_time_of_dispatch), "MMMM dd, yyyy")
                                                : isInbound && plan.estimated_time_of_arrival
                                                    ? format(new Date(plan.estimated_time_of_arrival), "MMMM dd, yyyy")
                                                    : plan.date_encoded ? format(new Date(plan.date_encoded), "MMMM dd, yyyy") : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Cards */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Identity Verification</label>

                                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group ${driverChecked
                                    ? (driverOverride ? "bg-amber-500/10 border-amber-500/30 shadow-sm" : `${theme.iconBg} ${theme.border} shadow-sm`)
                                    : "bg-muted/20 border-border/30"}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center border shadow-sm transition-all duration-300 ${driverChecked ? `${theme.iconBg} ${theme.border}` : "bg-background border-border/40"}`}>
                                            <User className={`h-5 w-5 ${driverChecked ? theme.icon : "text-muted-foreground"}`} />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Driver</span>
                                                {driverOverride && <span className="text-[10px] text-orange-500 uppercase font-bold">Substituted</span>}
                                                {driverChecked && !driverOverride && (
                                                    <span className={`flex items-center gap-1 text-[10px] text-orange-500 uppercase font-bold`}>
                                                        <CheckCircle2 className="h-3 w-3" /> Verified
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-sm font-bold transition-colors ${driverChecked ? "text-foreground" : "text-muted-foreground"}`}>
                                                {currentDriverName}
                                            </span>
                                        </div>
                                    </div>
                                    <Checkbox
                                        checked={driverChecked}
                                        className={`h-6 w-6 rounded-md ${theme.check} shadow-sm border-2`}
                                        disabled
                                    />
                                </div>

                                {plan?.helpers?.map((h, i) => {
                                    const isVerified = verifiedHelperRfids.includes(h.rf_id || "");
                                    return (
                                        <div key={`planned-helper-${i}`} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group ${isVerified
                                            ? `${theme.iconBg} ${theme.border} shadow-sm`
                                            : "bg-muted/20 border-border/30"}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center border shadow-sm transition-all duration-300 ${isVerified ? `${theme.iconBg} ${theme.border}` : "bg-background border-border/40"}`}>
                                                    <User className={`h-5 w-5 ${isVerified ? theme.icon : "text-muted-foreground"}`} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Helper</span>
                                                        {isVerified && (
                                                            <span className="flex items-center gap-1 text-[10px] text-orange-500 uppercase font-bold">
                                                                <CheckCircle2 className="h-3 w-3" /> Verified
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-bold transition-colors ${isVerified ? "text-foreground" : "text-muted-foreground"}`}>
                                                        {h.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <Checkbox
                                                checked={isVerified}
                                                className={`h-6 w-6 rounded-md ${theme.check} shadow-sm border-2`}
                                                disabled
                                            />
                                        </div>
                                    );
                                })}

                                {helperOverrides.map((ho, i) => (
                                    <div key={`sub-helper-${i}`} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group bg-amber-500/10 border-amber-500/30 shadow-sm`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center border shadow-sm transition-all duration-300 bg-amber-500/5 border-amber-500/20`}>
                                                <User className={`h-5 w-5 text-amber-500`} />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tight">Helper</span>
                                                    <span className="text-[10px] text-orange-500 uppercase font-bold">Substituted</span>
                                                </div>
                                                <span className={`text-sm font-bold text-foreground`}>
                                                    {ho.name}
                                                </span>
                                            </div>
                                        </div>
                                        <Checkbox
                                            checked={true}
                                            className={`h-6 w-6 rounded-md data-[state=checked]:bg-amber-500 shadow-sm border-2`}
                                            disabled
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* RFID Field - Reference Search Style */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">RFID Identification</label>
                                <div className="relative group/input">
                                    <Fingerprint className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${rfid ? theme.text : "text-muted-foreground opacity-50"} ${isLookingUp ? "animate-pulse" : ""}`} />
                                    <Input
                                        ref={inputRef}
                                        placeholder={isLookingUp ? "Looking up RFID..." : "Scan Driver/Helper RFID..."}
                                        className={`pl-11 h-12 rounded-xl border-border/60 bg-muted/10 text-sm font-medium transition-all ${theme.focus} focus:bg-background`}
                                        value={rfid}
                                        onChange={(e) => setRfid(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onBlur={handleInputBlur}
                                        disabled={isLookingUp || isConfirming}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground/60 px-1">Scan RFID card to automatically verify identity.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end px-6 py-4 bg-muted/10 border-t border-border/30 gap-3">
                            <Button
                                variant="outline"
                                className="h-10 px-6 rounded-lg font-bold text-xs uppercase tracking-wider"
                                onClick={() => onOpenChange(false)}
                                disabled={isConfirming}
                            >
                                Cancel
                            </Button>
                            <Button
                                className={`h-10 px-6 rounded-lg font-bold text-xs uppercase tracking-[0.05em] transition-all shadow-md ${canConfirm
                                    ? `!text-white ${isDispatch ? "!bg-emerald-600 shadow-emerald-500/40" : "!bg-red-600 shadow-red-500/40"} cursor-pointer`
                                    : "bg-muted text-muted-foreground opacity-40 pointer-events-none"
                                    }`}
                                onClick={() => handleConfirm()}
                                disabled={isConfirming || !canConfirm}
                            >
                                {isConfirming ? "Processing..." : (isDispatch || isInbound) ? (
                                    <>
                                        Next
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                ) : "Process"}

                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <DispatchSummaryModal
                open={showSummaryModal}
                onOpenChange={setShowSummaryModal}
                plan={plan}
                onConfirm={(_, remarks) => handleConfirm(undefined, remarks)}
                isConfirming={isConfirming}
            />

            <ArrivalDetailsModal
                open={showArrivalSummaryModal}
                onOpenChange={setShowArrivalSummaryModal}
                plan={plan}
                onConfirm={handleConfirm}
                isConfirming={isConfirming}
            />


            {/* Role Selection Secondary Dialog */}

            <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
                <DialogContent className="max-w-[440px] rounded-[32px] p-0 overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,0.6)] border border-border/10 bg-background">
                    <div className="bg-amber-500 h-2 w-full animate-pulse" />
                    <div className="p-10 space-y-10">
                        <div className="text-center space-y-6">
                            <div className="h-24 w-24 bg-amber-500/10 rounded-[32px] flex items-center justify-center mx-auto mb-4 border-2 border-amber-500/20 shadow-xl shadow-amber-500/5 transition-transform hover:scale-110 duration-500">
                                <User className="h-12 w-12 text-amber-600" />
                            </div>
                            <div className="space-y-2">
                                <DialogTitle className="text-3xl font-black tracking-tight text-foreground">Assign Position</DialogTitle>
                                <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed px-4">
                                    Identify <span className="font-black text-foreground border-b-2 border-amber-500/40 pb-0.5">{subUser?.name}</span> as:
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <Button
                                className="h-24 rounded-2xl font-black uppercase tracking-[0.2em] !bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-xl shadow-emerald-500/30 border-none transition-all hover:scale-[1.02] active:scale-[0.98] text-lg flex flex-col items-center justify-center gap-1 group"
                                onClick={() => handleRoleSelect("Driver")}
                            >
                                <span className="group-hover:scale-110 transition-transform">Assigned as Driver</span>
                                <span className="text-[10px] opacity-60 font-medium tracking-widest lowercase">Primary Vehicle Control</span>
                            </Button>
                            <Button
                                className="h-24 rounded-2xl font-black uppercase tracking-[0.2em] !bg-rose-600 hover:!bg-rose-700 !text-white shadow-xl shadow-rose-500/30 border-none transition-all hover:scale-[1.02] active:scale-[0.98] text-lg flex flex-col items-center justify-center gap-1 group"
                                onClick={() => handleRoleSelect("Helper")}
                            >
                                <span className="group-hover:scale-110 transition-transform">Assigned as Helper</span>
                                <span className="text-[10px] opacity-60 font-medium tracking-widest lowercase">Support & Verification</span>
                            </Button>
                        </div>

                        <div className="pt-2 text-center">
                            <button
                                className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 hover:text-destructive transition-all hover:tracking-[0.5em] py-2 px-8 rounded-full hover:bg-destructive/5"
                                onClick={() => setIsRoleModalOpen(false)}
                            >
                                Discard Identity Change
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
