"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { KioskDispatchPlan, CustomerArrivalInfo, DeliveryStatus } from "../types";
import { CheckCircle2, Truck, User, Loader2, AlertCircle, FileText, Users, UserCheck, Calendar, MapPin } from "lucide-react";
import { fetchProvider } from "../providers/fetchProvider";
import { toast } from "sonner";

interface ManualInboundModalProps {
    plan: KioskDispatchPlan | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ManualInboundModal({ plan, open, onOpenChange, onSuccess }: ManualInboundModalProps) {
    const [customers, setCustomers] = React.useState<CustomerArrivalInfo[]>([]);
    const [deliveryStatuses, setDeliveryStatuses] = React.useState<Record<string, DeliveryStatus>>({});
    const [driverPresent, setDriverPresent] = React.useState(true);
    const [helperPresence, setHelperPresence] = React.useState<Record<number, boolean>>({});
    const [arrivalDate, setArrivalDate] = React.useState("");
    const [remarks, setRemarks] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!plan) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchProvider.getCustomers(plan.id);
            setCustomers(data);
        } catch {
            setError("Failed to load customer details");
            toast.error("Error loading arrival details");
        } finally {
            setLoading(false);
        }
    }, [plan]);

    React.useEffect(() => {
        if (open && plan) {
            fetchData();
            setDeliveryStatuses({});
            setDriverPresent(true);
            const initialHelpers: Record<number, boolean> = {};
            plan.helpers.forEach(h => initialHelpers[h.user_id] = true);
            setHelperPresence(initialHelpers);
            setRemarks("");

            // Set current local time for datetime-local input
            const now = new Date();
            const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setArrivalDate(localIso);
        }
    }, [open, plan, fetchData]);

    if (!plan) return null;

    const handleStatusChange = (customerCode: string, status: DeliveryStatus) => {
        setDeliveryStatuses(prev => {
            const current = prev[customerCode];
            return {
                ...prev,
                [customerCode]: current === status ? null : status
            };
        });
    };

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            const success = await fetchProvider.confirmArrival({
                plan_id: plan.id,
                deliveryStatuses,
                driver_present: driverPresent,
                helpers: Object.entries(helperPresence).map(([uid, present]) => ({
                    user_id: parseInt(uid),
                    is_present: present
                })),
                time_of_arrival: new Date(arrivalDate).toISOString(),
                remarks
            });

            if (success) {
                toast.success("Arrival confirmed successfully");
                onSuccess?.();
                onOpenChange(false);
            } else {
                toast.error("Failed to confirm arrival");
            }
        } catch {
            toast.error("An error occurred during confirmation");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1100px] w-[calc(100vw-32px)] rounded-3xl overflow-hidden p-0 border-none shadow-2xl flex flex-col max-h-[90vh]">
                <div className="h-2 w-full bg-rose-500" />

                <DialogHeader className="px-8 py-8 border-b bg-background/50 backdrop-blur-md shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
                                <CheckCircle2 className="h-8 w-8 text-rose-500" />
                                Confirm Arrival
                            </DialogTitle>
                            <p className="text-muted-foreground font-medium pl-11">
                                Feedback for <span className="font-black text-foreground">{plan.doc_no}</span>
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-4 bg-muted/20 p-2 rounded-2xl border border-border/40 shrink-0">
                            <div className="flex items-center gap-3 px-4 border-r border-border/40">
                                <Truck className="h-5 w-5 text-muted-foreground" />
                                <span className="text-xs font-black uppercase tracking-widest">{plan.vehicle_plate}</span>
                            </div>
                            <div className="flex items-center gap-3 px-4">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <span className="text-xs font-black uppercase tracking-widest truncate max-w-[120px]">{plan.driver_name}</span>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-rose-500" />
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Syncing Trip Data...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <AlertCircle className="h-16 w-16 text-destructive/40" />
                            <div className="space-y-2">
                                <p className="text-xl font-black">Data Fetch Failed</p>
                                <p className="text-muted-foreground font-medium">{error}</p>
                            </div>
                            <Button variant="outline" onClick={fetchData} className="rounded-xl font-black px-8">Retry Fetch</Button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Personnel Presence Section */}
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <UserCheck className="h-5 w-5 text-rose-600" />
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Personnel Presence</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Driver Presence */}
                                        <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${driverPresent ? 'bg-rose-500/5 border-rose-500/20 shadow-sm' : 'bg-muted/30 border-border/40 opacity-60'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center">
                                                    <User className="h-5 w-5 text-rose-600" />
                                                </div>
                                                <div className="flex flex-col leading-none">
                                                    <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-tight">Driver</span>
                                                    <span className="text-sm font-black text-foreground truncate max-w-[120px]">{plan.driver_name}</span>
                                                </div>
                                            </div>
                                            <Checkbox 
                                                checked={driverPresent}
                                                onCheckedChange={(val) => setDriverPresent(!!val)}
                                                className="h-7 w-7 rounded-lg border-2 border-muted-foreground/20 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                                            />
                                        </div>

                                        {/* Helper Presence */}
                                        {plan.helpers.map(h => (
                                            <div key={h.user_id} className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${helperPresence[h.user_id] ? 'bg-rose-500/5 border-rose-500/20 shadow-sm' : 'bg-muted/30 border-border/40 opacity-60'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center">
                                                        <Users className="h-5 w-5 text-rose-600" />
                                                    </div>
                                                    <div className="flex flex-col leading-none">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-tight">Helper</span>
                                                        <span className="text-sm font-black text-foreground truncate max-w-[120px]">{h.name}</span>
                                                    </div>
                                                </div>
                                                <Checkbox 
                                                    checked={helperPresence[h.user_id]}
                                                    onCheckedChange={(val) => setHelperPresence(prev => ({ ...prev, [h.user_id]: !!val }))}
                                                    className="h-7 w-7 rounded-lg border-2 border-muted-foreground/20 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Arrival Date Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <Calendar className="h-5 w-5 text-rose-600" />
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Arrival Timeline</h3>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-muted/30 border border-border/40 space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">Arrival Date & Time</Label>
                                            <div className="relative">
                                                <Input 
                                                    type="datetime-local"
                                                    className="h-14 rounded-xl border-muted-foreground/20 bg-background/50 font-bold focus-visible:ring-rose-500 pl-12"
                                                    value={arrivalDate}
                                                    onChange={(e) => setArrivalDate(e.target.value)}
                                                />
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-border/40 bg-card/40 overflow-hidden shadow-sm backdrop-blur-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-muted/30 border-b border-border/40">
                                        <tr>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Customer / Invoices</th>
                                            <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 text-center">Not Delivered</th>
                                            <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 text-center">Has Concern</th>
                                            <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 text-center">Has Return</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {customers.map((customer) => (
                                            <tr key={customer.customer_code} className="hover:bg-muted/10 transition-colors">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center shrink-0 mt-1">
                                                            <Users className="h-5 w-5 text-rose-600" />
                                                        </div>
                                                        <div className="space-y-3 min-w-0 flex-1">
                                                            <div className="space-y-0.5">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-black uppercase truncate">{customer.customer_name}</p>
                                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40 font-bold bg-muted/50 px-2 py-0.5 rounded-md">
                                                                        <MapPin className="h-3 w-3" />
                                                                        {customer.address}
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] font-black text-muted-foreground/60 tracking-widest uppercase">CODE: {customer.customer_code}</p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {customer.invoices.map((inv, idx) => (
                                                                    <div key={idx} className="px-3 py-1 rounded-lg bg-muted/20 border border-border/40 flex items-center gap-2">
                                                                        <FileText className="h-3 w-3 text-muted-foreground/60" />
                                                                        <span className="text-[10px] font-bold text-foreground/70">{inv.no} • ₱{inv.amount.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5 text-center align-middle">
                                                    <Checkbox 
                                                        checked={deliveryStatuses[customer.customer_code] === "not_delivered"}
                                                        onCheckedChange={() => handleStatusChange(customer.customer_code, "not_delivered")}
                                                        className="h-8 w-8 rounded-xl border-2 border-muted-foreground/20 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500 [&_svg]:h-5 [&_svg]:w-5 transition-all shadow-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-5 text-center align-middle">
                                                    <Checkbox 
                                                        checked={deliveryStatuses[customer.customer_code] === "has_concern"}
                                                        onCheckedChange={() => handleStatusChange(customer.customer_code, "has_concern")}
                                                        className="h-8 w-8 rounded-xl border-2 border-muted-foreground/20 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 [&_svg]:h-5 [&_svg]:w-5 transition-all shadow-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-5 text-center align-middle">
                                                    <Checkbox 
                                                        checked={deliveryStatuses[customer.customer_code] === "has_return"}
                                                        onCheckedChange={() => handleStatusChange(customer.customer_code, "has_return")}
                                                        className="h-8 w-8 rounded-xl border-2 border-muted-foreground/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 [&_svg]:h-5 [&_svg]:w-5 transition-all shadow-sm"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2">Additional Arrival Remarks</label>
                                <Input 
                                    placeholder="Enter any notes about the arrival process..." 
                                    className="h-16 rounded-2xl border-border/40 bg-card/40 backdrop-blur-sm text-lg font-bold transition-all focus:ring-rose-500/20 focus:border-rose-500/40"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-muted/10 border-t flex items-center justify-end gap-4 shrink-0">
                    <Button 
                        variant="ghost" 
                        className="rounded-xl font-black text-[11px] uppercase tracking-widest text-muted-foreground px-8"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Discard
                    </Button>
                    <Button 
                        className="h-14 px-10 rounded-2xl font-black text-sm uppercase tracking-[0.15em] !text-white !bg-rose-600 hover:!bg-rose-700 shadow-xl shadow-rose-500/20 border-none transition-all hover:scale-105 active:scale-95"
                        onClick={handleConfirm}
                        disabled={loading || isSubmitting || !driverPresent}
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            "Confirm Arrival"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
