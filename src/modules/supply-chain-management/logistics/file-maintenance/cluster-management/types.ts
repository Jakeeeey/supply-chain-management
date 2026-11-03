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

/** COA Budget allocation for a cluster */
export interface ClusterCoaBudgetItem {
  id?: number;
  cluster_id?: number;
  coa_id: number;
  budget: number;
  account_title?: string;
  gl_code?: string;
}

export interface COAOption {
  coa_id: number;
  account_title: string;
  gl_code: string;
}

/** Cluster with its nested areas & coa budgets — used for table rows & dialog editing */
export interface ClusterWithAreas {
  id: number;
  cluster_name: string;
  minimum_amount: number;
  areas: AreaItem[];
  coa_budgets?: ClusterCoaBudgetItem[];
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

export const clusterCoaBudgetSchema = z.object({
  id: z.number().optional(),
  coa_id: z.coerce.number().min(1, "Please select an account"),
  budget: z.coerce.number().min(0, "Budget must be 0 or greater"),
});

export const clusterSchema = z
  .object({
    cluster_name: z.string().min(1, "Cluster name is required"),
    minimum_amount: z.coerce
      .number()
      .gt(0, "Minimum amount must be greater than 0"),
    areas: z.array(areaSchema).min(1, "At least one area is required"),
    coa_budgets: z.array(clusterCoaBudgetSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    const norm = (s?: string | null): string =>
      (s || "").replace(/\s+/g, " ").trim().toLowerCase();

    const areas = data.areas;

    for (let i = 0; i < areas.length; i++) {
      const a = areas[i];
      const aCity = norm(a.city);
      const aBrgy = norm(a.baranggay);

      if (!aCity) continue;

      for (let j = 0; j < areas.length; j++) {
        if (i === j) continue;
        const b = areas[j];
        const bCity = norm(b.city);
        const bBrgy = norm(b.baranggay);

        if (aCity !== bCity) continue;

        // Conflict: Row i claims whole city, Row j claims a barangay in it
        if (!aBrgy && bBrgy) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `"${a.city}" is already claimed as a whole city by another row. Remove the whole-city row or specify barangays for both.`,
            path: ["areas", i, "city"],
          });
          break; // One error per row is enough
        }

        // Conflict: Row i claims a specific barangay, Row j claims the whole city
        if (aBrgy && !bBrgy) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Cannot assign a specific barangay — "${b.city}" is claimed as a whole city by another row.`,
            path: ["areas", i, "baranggay"],
          });
          break;
        }

        // Conflict: Both rows claim the exact same barangay
        if (aBrgy && bBrgy && aBrgy === bBrgy) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `"${a.baranggay}" in "${a.city}" is already assigned in another row.`,
            path: ["areas", i, "baranggay"],
          });
          break;
        }
      }
    }

    // Check duplicate COA selections in coa_budgets
    const budgets = data.coa_budgets || [];
    const coaSeen = new Set<number>();
    for (let i = 0; i < budgets.length; i++) {
      const coaId = budgets[i].coa_id;
      if (!coaId) continue;
      if (coaSeen.has(coaId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This Chart of Account is already added.",
          path: ["coa_budgets", i, "coa_id"],
        });
      }
      coaSeen.add(coaId);
    }
  });

export type ClusterFormValues = z.infer<typeof clusterSchema>;
