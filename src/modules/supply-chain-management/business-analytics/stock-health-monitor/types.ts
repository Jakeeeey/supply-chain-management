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

// ── Stock Health Schemas ──
export const StockHealthSchema = z.object({
    sku: z.string(),
    name: z.string(),
    currentBalance: z.number(),
    ads30: z.number(),
    daysOfStock: z.number(),
    isStockOutRisk: z.boolean(),
    lastOutboundDate: z.string().optional().nullable(),
    isSlob: z.boolean(),
    totalValue: z.number(),
});

export type StockHealth = z.infer<typeof StockHealthSchema>;

export const StockRiskSummarySchema = z.object({
    totalHealthyValue: z.number(),
    totalSlobValue: z.number(),
    atRiskCount: z.number(),
});

export type StockRiskSummary = z.infer<typeof StockRiskSummarySchema>;

// ── Response shape ──
export interface StockHealthData {
    items: StockHealth[];
    summary: StockRiskSummary;
}

// ── Raw API response types: Spring Boot views ──
export interface RawRunningInventory {
    id: string;
    product_id: number;
    product_code: string;
    product_name: string;
    product_barcode: string;
    product_brand: string;
    product_category: string;
    unit_name: string;
    unit_count: number;
    branch_id: number;
    branch_name: string;
    last_cutoff: string;
    last_count: number;
    movement_after: number;
    running_inventory: number;
    supplier_shortcut: string;
    supplier_id: number;
}

export interface RawProductMovement {
    ts: string;
    product_id: number;
    branch_id: number;
    doc_no: string;
    doc_type: string;
    in_base: number;
    out_base: number;
    descr: string;
    supplier_id: number | null;
    supplier_name: string | null;
}
