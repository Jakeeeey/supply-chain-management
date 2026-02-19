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

// ── Dashboard Summary (used by summary cards hook) ──
export interface DashboardSummary {
    cards: BiaSummaryCard[];
}

// ── Inventory Performance Schemas ──
export const InventoryPerformanceSchema = z.object({
    sku: z.string(),
    name: z.string(),
    value: z.number(),
    volume: z.number(),
    pickFrequency: z.number(),
    abcValueClass: z.enum(['A', 'B', 'C']),
    abcVolumeClass: z.enum(['A', 'B', 'C']),
    fnsClass: z.enum(['F', 'N', 'S']),
});

export type InventoryPerformance = z.infer<typeof InventoryPerformanceSchema>;

export const FnsDistributionSchema = z.object({
    label: z.enum(['Fast', 'Normal', 'Slow']),
    count: z.number(),
    percentage: z.number(),
    color: z.string(),
});

export type FnsDistribution = z.infer<typeof FnsDistributionSchema>;

// ── Response shape ──
export interface InventoryPerformanceData {
    items: InventoryPerformance[];
    fnsDistribution: FnsDistribution[];
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

// ── Raw PO Receiving (for unit cost lookup) ──
export interface RawPurchaseOrderReceiving {
    purchase_order_product_id: number;
    purchase_order_id: number;
    product_id: number;
    unit_price: number;
    received_quantity: number;
    total_amount: number;
    branch_id: number;
    received_date: string | null;
}
