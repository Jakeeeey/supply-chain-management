import { KioskDispatchPlan, UserOption } from "../types";

const API_BASE = "/api/scm/fleet-management/trip-management/dispatch-plan/dispatch";

export const fetchProvider = {
    async getPlans(): Promise<KioskDispatchPlan[]> {
        const res = await fetch(API_BASE);
        const data = await res.json();
        return data.data || [];
    },

    async getUsers(): Promise<UserOption[]> {
        const res = await fetch(`${API_BASE}?type=users`);
        const data = await res.json();
        return data.data || [];
    },

    async getCustomers(planId: number, docNo?: string): Promise<any[]> {
        const res = await fetch(`${API_BASE}?type=customers&plan_id=${planId}${docNo ? `&doc_no=${docNo}` : ""}`);
        const data = await res.json();
        return data.data || [];
    },

    async confirmDispatch(payload: {
        plan_id: number;
        driver_id: number;
        driver_present: boolean;
        helpers: { user_id: number; is_present: boolean }[];
        time_of_dispatch: string;
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
