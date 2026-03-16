export interface ForConsolidationOrder {
    orderId: number;
    orderNo: string;
    customerName: string;
    forConsolidationAt: string;
    allocatedAmount: number; // 👈 Changed from totalAmount
}