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

        const response = await fetch(`/api/scm/invoicing/sales-orders?${params.toString()}`);
        if (!response.ok) {
            throw new Error("Failed to fetch sales orders");
        }
        return response.json();
    },

    async getSalesmen(search?: string): Promise<Salesman[]> {
        const url = search ? `/api/scm/invoicing/salesman?search=${encodeURIComponent(search)}` : "/api/scm/invoicing/salesman";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch salesmen");
        return response.json();
    },

    async getBranches(search?: string): Promise<Branch[]> {
        const url = search ? `/api/scm/invoicing/branches?search=${encodeURIComponent(search)}` : "/api/scm/invoicing/branches";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch branches");
        }
        return response.json();
    },

    async getSuppliers(search?: string): Promise<Supplier[]> {
        const url = search ? `/api/scm/invoicing/suppliers?search=${encodeURIComponent(search)}` : "/api/scm/invoicing/suppliers";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch suppliers");
        }
        return response.json();
    },

    async getCustomers(search?: string): Promise<Customer[]> {
        const url = search ? `/api/scm/invoicing/customer?search=${encodeURIComponent(search)}` : "/api/scm/invoicing/customer";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch customers");
        }
        return response.json();
    },

    async updateSalesOrderRemarks(orderId: number, remarks: string | null): Promise<any> {
        const url = `/api/scm/invoicing/sales-orders/${orderId}`;
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
        const response = await fetch(`/api/scm/invoicing/logistics/${orderId}`);
        if (!response.ok) throw new Error("Failed to fetch logistics data");
        return response.json();
    },

    async getConversionDetails(orderId: number): Promise<any> {
        const response = await fetch(`/api/scm/invoicing/conversion-details/${orderId}`);
        if (!response.ok) throw new Error("Failed to fetch conversion details");
        return response.json();
    },

    async validateReceiptNo(receiptNo: string): Promise<boolean> {
        const response = await fetch(`/api/scm/invoicing/validate-receipt-no?receiptNo=${encodeURIComponent(receiptNo)}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.exists;
    },

    async getDiscountTypes(): Promise<any[]> {
        const response = await fetch(`/api/scm/invoicing/discount-types`);
        if (!response.ok) throw new Error("Failed to fetch discount types");
        return response.json();
    },

    async getTemplate(typeId: number): Promise<any> {
        const response = await fetch(`/api/scm/invoicing/templates/${typeId}`);
        if (!response.ok) throw new Error("Failed to fetch template");
        const data = await response.json();
        return data.template_config;
    },

    async saveTemplate(typeId: number, templateConfig: any): Promise<any> {
        const response = await fetch(`/api/scm/invoicing/templates/${typeId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ template_config: templateConfig })
        });
        
        if (!response.ok) {
            let errorMsg = `Server error (${response.status})`;
            try {
                const errorData = await response.json();
                
                // Handle Directus error structure: { details: [ { message: "...", ... } ] }
                if (errorData.details && Array.isArray(errorData.details)) {
                    errorMsg = errorData.details.map((d: any) => d.message || JSON.stringify(d)).join(", ");
                } else {
                    errorMsg = errorData.details || errorData.error || errorMsg;
                }

                if (typeof errorMsg !== 'string') {
                    errorMsg = JSON.stringify(errorMsg);
                }
            } catch (e) {
                // Not JSON or other error parsing JSON
            }
            throw new Error(errorMsg);
        }
        
        return response.json();
    },

    async uploadFile(file: File): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/scm/invoicing/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || error.error || "Failed to upload file");
        }

        const data = await response.json();
        return data.id; // Returns the Directus file ID
    },

    getImageUrl(val?: string): string {
        if (!val) return "";
        if (val.startsWith("data:") || val.startsWith("http")) return val;
        // Assume UUID / File ID
        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
        return `${baseUrl}/assets/${val}`;
    }
};
