export interface MonthlyForecast {
    [key: string]: number;
}

export interface PlanningRow {
    id: string | number;
    product_id: number;
    product_name: string;
    productName?: string;
    brandName?: string;
    product_code?: string;
    sku?: string;
    barcode?: string;
    abcClass?: string;
    dailyUsage?: number;
    expectedSelloutBoxes?: number;
    currentStockBoxes?: number;
    inTransitBoxes?: number;
    computedPricePerBox?: number;
    monthlyForecast?: MonthlyForecast;
    isManual?: boolean;
    orderQty: number;
    suggestedQty?: number;
    reqInv?: number;
    projStock?: number;
    totalValue?: number;
    category_name?: string;
    mav?: number;
    last_cost?: number;
    lastCost?: number;
    boxMultiplier?: number;
    inventoryStatus?: string;
    description?: string;
}

export interface PendingSelection {
    months: string[];
    mode: "historical" | "forecast";
    year: string;
    supplierId: string;
    selectedBranches: string[];
}

export interface SimulationTargets {
    A: number;
    B: number;
    C: number;
}

export interface PurchaseOrder {
    id: string;
    purchase_order_no?: string;
    date?: string;
    [key: string]: unknown;
}
