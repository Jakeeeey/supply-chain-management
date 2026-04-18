// modules/supply-chain-management/supplier-management/purchase-order-tagging/types.ts

export type TaggingStatus = "tagging" | "completed";

export type TaggablePOListItem = {
    id: string;
    poNumber: string;
    supplierName: string;
    date: string;

    totalItems: number;   // sum expected
    taggedItems: number;  // sum tagged
    status: TaggingStatus;
};

export type TaggingPOItem = {
    id: string;
    sku: string;
    name: string;
    expectedQty: number;
    taggedQty: number;
};

export type TaggingActivity = {
    id: string;
    sku: string;
    productName: string;
    rfid: string;
    time: string; // display string
};

export type TaggingPODetail = {
    id: string;
    poNumber: string;
    supplierName: string;

    items: TaggingPOItem[];
    activity: TaggingActivity[];
};
