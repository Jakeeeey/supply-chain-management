import { KioskDispatchPlan } from "../types";

export async function fetchKioskDispatchPlans(): Promise<KioskDispatchPlan[]> {
    try {
        const response = await fetch("/api/scm/inbound-outbound-kiosk");
        if (!response.ok) {
            throw new Error("Failed to fetch kiosk dispatch plans");
        }
        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error("Error fetching kiosk dispatch plans:", error);
        throw error;
    }
}
