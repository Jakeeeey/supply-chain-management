export type POStatus = "OPEN" | "PARTIAL" | "CLOSED";

export type POListItem = {
    id: string;
    poNumber: string;
    supplierName: string;
    status: POStatus;
    totalAmount: number;
    currency: "PHP" | "USD";
    itemsCount: number;
    branchesCount: number;
};

export type Supplier = { id: string; name: string };
export type Branch = { id: string; name: string };

export type POItem = {
    id: string;
    productId: string;
    name: string;
    barcode: string;
    uom: string;
    expectedQty: number;
    receivedQty: number;
    requiresRfid?: boolean;
    unitPrice?: number;
    discountType?: string;
    discountAmount?: number;
    netAmount?: number;
};

export type POBranchAllocation = {
    branch: Branch;
    items: POItem[];
};

export type PurchaseOrder = {
    id: string;
    poNumber: string;
    supplier: Supplier;
    status: POStatus;
    totalAmount: number;
    currency: "PHP" | "USD";
    barcodeValue: string;
    allocations: POBranchAllocation[];
    createdAt: string;
};

export type ReceiptTypeOption = {
    code: string;
    label: string;
};

export type ReceiptForm = {
    receiptNumber: string;
    receiptTypeCode: string;
    receiptDate: string; // yyyy-mm-dd
    lotNumber: string;
    lotExpiration: string; // yyyy-mm-dd
};

export type ReceivingStep = 1 | 2 | 3;

export type ReceivedLine = {
    itemId: string;
    productId: string;
    barcode: string;
    name: string;
    uom: string;
    receivedNowQty: number; // qty received during this session
    rfids: string[];
};
