// types.ts

// ── Status flow ────────────────────────────────────────────────────────────
// OPEN           → inventory_status 0-11  (not yet receiving)
// PARTIAL        → inventory_status 12    (some items received, nothing posted yet)
// PARTIAL_POSTED → inventory_status 13    (some items received & posted, NOT fully received yet)
// RECEIVED       → inventory_status 13*   (fully received, not all posted)
//   *both PARTIAL_POSTED and RECEIVED map to DB status 13;
//    the difference is determined by isFullyReceived() in the API
// CLOSED         → inventory_status 14    (fully received AND all posted)
<<<<<<< HEAD:src/modules/supply-chain-management/supplier-management/posting-of-po/types.ts
export type POStatus = "OPEN" | "PARTIAL" | "PARTIAL_POSTED" | "RECEIVED" | "CLOSED";
=======
export type POStatus = "OPEN" | "PARTIAL" | "PARTIAL_POSTED" | "FOR POSTING" | "CLOSED";
>>>>>>> origin/master:src/modules/supply-chain-management/supplier-management/purchase-order-posting/types.ts

export type POListItem = {
    id: string;
    poNumber: string;
    supplierName: string;
    status: POStatus;
    totalAmount: number;
    currency: "PHP" | "USD";
    itemsCount: number;
    branchesCount: number;

    // posting-specific
    receiptsCount: number;
    unpostedReceiptsCount: number;
};

export type Supplier = { id: string; name: string };
export type Branch = { id: string; name: string };

export type POItem = {
    id: string; // porId
    productId: string;
    name: string;
    barcode: string;
    uom: string;
    expectedQty: number;
    receivedQty: number;
    requiresRfid?: boolean;
    unitPrice?: number;
    grossAmount?: number;
    discountTypeId?: string;
};

export type POBranchAllocation = {
    branch: Branch;
    items: POItem[];
};

export type PostingReceipt = {
    receiptNo: string;
    receiptDate: string;          // YYYY-MM-DD or ISO
    receivedAt?: string;          // ISO
    isPosted: 0 | 1 | boolean;   // API returns 0|1; UI normalises to boolean
    linesCount: number;
    totalReceivedQty: number;
};

export type PurchaseOrder = {
    id: string;
    poNumber: string;
    supplier: Supplier;
    status: POStatus;
    totalAmount: number;
    currency: "PHP" | "USD";
    allocations: POBranchAllocation[];
    receipts: PostingReceipt[];
    createdAt: string;

    // posting-specific counts
    receiptsCount: number;
    unpostedReceiptsCount: number;
    postingReady?: boolean;

    grossAmount?: number;
    discountAmount?: number;
    vatAmount?: number;
    withholdingTaxAmount?: number;
};

export type ReceiptForm = {
    receiptNumber: string;
    receiptTypeCode: string;
    receiptDate: string; // yyyy-mm-dd
};

export type DiscountType = {
    id: string;
    name: string;
    percent: number;
    active: boolean;
};

export type ReceiptTypeOption = {
    code: string;
    label: string;
};

export type PostingPODetail = PurchaseOrder & {
    postingReady?: boolean;
    [key: string]: unknown;
};