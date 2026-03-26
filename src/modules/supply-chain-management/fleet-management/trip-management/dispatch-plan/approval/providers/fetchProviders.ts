import { PostDispatchApprovalDto } from "../types";

// 🚀 Pointing to your actual Next.js API route path
const NEXT_API_BASE = "/api/scm/fleet-management/trip-management/dispatch-plan/approval";

export const fetchPendingApprovals = async (): Promise<PostDispatchApprovalDto[]> => {
    const res = await fetch(`${NEXT_API_BASE}/pending`);
    if (!res.ok) throw new Error("Failed to fetch pending approvals");

    const data = await res.json();
    return data;
};

export const fetchPlanDetails = async (id: number): Promise<PostDispatchApprovalDto> => {
    const res = await fetch(`${NEXT_API_BASE}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch plan details");
    return res.json();
};

export const approveDispatchPlan = async (id: number): Promise<boolean> => {
    const res = await fetch(`${NEXT_API_BASE}/${id}/approve`, { method: "PUT" });
    return res.ok;
};

export const rejectDispatchPlan = async (id: number): Promise<boolean> => {
    const res = await fetch(`${NEXT_API_BASE}/${id}/reject`, { method: "PUT" });
    return res.ok;
};