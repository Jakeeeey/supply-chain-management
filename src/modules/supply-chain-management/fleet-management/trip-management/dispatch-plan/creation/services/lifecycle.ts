import { DispatchCreationFormValues } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-plan/creation/types/dispatch.schema";

export const dispatchCreationLifecycleService = {
  /**
   * Submits the creation payload to the Next.js API.
   * The server-side API will handle the complex multi-table transaction.
   */
  async createTrip(payload: DispatchCreationFormValues) {
    const response = await fetch(
      "/api/scm/fleet-management/trip-management/dispatch-plan/creation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `Failed to create dispatch plan (${response.status})`,
      );
    }

    return response.json();
  },

  /**
   * Updates an existing dispatch plan's trip configuration.
   */
  async updateTrip(planId: number, payload: DispatchCreationFormValues) {
    const response = await fetch(
      `/api/scm/fleet-management/trip-management/dispatch-plan/creation?plan_id=${planId}&action=update_trip`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to update dispatch plan (${response.status})`,
      );
    }

    return response.json();
  },

  /**
   * Updates budgets for an existing dispatch plan.
   */
  async updateBudget(planId: number, budgets: unknown[]) {
    const response = await fetch(
      `/api/scm/fleet-management/trip-management/dispatch-plan/creation?plan_id=${planId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ budgets }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to update budget (${response.status})`,
      );
    }

    return response.json();
  },
};
