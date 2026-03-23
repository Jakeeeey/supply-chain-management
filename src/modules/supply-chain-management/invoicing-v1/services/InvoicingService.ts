import { InvoicingFilters, SalesOrder, Salesman, Branch, Supplier, Customer } from "../types";

export const InvoicingService = {
    async getSalesOrders(filters?: InvoicingFilters): Promise<SalesOrder[]> {
        const params = new URLSearchParams();
        if (filters) {
            if (filters.orderNo) params.append("orderNo", filters.orderNo);
            if (filters.poNo) params.append("poNo", filters.poNo);
            if (filters.customer) params.append("customer", filters.customer);
            if (filters.salesman) params.append("salesman", filters.salesman);
            if (filters.supplier) params.append("supplier", filters.supplier);
            if (filters.branch) params.append("branch", filters.branch);
            if (filters.fromDate) params.append("fromDate", filters.fromDate);
            if (filters.toDate) params.append("toDate", filters.toDate);
        }

        const response = await fetch(`/api/scm/invoicing-v1/sales-orders?${params.toString()}`);
        if (!response.ok) {
            throw new Error("Failed to fetch sales orders");
        }
        return response.json();
    },

    async getSalesmen(search?: string): Promise<Salesman[]> {
        const url = search ? `/api/scm/invoicing-v1/salesman?search=${encodeURIComponent(search)}` : "/api/scm/invoicing-v1/salesman";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch salesmen");
        return response.json();
    },

    async getBranches(search?: string): Promise<Branch[]> {
        const url = search ? `/api/scm/invoicing-v1/branches?search=${encodeURIComponent(search)}` : "/api/scm/invoicing-v1/branches";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch branches");
        }
        return response.json();
    },

    async getSuppliers(search?: string): Promise<Supplier[]> {
        const url = search ? `/api/scm/invoicing-v1/suppliers?search=${encodeURIComponent(search)}` : "/api/scm/invoicing-v1/suppliers";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch suppliers");
        }
        return response.json();
    },

    async getCustomers(search?: string): Promise<Customer[]> {
        const url = search ? `/api/scm/invoicing-v1/customer?search=${encodeURIComponent(search)}` : "/api/scm/invoicing-v1/customer";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch customers");
        }
        return response.json();
    },

    async updateSalesOrderRemarks(orderId: number, remarks: string | null): Promise<any> {
        const url = `/api/scm/invoicing-v1/sales-orders/${orderId}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ remarks })
        });

        if (!response.ok) {
            throw new Error("Failed to update remarks");
        }
        return response.json();
    },

    async getLogisticsData(orderId: number): Promise<any> {
        const response = await fetch(`/api/scm/invoicing-v1/logistics/${orderId}`);
        if (!response.ok) throw new Error("Failed to fetch logistics data");
        return response.json();
    },

    async getConversionDetails(orderId: number): Promise<any> {
        const response = await fetch(`/api/scm/invoicing-v1/conversion-details/${orderId}`);
        if (!response.ok) throw new Error("Failed to fetch conversion details");
        return response.json();
    },

    async validateReceiptNo(receiptNo: string): Promise<boolean> {
        const response = await fetch(`/api/scm/invoicing-v1/validate-receipt-no?receiptNo=${encodeURIComponent(receiptNo)}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.exists;
    },

    async getDiscountTypes(): Promise<any[]> {
        const response = await fetch(`/api/scm/invoicing-v1/discount-types`);
        if (!response.ok) throw new Error("Failed to fetch discount types");
        return response.json();
    }
};
