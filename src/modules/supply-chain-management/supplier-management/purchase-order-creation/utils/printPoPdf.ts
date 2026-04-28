import { CompanyData } from "@/components/pdf-layout-design/types";
import { generatePurchaseOrderPdf } from "../../approval-of-purchase-order/utils/generatePoPdf";

export interface POCreationPrintData {
    poNumber: string;
    poDate: string;
    supplierName: string;
    preparerName?: string;
    items: Array<{
        name: string;
        brand: string;
        category: string;
        barcode: string;
        orderQty: number;
        uom: string;
        price: number;
        grossAmount: number;
        discountType: string;
        discountAmount: number;
        netAmount: number;
        branchName: string;
    }>;
    subtotal: number;
    discount: number;
    vat: number;
    ewt: number;
    total: number;
    isInvoice?: boolean;
}

export async function printPOCreationPdf(data: POCreationPrintData) {
    try {
        // Fetch company data required by MEN2 Template Print Engine
        const response = await fetch("/api/pdf/company");
        let companyData: CompanyData | null = null;
        
        if (response.ok) {
            const body = await response.json();
            companyData = body?.data?.[0] || (Array.isArray(body?.data) ? null : body?.data);
        }
        
        if (!companyData) {
            console.warn("Company data not found for PDF. Falling back to empty object.");
            companyData = {} as CompanyData;
        }

        // Map PO Creation data format to the Approval data format expected by generatePurchaseOrderPdf
        const mappedPo = {
            poNumber: data.poNumber,
            date: data.poDate,
            preparerName: data.preparerName,
            items: data.items.map(item => ({
                name: item.name,
                brand: item.brand,
                category: item.category,
                uom: item.uom,
                qty: item.orderQty,
                unit_price: item.price,
                gross: item.grossAmount,
                discount_amount: item.discountAmount,
                net: item.netAmount
            })),
            grossAmount: data.subtotal,
            discountAmount: data.discount,
            total: data.total,
            is_invoice: data.isInvoice,
            vat_amount: data.vat,
            withholding_tax_amount: data.ewt
        };

        // Determine branch label by checking unique branches in items
        const uniqueBranches = Array.from(new Set(data.items.map(it => it.branchName).filter(Boolean)));
        const branchLabel = uniqueBranches.length > 0 ? uniqueBranches.join(", ") : "—";

        // Dispatch call to standard approval PDF generation
        await generatePurchaseOrderPdf(mappedPo, branchLabel, data.supplierName, companyData);
    } catch (error) {
        console.error("Failed to generate PDF inside printPOCreationPdf", error);
        throw error;
    }
}
