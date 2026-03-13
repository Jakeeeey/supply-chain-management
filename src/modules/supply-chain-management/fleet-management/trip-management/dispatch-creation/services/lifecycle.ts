import { DispatchCreationFormValues } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";

export const dispatchCreationLifecycleService = {
  /**
   * Submits the creation payload to the Next.js API.
   * The server-side API will handle the complex multi-table transaction.
   */
  async createTrip(payload: DispatchCreationFormValues) {
    const response = await fetch(
      "/api/scm/fleet-management/trip-management/dispatch-creation",
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
};
