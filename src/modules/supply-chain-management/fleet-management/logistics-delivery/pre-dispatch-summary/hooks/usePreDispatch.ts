"use client";

import { useState, useEffect, useMemo } from "react";
import { VPreDispatchPlanDetailedDto, GroupedDispatchData } from "../types";
import { fetchPreDispatchByStatus } from "../providers/fetchProvider";

export function usePreDispatch() {
    const [dispatches, setDispatches] = useState<VPreDispatchPlanDetailedDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeStatus, setActiveStatus] = useState<"PENDING" | "DELIVERED">("PENDING");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const data = await fetchPreDispatchByStatus(activeStatus);
            setDispatches(data);
            setLoading(false);
        };
        loadData();
    }, [activeStatus]);

    const { groupedData, availableDispatchNos } = useMemo(() => {
        const filtered = dispatches.filter(d =>
            d.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.dispatchNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.orderNo?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const groups: GroupedDispatchData = {};
        const dispatchNos = new Set<string>();

        filtered.forEach(item => {
            const dispatchNo = item.dispatchNo || "UNASSIGNED";
            const driver = item.driverName || "NO DRIVER";
            const customer = item.customerName || "UNKNOWN CUSTOMER";

            dispatchNos.add(dispatchNo);

            if (!groups[dispatchNo]) groups[dispatchNo] = {};
            if (!groups[dispatchNo][driver]) groups[dispatchNo][driver] = {};
            if (!groups[dispatchNo][driver][customer]) groups[dispatchNo][driver][customer] = [];

            groups[dispatchNo][driver][customer].push(item);
        });

        return {
            groupedData: groups,
            availableDispatchNos: Array.from(dispatchNos).sort((a, b) => b.localeCompare(a))
        };
    }, [dispatches, searchQuery]);

    return {
        loading,
        searchQuery,
        setSearchQuery,
        activeStatus,
        setActiveStatus,
        groupedData,
        availableDispatchNos
    };
}