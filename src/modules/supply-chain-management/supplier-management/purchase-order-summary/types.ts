export type PurchaseOrder = {
  purchase_order_id: number;
  purchase_order_no: string;
  date: string;
  supplier_name: number;
  remark: string | null;
  inventory_status: number;
  payment_status: number;
  transaction_type: number;
  
  gross_amount?: number;
  grossAmount?: number;
  subtotal?: number;
  
  discount_amount?: number;
  discounted_amount?: number;
  discountAmount?: number;
  discount_value?: number;
  
  discount_percent?: number;
  discount_type?: string;
  
  total_amount?: number;
  total?: number;
  net_amount?: number;
  vat_amount?: number;
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