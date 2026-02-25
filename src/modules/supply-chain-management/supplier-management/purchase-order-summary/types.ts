export type PurchaseOrder = {
  purchase_order_id: number;
  purchase_order_no: string;
  date: string;
  supplier_name: number;
  remark: string | null;
  inventory_status: number;
  payment_status: number;
  transaction_type: number;
};

export type Supplier = {
  id: number;
  supplier_name: string;
  supplier_type: string;
};

export type StatusRef = {
  id: number;
  status: string;
};