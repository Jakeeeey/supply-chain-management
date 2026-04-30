export interface RFIDTag {
  id?: string; // Local UI ID
  rfid_tag: string;
  status: 'active' | 'inactive';
  assignedDate?: string;
}

export interface UnitTarget {
  unitId: number;
  name: string;
  conversionFactor?: number;
  targetProductId?: number;
}

export interface StockConversionProduct {
  productId: number;
  supplierId?: number;
  supplierName?: string;
  supplierShortcut?: string;
  brand: string;
  category: string;
  productCode: string;
  productName: string;
  productDescription: string;
  family?: string;
  conversionFactor?: number;
  currentUnit: string;
  currentUnitId: number;
  quantity: number;
  totalAmount: number;
  pricePerUnit: number;
  inventoryLoaded?: boolean;
  inventoryError?: boolean;
  availableUnits?: UnitTarget[];
}

export interface StockConversionPayload {
  productId: number;
  sourceUnitId: number;
  targetUnitId: number;
  targetProductId: number;
  quantityToConvert: number;
  convertedQuantity: number;
  branchId: number;
  userId: number;
  pricePerUnit: number;
  rfidTags: RFIDTag[];
  sourceRfidTags?: string[];
}
