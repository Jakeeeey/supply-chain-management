export type POStatus = "OPEN" | "PARTIAL" | "RECEIVED" | "CLOSED";

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
    expectedQty: number; // tagged RFIDs count
    receivedQty: number; // received_quantity
    requiresRfid?: boolean;
};

export type POBranchAllocation = {
    branch: Branch;
    items: POItem[];
};

export type PostingReceipt = {
    receiptNo: string;
    receiptDate: string; // YYYY-MM-DD or ISO
    receivedAt?: string; // ISO
    isPosted: boolean;
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
};

// ✅ removed lot fields (per request)
export type ReceiptForm = {
    receiptNumber: string;
    receiptTypeCode: string;
    receiptDate: string; // yyyy-mm-dd
};

export type ReceiptTypeOption = {
    code: string;
    label: string;
};
export type PostingPODetail = PurchaseOrder & {
    postingReady?: boolean;
    [key: string]: unknown;
};
