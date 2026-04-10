export interface SalesReturnType {
  type_id: number;
  type_name: string;
  description?: string;
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Resolved display fields (populated by the API route)
  created_by_name?: string | null;
  updated_by_name?: string | null;
}
