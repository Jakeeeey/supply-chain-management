export type StockTransfer = {
  id: number;
  order_no: string;
  product_id: number;
  source_branch: number;
  target_branch: number;
  lead_date: string;
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
  unit: string;
  qtyAvailable: number;
  unitQty: number;
  totalAmount: number;
};
