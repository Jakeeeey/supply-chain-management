import { KioskDispatchPlan } from "../types";

export async function fetchKioskDispatchPlans(): Promise<KioskDispatchPlan[]> {
    try {
        const response = await fetch("/api/scm/inbound-outbound-kiosk");
        if (!response.ok) {
            throw new Error("Failed to fetch kiosk dispatch plans");
        }
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error("Error fetching kiosk dispatch plans:", error);
        throw error;
    }
}

export async function fetchDispatchInvoices(planId: string | number) {
    const response = await fetch(`/api/scm/inbound-outbound-kiosk?plan_id=${planId}`);
    if (!response.ok) throw new Error("Failed to fetch dispatch invoices");
    return response.json();
}

export async function fetchSalesInvoicesByids(invoiceIds: string[] | number[]) {
    const response = await fetch(`/api/scm/inbound-outbound-kiosk?action=sales-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_ids: invoiceIds })
    });
    if (!response.ok) throw new Error("Failed to fetch sales invoices");
    return response.json();
}

export async function fetchCustomersByCodes(customerCodes: string[]) {
    const response = await fetch(`/api/scm/inbound-outbound-kiosk?action=customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_codes: customerCodes })
    });
    if (!response.ok) throw new Error("Failed to fetch customer details");
    return response.json();
}
