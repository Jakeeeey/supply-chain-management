import type { OrderGroupItem } from "../../stock-transfer/types/stock-transfer.types";

/** Row from the `stock_transfer_serial` tracking collection. */
export interface StockTransferSerialRow {
  id?: number;
  stock_transfer_id: number;
  serial_number: string;
  scan_type: "DISPATCH" | "RECEIVE";
  created_at?: string;
  created_by?: number;
  
  // View specific fields (v_serial_onhand)
  product_id?: number;
  branch_id?: number;
  qty_onhand?: number;
}

/** Response from the Serial lookup action. */
export interface SerialLookupResponse {
  serialNumber: string;
  productId: number;
  productName: string;
  barcode: string;
  unitPrice: number;
  branchId?: number;
  qtyAvailable: number;
}

/**
 * Interface for a serial scan log entry.
 */
export interface SerialScanLog {
  serialNumber: string;
  productId?: number;
  productName?: string;
  timestamp: number;
  status: 'SUCCESS' | 'ERROR';
  errorType?: string;
}

/**
 * Enhanced item for Serialized workflow.
 */
export interface SerialOrderGroupItem extends OrderGroupItem {
  scannedSerialQty?: number;
  receivedSerialQty?: number;
  scannedSerials?: string[];
  receivedSerials?: string[];
}
