import { z } from 'zod';

// ── Global Filter (shared across BIA sub-modules) ──
export const GlobalFilterSchema = z.object({
    dateRange: z.object({
        from: z.date().optional(),
        to: z.date().optional(),
    }),
    branchId: z.string().optional().or(z.literal('all')),
    supplierId: z.string().optional().or(z.literal('all')),
});

export type GlobalFilter = z.infer<typeof GlobalFilterSchema>;

export const BiaSummaryCardSchema = z.object({
    title: z.string(),
    value: z.union([z.string(), z.number()]),
    description: z.string().optional(),
    trend: z.number().optional(),
    type: z.enum(['currency', 'number', 'percentage']),
});

export type BiaSummaryCard = z.infer<typeof BiaSummaryCardSchema>;

// ── Supplier Reliability Schemas ──
export const SupplierReliabilitySchema = z.object({
    supplierId: z.string(),
    supplierName: z.string(),
    avgLeadTime: z.number(),
    avgFulfillmentRate: z.number(),
    isAtRisk: z.boolean(),
});

export type SupplierReliability = z.infer<typeof SupplierReliabilitySchema>;

export const SupplierMetricSchema = z.object({
    poNumber: z.string(),
    orderDate: z.string(),
    receiptDate: z.string(),
    leadTime: z.number(),
    orderedQty: z.number(),
    receivedQty: z.number(),
    fulfillmentRate: z.number(),
});

export type SupplierMetric = z.infer<typeof SupplierMetricSchema>;

// ── Response shape ──
export interface SupplierReliabilityData {
    items: SupplierReliability[];
}

// ── Raw API response types: Directus PO collections ──
export interface RawPurchaseOrder {
    purchase_order_id: number;
    supplier_id: number;
    purchase_order_no: string;
    order_date: string;
    inventory_status: number;
    [key: string]: unknown;
}

export interface RawPurchaseOrderReceiving {
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    received_quantity: number;
    unit_price: number;
    total_amount: number;
    branch_id: number;
    receipt_date: string | null;
    received_date: string | null;
    isPosted: number;
}

export interface RawSupplier {
    id: number;
    supplier_name: string;
    supplier_shortcut: string;
    isActive: number;
    nonBuy: number;
    [key: string]: unknown;
}
