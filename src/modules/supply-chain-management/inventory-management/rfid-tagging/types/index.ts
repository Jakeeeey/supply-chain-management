export interface RfidHeader {
  id: number;
  branch_id: number;
  product_id: number;
  reference_no: string;
  posted_at?: string | null;
  posted_by?: number | null;
  created_at?: string;
  created_by?: number | null;
  // Included relations for display
  branch?: Branch;
  product?: Product;
  rfid_count?: number;
  running_inventory?: number;
}

export interface RfidTaggingPayload {
  product_id: number;
  branch_id: number;
  reference_no: string;
  rfid_tags: string[];
}

export interface Branch {
  id?: number;
  branch_id?: number;
  branch_name?: string;
  branch_code?: string;
}

export interface Product {
  id?: number;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  item_code?: string;
  description?: string;
  barcode?: string;
}
