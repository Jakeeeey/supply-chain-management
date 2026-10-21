export interface VehiclePartClassification {
  id: number;
  code: string;
  name: string;
  barcode: string;
  description?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

export interface Supplier {
  id: number;
  supplier_name: string;
  supplier_shortcut?: string | null;
  contact_person?: string | null;
  phone_number?: string | null;
  email_address?: string | null;
  isActive?: number | boolean;
}

export interface VehiclePartSupplierRecord {
  id?: number;
  part_id: number;
  supplier_id: number | Supplier;
}

export interface VehiclePart {
  id: number;
  part_code: string;
  part_name: string;
  classification_id?: number | null;
  classification?: VehiclePartClassification | null;
  barcode?: string | null;
  category?: string | null;
  unit: string;
  description?: string | null;
  reorder_point: number;
  unit_cost: number;
  is_active: boolean;
  supplier_id?: number | null;
  supplier?: Supplier | null;
  suppliers?: (number | Supplier | VehiclePartSupplierRecord)[];
  created_by?: string | null;
  created_at?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

export type CreateVehiclePartInput = Omit<
  VehiclePart,
  "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "classification" | "supplier" | "suppliers"
> & {
  supplier_id?: number | null;
};

export type UpdateVehiclePartInput = Partial<CreateVehiclePartInput>;

export type CreateClassificationInput = {
  code: string;
  name: string;
  barcode: string;
  description?: string | null;
  is_active?: boolean;
};

export interface VehiclePartsApiResponse {
  data: VehiclePart[];
  meta?: {
    total_count?: number;
    filter_count?: number;
  };
}

export interface ClassificationsApiResponse {
  data: VehiclePartClassification[];
}

export interface SuppliersApiResponse {
  data: Supplier[];
}
