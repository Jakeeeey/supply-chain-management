"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KioskDispatchPlan } from "../types";
import { Loader2, Users, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DispatchSummaryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: KioskDispatchPlan | null;
    onConfirm: (deliveryStatuses?: Record<string, string | null>, remarks?: string) => Promise<void>;
    isConfirming: boolean;
}

interface CustomerInvoice {
    no: string;
    amount: number;
}

interface CustomerSummary {
    customer_code: string;
    customer_name: string;
    address: string;
    invoices: CustomerInvoice[];
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
    const [remarks, setRemarks] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!plan || !open) return;

        setLoading(true);
        setError(null);
        try {
            // 1. Fetch invoices for this plan
            const invoicesRes = await fetch(`/api/scm/inbound-outbound-kiosk?plan_id=${plan.id}`);
            if (!invoicesRes.ok) throw new Error("Failed to fetch dispatch invoices");
            const invoicesData = await invoicesRes.json();

            const invoiceIds = invoicesData.map((inv: any) => inv.invoice_id);

            if (invoiceIds.length === 0) {
                setSummaries([]);
                setLoading(false);
                return;
            }

            // 2. Fetch sales invoices to get customer codes and amounts
            const salesInvoicesRes = await fetch(`/api/scm/inbound-outbound-kiosk?action=sales-invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoice_ids: invoiceIds })
            });
            if (!salesInvoicesRes.ok) throw new Error("Failed to fetch sales invoices");
            const salesInvoicesData = await salesInvoicesRes.json();

            // 3. Group by customer code, storing the invoice objects
            const invoicesByCustomer = salesInvoicesData.reduce((acc: Record<string, CustomerInvoice[]>, si: any) => {
                if (si.customer_code && si.invoice_no) {
                    if (!acc[si.customer_code]) acc[si.customer_code] = [];
                    acc[si.customer_code].push({
                        no: si.invoice_no,
                        amount: Number(si.net_amount) || 0
                    });
                }
                return acc;
            }, {});

            // 4. Fetch customer details
            const customerCodes = Object.keys(invoicesByCustomer);
            const customersRes = await fetch(`/api/scm/inbound-outbound-kiosk?action=customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_codes: customerCodes })
            });
            if (!customersRes.ok) throw new Error("Failed to fetch customer details");
            const customersData = await customersRes.json();

            const customerMap: Record<string, { name: string, address: string }> = {};
            customersData.forEach((c: any) => {
                const addressParts = [c.brgy, c.city, c.province].filter(Boolean);
                customerMap[c.customer_code] = {
                    name: c.store_name || c.customer_name,
                    address: addressParts.join(', ') || 'Address not available'
                };
            });

            const finalSummaries: CustomerSummary[] = customerCodes.map(code => ({
                customer_code: code,
                customer_name: customerMap[code]?.name || code,
                address: customerMap[code]?.address || 'Address not available',
                invoices: invoicesByCustomer[code] || []
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
            <DialogContent className="sm:max-w-[550px] w-full rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
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
                                </div>
                                {summaries.map((summary) => (
                                    <div
                                        key={summary.customer_code}
                                        className="flex flex-col p-4 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors gap-3"
                                    >
                                        <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div className="h-10 w-10 mt-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                    <Users className="h-5 w-5 text-emerald-600" />
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-sm font-bold text-foreground line-clamp-1">{summary.customer_name}</span>
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight mb-1.5">{summary.customer_code}</span>

                                                    {summary.invoices && summary.invoices.length > 0 && (
                                                        <ul className="mt-2 list-disc list-inside text-xs font-semibold text-muted-foreground/80 tracking-wide space-y-1">
                                                            {summary.invoices.map((inv, idx) => (
                                                                <li key={idx}>
                                                                    {inv.no} &mdash; <span className="font-bold text-foreground/80">₱{inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ADDRESS ON THE RIGHT */}
                                            <div className="sm:max-w-[250px] shrink-0 text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border/30">
                                                <div className="text-[9px] font-black text-muted-foreground/60 tracking-widest uppercase mb-1">
                                                    Destination Address
                                                </div>
                                                <div className="text-xs font-bold text-foreground/70 leading-snug">
                                                    {summary.address !== 'Address not available' ? summary.address : <span className="text-muted-foreground/40 italic font-medium">No address on file</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* REMARKS FIELD */}
                                <div className="mt-5">
                                    <Input
                                        placeholder="Add any additional remarks here..."
                                        className="rounded-xl border-muted-foreground/30 focus-visible:ring-emerald-500 h-11 bg-muted/10 shadow-sm"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                    />
                                </div>
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
                            onClick={() => onConfirm(undefined, remarks)}
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
