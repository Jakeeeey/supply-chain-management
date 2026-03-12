"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, FileText, AlertCircle, CheckCircle2, Truck, User } from "lucide-react";

import type { KioskDispatchPlan } from "../types";
import { useArrivalDetails, type DeliveryStatus } from "../hooks/useArrivalDetails";

interface ArrivalDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: KioskDispatchPlan | null;
    onConfirm: (deliveryStatuses?: Record<string, DeliveryStatus>, remarks?: string) => Promise<void>;
    isConfirming: boolean;
}

export function ArrivalDetailsModal({
    open,
    onOpenChange,
    plan,
    onConfirm,
    isConfirming,
}: ArrivalDetailsModalProps) {
    const { loading, customers, deliveryStatuses, error, handleStatusChange, fetchData } =
        useArrivalDetails(plan, open);
    const [remarks, setRemarks] = React.useState("");

    if (!plan) return null;

    const disableConfirm = isConfirming || loading || !!error;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-24px)] sm:max-w-[850px] md:max-w-[950px] lg:max-w-[1050px] rounded-2xl overflow-hidden p-0 border shadow-2xl flex flex-col max-h-[90vh]">
                {/* subtle top accent (like step modal style) */}
                <div className="h-1.5 w-full bg-red-500" />

                {/* Header */}
                <DialogHeader className="px-6 sm:px-8 py-6 border-b bg-background shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <DialogTitle className="text-xl sm:text-2xl font-black flex items-center gap-3 tracking-tight text-foreground">
                                <CheckCircle2 className="h-6 w-6 text-red-500" />
                                Confirm Arrival Details
                            </DialogTitle>

                            <p className="mt-1.5 text-sm sm:text-base text-muted-foreground font-medium pl-9">
                                Feedback for <span className="text-foreground font-bold">{plan.doc_no}</span>
                            </p>
                        </div>

                        {/* compact chips like 2nd image */}
                        <div className="hidden sm:flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border bg-muted/20">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-black uppercase tracking-wider">{plan.vehicle_plate}</span>
                            </div>
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border bg-muted/20">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-black uppercase tracking-wider">{plan.driver_name}</span>
                            </div>
                        </div>
                    </div>

                    {/* mobile chips */}
                    <div className="sm:hidden mt-4 flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/30">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-black uppercase tracking-wider">{plan.vehicle_plate}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/30">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-black uppercase tracking-wider">{plan.driver_name}</span>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-hidden bg-background">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3">
                            <Loader2 className="h-9 w-9 animate-spin text-red-500" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Loading arrival data...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-14 space-y-3 text-center px-6">
                            <AlertCircle className="h-10 w-10 text-destructive/60" />
                            <div className="space-y-1">
                                <p className="font-black text-base text-foreground">Sync Failed</p>
                                <p className="text-sm text-muted-foreground font-medium">{error}</p>
                            </div>
                            <Button variant="outline" size="lg" onClick={fetchData} className="rounded-xl font-bold px-8">
                                Retry
                            </Button>
                        </div>
                    ) : customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                            <FileText className="h-12 w-12 text-muted-foreground/20" />
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                                No customers found
                            </p>
                        </div>
                    ) : (
                        <div className="p-6 sm:p-8">
                            <div className="rounded-2xl border overflow-hidden bg-background">
                                {/* Keep the header visible + avoid the huge white middle */}
                                <ScrollArea className="max-h-[52vh]">
                                    <table className="w-full text-left border-collapse">
                                        <colgroup>
                                            <col />
                                            <col style={{ width: 140 }} />
                                            <col style={{ width: 140 }} />
                                            <col style={{ width: 140 }} />
                                        </colgroup>

                                        <thead className="sticky top-0 z-10 bg-muted/30 border-b">
                                            <tr>
                                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                                                    Customer
                                                </th>
                                                <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-red-600 text-center">
                                                    Not Delivered
                                                </th>
                                                <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-orange-600 text-center">
                                                    Has Concern
                                                </th>
                                                <th className="px-3 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600 text-center">
                                                    Has Return
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y">
                                            {customers.map((customer) => {
                                                const code = customer.customer_code;
                                                const selected = deliveryStatuses[code];

                                                return (
                                                    <tr key={code} className="hover:bg-muted/10 transition-colors">
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-start gap-3 min-w-0">
                                                                <div className="h-10 w-10 mt-0.5 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center shrink-0">
                                                                    <Users className="h-4 w-4 text-red-600" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="text-sm font-black text-foreground uppercase truncate">
                                                                        {customer.customer_name}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-muted-foreground/70 tracking-widest uppercase mb-1.5">
                                                                        Code: {code}
                                                                    </div>
                                                                    {customer.invoices && customer.invoices.length > 0 && (
                                                                        <ul className="mt-2 list-disc list-inside text-xs font-semibold text-muted-foreground/80 tracking-wide space-y-1">
                                                                            {customer.invoices.map((inv, idx) => (
                                                                                <li key={idx}>
                                                                                    {inv.no} &mdash; <span className="font-bold text-foreground/80">₱{inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-3 py-4 text-center align-middle">
                                                            <Checkbox
                                                                checked={selected === "not_delivered"}
                                                                onCheckedChange={() => handleStatusChange(code, "not_delivered")}
                                                                className="h-8 w-8 rounded-xl border-2 border-muted-foreground/30 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 data-[state=checked]:text-white [&_svg]:h-5 [&_svg]:w-5 shadow-sm transition-all"
                                                            />
                                                        </td>

                                                        <td className="px-3 py-4 text-center align-middle">
                                                            <Checkbox
                                                                checked={selected === "has_concern"}
                                                                onCheckedChange={() => handleStatusChange(code, "has_concern")}
                                                                className="h-8 w-8 rounded-xl border-2 border-muted-foreground/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 data-[state=checked]:text-white [&_svg]:h-5 [&_svg]:w-5 shadow-sm transition-all"
                                                            />
                                                        </td>

                                                        <td className="px-3 py-4 text-center align-middle">
                                                            <Checkbox
                                                                checked={selected === "has_return"}
                                                                onCheckedChange={() => handleStatusChange(code, "has_return")}
                                                                className="h-8 w-8 rounded-xl border-2 border-muted-foreground/30 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500 data-[state=checked]:text-white [&_svg]:h-5 [&_svg]:w-5 shadow-sm transition-all"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </ScrollArea>
                            </div>

                            {/* REMARKS FIELD */}
                            <div className="mt-5">
                                <Input
                                    placeholder="Add any additional remarks here..."
                                    className="rounded-xl border-muted-foreground/30 focus-visible:ring-red-500 h-11 bg-muted/10 shadow-sm"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-5 border-t bg-background shrink-0">
                    <Button
                        variant="ghost"
                        className="h-11 px-6 rounded-xl font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
                        onClick={() => onOpenChange(false)}
                        disabled={isConfirming}
                    >
                        Cancel
                    </Button>

                    <Button
                        className="h-11 px-7 rounded-xl font-black text-xs sm:text-sm uppercase tracking-[0.12em] !text-white !bg-red-600 hover:!bg-red-700 border-none"
                        onClick={() => onConfirm(deliveryStatuses, remarks)}
                        disabled={disableConfirm}
                    >
                        {isConfirming ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            "Confirm Arrival"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}