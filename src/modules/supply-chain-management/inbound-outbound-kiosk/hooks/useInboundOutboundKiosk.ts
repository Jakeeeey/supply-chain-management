"use client";

import * as React from "react";
import { KioskDispatchPlan, KioskStatus } from "../types";
import { fetchKioskDispatchPlans } from "../providers/fetchProvider";

export function useInboundOutboundKiosk() {
    const [plans, setPlans] = React.useState<KioskDispatchPlan[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Filters
    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<string>("All Statuses");

    const reload = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchKioskDispatchPlans();
            setPlans(data);
        } catch (err: any) {
            setError(err?.message || "Something went wrong while fetching data");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void reload();
    }, [reload]);

    const filteredPlans = React.useMemo(() => {
        return plans.filter((plan) => {
            const isAllowedStatus = plan.status === "For Dispatch" || plan.status === "For Inbound";
            if (!isAllowedStatus) return false;

            const matchesSearch =
                plan.doc_no.toLowerCase().includes(search.toLowerCase()) ||
                plan.driver_name.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === "All Statuses" || plan.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [plans, search, statusFilter]);

    return {
        plans,
        filteredPlans,
        loading,
        error,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        reload,
    };
}
