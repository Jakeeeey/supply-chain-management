export interface RTSReturnType {
  id: number;
  return_type_code: string;
  return_type_name: string;
  description: string | null;
  isActive: boolean;
  created_at: string;
  created_by: number | string | null;
  created_by_name?: string | null;
  updated_at: string;
  updated_by: number | string | null;
  updated_by_name?: string | null;
}
