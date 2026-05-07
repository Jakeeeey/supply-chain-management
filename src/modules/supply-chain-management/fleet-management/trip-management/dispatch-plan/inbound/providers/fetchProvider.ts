import { KioskDispatchPlan, CustomerArrivalInfo, DeliveryStatus } from "../types";

const API_BASE = "/api/scm/fleet-management/trip-management/dispatch-plan/inbound";

export const fetchProvider = {
    async getPlans(): Promise<KioskDispatchPlan[]> {
        const res = await fetch(API_BASE);
        const data = await res.json();
        return data.data || [];
    },

    async getCustomers(planId: number): Promise<CustomerArrivalInfo[]> {
        const res = await fetch(`${API_BASE}?type=customers&plan_id=${planId}`);
        const data = await res.json();
        return data.data || [];
    },

    async confirmArrival(payload: {
        plan_id: number;
        deliveryStatuses: Record<string, DeliveryStatus>;
        driver_present: boolean;
        helpers: { user_id: number; is_present: boolean }[];
        time_of_arrival: string;
        remarks: string;
    }): Promise<boolean> {
        const res = await fetch(API_BASE, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return res.ok;
    }
};
