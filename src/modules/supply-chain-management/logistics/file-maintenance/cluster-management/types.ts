import { z } from "zod";

// =============================================================================
// DOMAIN MODELS
// =============================================================================

/** Single area belonging to a cluster */
export interface AreaItem {
  id?: number;
  province: string | null;
  city: string | null;
  baranggay: string | null;
}

/** Cluster with its nested areas — used for table rows & dialog editing */
export interface ClusterWithAreas {
  id: number;
  cluster_name: string;
  minimum_amount: number;
  areas: AreaItem[];
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const areaSchema = z.object({
  id: z.number().optional(),
  province: z.string().min(1, "Province is required"),
  city: z.string().min(1, "City is required"),
  baranggay: z.string().optional().default(""),
});

export const clusterSchema = z.object({
  cluster_name: z.string().min(1, "Cluster name is required"),
  minimum_amount: z.coerce
    .number()
    .gt(0, "Minimum amount must be greater than 0"),
  areas: z.array(areaSchema).min(1, "At least one area is required"),
});

export type ClusterFormValues = z.infer<typeof clusterSchema>;
