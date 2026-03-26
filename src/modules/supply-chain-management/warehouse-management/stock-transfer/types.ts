export type StockTransfer = {
  id: number;
  order_no: string;
  product_id: number | any;
  source_branch: number | null;
  target_branch: number | null;
  lead_date: string | null;
  ordered_quantity: number;
  received_quantity: number;
  amount: number;
  status: string;
  remarks: string | null;
  date_requested: string;
  date_encoded: string;
  date_received: string | null;
  encoder_id: number;
  receiver_id: number | null;
};

export type Branch = {
  id: number;
  name?: string;
  branch_name?: string;
  [key: string]: unknown;
};

export type ScannedItem = {
  rfid: string;
  productId: number;
  productName: string;
  description: string;
  brandName: string;
  unit: string;
  unitId?: number;
  qtyAvailable: number;
  unitQty: number;
  unitPrice: number;
  totalAmount: number;
};

export interface OrderGroup {
  orderNo: string;
  sourceBranch: number | null;
  targetBranch: number | null;
  leadDate: string | null;
  dateRequested: string;
  dateEncoded: string;
  items: any[]; // Generic for now, as items differ slightly (scannedQty vs receivedQty)
  totalAmount: number;
  status: string;
}
