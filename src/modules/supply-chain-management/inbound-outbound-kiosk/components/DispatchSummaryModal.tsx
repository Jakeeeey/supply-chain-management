"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KioskDispatchPlan } from "../types";
import { Loader2, Users, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DispatchSummaryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: KioskDispatchPlan | null;
    onConfirm: () => Promise<void>;
    isConfirming: boolean;
}

interface CustomerSummary {
    customer_code: string;
    customer_name: string;
    invoice_count: number;
}

export function DispatchSummaryModal({
    open,
    onOpenChange,
    plan,
    onConfirm,
    isConfirming
}: DispatchSummaryModalProps) {
    const [loading, setLoading] = React.useState(false);
    const [summaries, setSummaries] = React.useState<CustomerSummary[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!plan || !open) return;

        setLoading(true);
        setError(null);
        try {
            // 1. Fetch invoices for this plan - Calling the base API with plan_id
            const invoicesRes = await fetch(`/api/scm/inbound-outbound-kiosk?plan_id=${plan.id}`);
            if (!invoicesRes.ok) throw new Error("Failed to fetch dispatch invoices");
            const invoicesData = await invoicesRes.json();

            // invoicesData is expected to be an array of { invoice_id: number, ... }
            const invoiceIds = invoicesData.map((inv: any) => inv.invoice_id);

            if (invoiceIds.length === 0) {
                setSummaries([]);
                setLoading(false);
                return;
            }

            // 2. Fetch sales invoices to get customer codes - Calling base API with action
            const salesInvoicesRes = await fetch(`/api/scm/inbound-outbound-kiosk?action=sales-invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoice_ids: invoiceIds })
            });
            if (!salesInvoicesRes.ok) throw new Error("Failed to fetch sales invoices");
            const salesInvoicesData = await salesInvoicesRes.json();

            // 3. Group by customer code and count
            const customerCounts: Record<string, number> = {};
            salesInvoicesData.forEach((si: any) => {
                const code = si.customer_code;
                customerCounts[code] = (customerCounts[code] || 0) + 1;
            });

            // 4. Fetch customer details - Calling base API with action
            const customerCodes = Object.keys(customerCounts);
            const customersRes = await fetch(`/api/scm/inbound-outbound-kiosk?action=customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_codes: customerCodes })
            });
            if (!customersRes.ok) throw new Error("Failed to fetch customer details");
            const customersData = await customersRes.json();

            const customerMap: Record<string, string> = {};
            customersData.forEach((c: any) => {
                customerMap[c.customer_code] = c.store_name || c.customer_name;
            });

            const finalSummaries: CustomerSummary[] = customerCodes.map(code => ({
                customer_code: code,
                customer_name: customerMap[code] || code,
                invoice_count: customerCounts[code]
            }));

            setSummaries(finalSummaries);
        } catch (err: any) {
            console.error("Error fetching summary data:", err);
            setError(err.message || "An unexpected error occurred");
            toast.error("Failed to load dispatch summary");
        } finally {
            setLoading(false);
        }
    }, [plan, open]);

    React.useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open, fetchData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[550px] w-full rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
                <div className="h-1.5 w-full bg-emerald-500" />

                <div className="bg-background">
                    <DialogHeader className="px-6 py-4 border-b border-border/40">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-500" />
                            Dispatch Summary
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground font-medium">
                            Review customer invoice counts before final dispatch
                        </p>
                    </DialogHeader>

                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                <p className="text-sm font-medium text-muted-foreground tracking-tight">Gathering dispatch data...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                                <AlertCircle className="h-10 w-10 text-destructive/50" />
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground">Failed to load data</p>
                                    <p className="text-xs text-muted-foreground max-w-[200px]">{error}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
                                    Try Again
                                </Button>
                            </div>
                        ) : summaries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                                <FileText className="h-10 w-10 text-muted-foreground/30" />
                                <p className="text-sm font-medium text-muted-foreground">No invoices found for this dispatch.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">
                                    <span>Customer Information</span>
                                    <span>Invoices</span>
                                </div>
                                {summaries.map((summary) => (
                                    <div
                                        key={summary.customer_code}
                                        className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground line-clamp-1">{summary.customer_name}</span>
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{summary.customer_code}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-lg font-black text-emerald-600">{summary.invoice_count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end px-6 py-4 bg-muted/10 border-t border-border/30 gap-3">
                        <Button
                            variant="outline"
                            className="h-10 px-6 rounded-lg font-bold text-xs uppercase tracking-wider"
                            onClick={() => onOpenChange(false)}
                            disabled={isConfirming}
                        >
                            Back
                        </Button>
                        <Button
                            className="h-10 px-6 rounded-lg font-bold text-xs uppercase tracking-[0.05em] transition-all shadow-md !text-white !bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-500/40"
                            onClick={onConfirm}
                            disabled={isConfirming || loading || !!error}
                        >
                            {isConfirming ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Confirming...
                                </>
                            ) : "Confirm Dispatch"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
