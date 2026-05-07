"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { KioskDispatchPlan, UserOption, CustomerDispatchInfo } from "../types";
import { Truck, User, ArrowRight, Loader2, Plus, X, Calendar, MapPin, FileText, Users } from "lucide-react";
import { fetchProvider } from "../providers/fetchProvider";
import { toast } from "sonner";
import { SearchableSelect } from "./SearchableSelect";

interface ManualDispatchModalProps {
    plan: KioskDispatchPlan | null;
    users: UserOption[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ManualDispatchModal({ plan, users, open, onOpenChange, onSuccess }: ManualDispatchModalProps) {
    const [step, setStep] = React.useState<1 | 2>(1);
    const [driverId, setDriverId] = React.useState<string>("");
    const [driverPresent, setDriverPresent] = React.useState(true);
    const [helperConfig, setHelperConfig] = React.useState<{id: number, present: boolean}[]>([]);
    const [dispatchDate, setDispatchDate] = React.useState("");
    const [remarks, setRemarks] = React.useState("");
    const [customers, setCustomers] = React.useState<CustomerDispatchInfo[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const fetchCustomers = React.useCallback(async () => {
        if (!plan) return;
        setIsLoadingCustomers(true);
        try {
            const data = await fetchProvider.getCustomers(plan.id, plan.doc_no);
            setCustomers(data);
        } catch {
            toast.error("Failed to load delivery details");
        } finally {
            setIsLoadingCustomers(false);
        }
    }, [plan]);

    React.useEffect(() => {
        if (open && plan) {
            setStep(1);
            setDriverId(plan.driver_id.toString());
            setDriverPresent(true);
            setHelperConfig(plan.helpers.map(h => ({ id: h.user_id, present: true })));
            setRemarks("");
            
            // Set current local time for datetime-local input
            const now = new Date();
            const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setDispatchDate(localIso);
            fetchCustomers();
        }
    }, [open, plan, fetchCustomers]);

    if (!plan) return null;

    const handleAddHelper = () => {
        setHelperConfig(prev => [...prev, { id: 0, present: true }]);
    };

    const handleUpdateHelper = (index: number, id: number) => {
        const newConfig = [...helperConfig];
        newConfig[index].id = id;
        setHelperConfig(newConfig);
    };

    const handleToggleHelperPresence = (index: number) => {
        const newConfig = [...helperConfig];
        newConfig[index].present = !newConfig[index].present;
        setHelperConfig(newConfig);
    };

    const handleRemoveHelper = (index: number) => {
        setHelperConfig(prev => prev.filter((_, i) => i !== index));
    };

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            const success = await fetchProvider.confirmDispatch({
                plan_id: plan.id,
                driver_id: parseInt(driverId),
                driver_present: driverPresent,
                helpers: helperConfig.filter(h => h.id > 0).map(h => ({
                    user_id: h.id,
                    is_present: h.present
                })),
                time_of_dispatch: new Date(dispatchDate).toISOString(),
                remarks
            });

            if (success) {
                toast.success("Trip dispatched successfully");
                onSuccess?.();
                onOpenChange(false);
            } else {
                toast.error("Failed to confirm dispatch");
            }
        } catch {
            toast.error("An error occurred during confirmation");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
                <div className="h-1.5 w-full bg-emerald-500 shrink-0" />
                
                <DialogHeader className="px-6 py-6 border-b bg-background/50 backdrop-blur-sm shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight">
                                {step === 1 ? "Verify Personnel" : "Dispatch Summary"}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground font-medium mt-1">
                                {plan.doc_no} • {plan.vehicle_plate}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <Truck className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Assigned Driver</Label>
                                        <div className="flex items-center gap-2">
                                            <Checkbox 
                                                id="driver-present" 
                                                checked={driverPresent} 
                                                onCheckedChange={(checked) => setDriverPresent(!!checked)}
                                                className="rounded-md border-emerald-500/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                            />
                                            <Label htmlFor="driver-present" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 cursor-pointer">Present</Label>
                                        </div>
                                    </div>
                                    <SearchableSelect 
                                        options={users.map(u => ({ value: u.user_id.toString(), label: `${u.user_fname} ${u.user_lname}` }))}
                                        value={driverId}
                                        onValueChange={setDriverId}
                                        placeholder="Select Driver"
                                        disabled={!driverPresent}
                                        triggerClassName={!driverPresent ? 'opacity-50' : ''}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Assigned Helpers</Label>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-7 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/5 rounded-lg"
                                            onClick={handleAddHelper}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Helper
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {helperConfig.map((h, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <div className="flex-1 flex gap-2 items-center">
                                                    <SearchableSelect 
                                                        options={users.map(u => ({ value: u.user_id.toString(), label: `${u.user_fname} ${u.user_lname}` }))}
                                                        value={h.id.toString()}
                                                        onValueChange={(val) => handleUpdateHelper(idx, parseInt(val))}
                                                        placeholder="Select Helper"
                                                        disabled={!h.present}
                                                        triggerClassName={cn("flex-1", !h.present ? 'opacity-50' : '')}
                                                    />
                                                    <div className="flex items-center gap-2 bg-muted/5 border border-muted-foreground/10 h-12 px-3 rounded-xl">
                                                        <Checkbox 
                                                            id={`helper-${idx}-present`}
                                                            checked={h.present}
                                                            onCheckedChange={() => handleToggleHelperPresence(idx)}
                                                            className="rounded-md border-emerald-500/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                        />
                                                        <Label htmlFor={`helper-${idx}-present`} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 cursor-pointer whitespace-nowrap">Present</Label>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="h-12 w-12 rounded-xl border-muted-foreground/20 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors"
                                                    onClick={() => handleRemoveHelper(idx)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {helperConfig.length === 0 && (
                                            <div className="text-center py-8 rounded-xl border border-dashed bg-muted/5 text-muted-foreground">
                                                <p className="text-xs font-bold uppercase tracking-widest opacity-40">No Helpers Assigned</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                {/* Staff Overview */}
                                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center">
                                                <User className="h-4 w-4 text-emerald-600" />
                                            </div>
                                            <div className="flex flex-col leading-none">
                                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tight">Final Driver</span>
                                                <span className="text-sm font-black text-foreground">
                                                    {users.find(u => u.user_id.toString() === driverId)?.user_fname} {users.find(u => u.user_id.toString() === driverId)?.user_lname}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${driverPresent ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                            {driverPresent ? 'Present' : 'Absent'}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {helperConfig.filter(h => h.id > 0).map(h => (
                                            <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border/60">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-foreground/70">
                                                    {users.find(u => u.user_id === h.id)?.user_fname} {users.find(u => u.user_id === h.id)?.user_lname}
                                                </span>
                                                <div className={`h-1.5 w-1.5 rounded-full ${h.present ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Customer Information Cards */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Customer Information</Label>
                                    {isLoadingCustomers ? (
                                        <div className="flex flex-col items-center justify-center py-10 space-y-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Customers...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {customers.map((cust) => (
                                                <div key={cust.customer_code} className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
                                                                <Users className="h-5 w-5 text-emerald-600" />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <h4 className="text-sm font-black uppercase leading-tight">{cust.customer_name}</h4>
                                                                <p className="text-[10px] font-black text-muted-foreground/60 tracking-widest uppercase">{cust.customer_code}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest block mb-1">Destination Address</span>
                                                            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-foreground/80">
                                                                <MapPin className="h-3 w-3 text-emerald-500" />
                                                                <span className="max-w-[200px] truncate">{cust.address}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {cust.invoices.map((inv, idx) => (
                                                            <div key={idx} className="px-3 py-1.5 rounded-lg bg-muted/20 border border-border/40 flex items-center gap-2">
                                                                <FileText className="h-3 w-3 text-muted-foreground/60" />
                                                                <span className="text-[10px] font-bold text-foreground/70">{inv.no} — ₱{inv.amount.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {customers.length === 0 && (
                                                <div className="text-center py-10 rounded-2xl border border-dashed bg-muted/5 text-muted-foreground">
                                                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">No Delivery Data Found</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Dispatch Date & Remarks */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Dispatch Date & Time</Label>
                                        <div className="relative">
                                            <Input 
                                                type="datetime-local"
                                                className="h-14 rounded-xl border-muted-foreground/20 bg-muted/5 font-bold focus-visible:ring-emerald-500 pl-12"
                                                value={dispatchDate}
                                                onChange={(e) => setDispatchDate(e.target.value)}
                                            />
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Dispatch Remarks</Label>
                                        <Input 
                                            placeholder="Add any additional dispatch notes..." 
                                            className="h-14 rounded-xl border-muted-foreground/20 bg-muted/5 font-medium focus-visible:ring-emerald-500"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-muted/10 border-t flex items-center justify-between shrink-0">
                    <Button 
                        variant="ghost" 
                        className="rounded-xl font-black text-[10px] uppercase tracking-widest text-muted-foreground"
                        onClick={() => step === 2 ? setStep(1) : onOpenChange(false)}
                    >
                        {step === 1 ? "Cancel" : "Back"}
                    </Button>
                    <Button 
                        className="h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-[0.15em] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-none transition-all hover:scale-105 active:scale-95"
                        onClick={() => step === 1 ? setStep(2) : handleConfirm()}
                        disabled={isSubmitting || (step === 1 && (!driverId || !driverPresent || !helperConfig.some(h => h.id > 0 && h.present)))}
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                {step === 1 ? "Next Step" : "Confirm Dispatch"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
