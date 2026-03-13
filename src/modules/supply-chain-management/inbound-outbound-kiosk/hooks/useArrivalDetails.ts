"use client";

import * as React from "react";
import { toast } from "sonner";
import { KioskDispatchPlan } from "../types";
import {
    fetchDispatchInvoices,
    fetchSalesInvoicesByids,
    fetchCustomersByCodes
} from "../providers/fetchProvider";

interface CustomerInvoice {
    no: string;
    amount: number;
}

interface CustomerSummary {
    customer_code: string;
    customer_name: string;
    invoices?: CustomerInvoice[];
}

export type DeliveryStatus = 'not_delivered' | 'has_concern' | 'has_return' | null;

export function useArrivalDetails(plan: KioskDispatchPlan | null, open: boolean) {
    const [loading, setLoading] = React.useState(false);
    const [customers, setCustomers] = React.useState<CustomerSummary[]>([]);
    const [deliveryStatuses, setDeliveryStatuses] = React.useState<Record<string, DeliveryStatus>>({});
    const [error, setError] = React.useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!plan || !open) return;

        setLoading(true);
        setError(null);
        try {
            // 1. Fetch invoices for this plan
            const invoicesData = await fetchDispatchInvoices(plan.id);
            const invoiceIds = invoicesData.map((inv: any) => inv.invoice_id);

            if (invoiceIds.length === 0) {
                setCustomers([]);
                setLoading(false);
                return;
            }

            // 2. Fetch sales invoices to get customer codes
            const salesInvoicesData = await fetchSalesInvoicesByids(invoiceIds);

            // 3. Get unique customer codes
            const customerCodes = Array.from(
                new Set(salesInvoicesData.map((si: any) => si.customer_code).filter(Boolean))
            ) as string[];

            // 4. Fetch customer details
            const customersData = await fetchCustomersByCodes(customerCodes);

            // 5. Group invoice numbers and amounts by customer code
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

            const finalCustomers: CustomerSummary[] = customersData.map((c: any) => ({
                customer_code: c.customer_code,
                customer_name: c.store_name || c.customer_name || c.customer_code,
                invoices: invoicesByCustomer[c.customer_code] || []
            }));

            setCustomers(finalCustomers);
        } catch (err: any) {
            console.error("Error fetching arrival details data:", err);
            setError(err.message || "An unexpected error occurred");
            toast.error("Failed to load arrival details");
        } finally {
            setLoading(false);
        }
    }, [plan, open]);

    React.useEffect(() => {
        if (open) {
            void fetchData();
        }
    }, [open, fetchData]);

    const handleStatusChange = (customerCode: string, status: DeliveryStatus) => {
        setDeliveryStatuses(prev => {
            const current = prev[customerCode];
            return {
                ...prev,
                [customerCode]: current === status ? null : status
            };
        });
    };

    return {
        loading,
        customers,
        deliveryStatuses,
        error,
        handleStatusChange,
        fetchData
    };
}
