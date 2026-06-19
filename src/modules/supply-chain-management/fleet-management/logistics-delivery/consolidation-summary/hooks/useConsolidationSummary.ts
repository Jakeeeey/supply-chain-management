import { useState, useEffect, useMemo } from "react";
import { ClusterGroupRaw, TableRow, DateRange, ClusterFilterValue, SortConfig } from "../types";
import { fetchConsolidationSummary } from "../providers/fetchProvider";
import { toLocalDayKey, checkDateRange, normalizeClusterFilter, sortRowsFn, getDateRangeBounds } from "../utils";

export const useConsolidationSummary = () => {
    const [rawGroups, setRawGroups] = useState<ClusterGroupRaw[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [salesmanFilter, setSalesmanFilter] = useState<string>("All");
    const [clusterFilter, setClusterFilter] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>("this-month");
    const [customDateFrom, setCustomDateFrom] = useState("");
    const [customDateTo, setCustomDateTo] = useState("");
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { start, end } = getDateRangeBounds(dateRange, customDateFrom, customDateTo);
                
                // Do not fetch if custom date is selected but incomplete
                if (dateRange === "custom" && (!start || !end)) {
                    setLoading(false);
                    return;
                }
                
                const data = await fetchConsolidationSummary(start, end);
                setRawGroups(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [dateRange, customDateFrom, customDateTo]);

    const getGroupedRows = (
        data: ClusterGroupRaw[],
        filters: { cluster: ClusterFilterValue; salesman: string; search?: string; status?: string },
        dateSettings: { range: DateRange; from: string; to: string }
    ) => {
        const rows: TableRow[] = [];
        const searchLower = (filters.search || "").toLowerCase();
        const clusterSel = normalizeClusterFilter(filters.cluster);

        data.forEach((group) => {
            if (!clusterSel.all && !clusterSel.set.has(group.clusterName)) return;

            const agg = new Map<string, TableRow>();

            group.customers.forEach((customer) => {
                customer.orders.forEach((o) => {
                    if (!checkDateRange(o.createdDate, dateSettings.range, dateSettings.from, dateSettings.to)) return;
                    if (filters.salesman !== "All" && customer.salesmanName !== filters.salesman) return;

                    if (filters.search) {
                        const hit =
                            customer.customerName.toLowerCase().includes(searchLower) ||
                            customer.salesmanName.toLowerCase().includes(searchLower);
                        if (!hit) return;
                    }

                    const dateKey = toLocalDayKey(o.createdDate);
                    const key = `${customer.customerName}||${customer.salesmanName}||${dateKey}`;
                    const amt = Number(o.allocatedAmount ?? 0);

                    if (!agg.has(key)) {
                        agg.set(key, {
                            uniqueId: `${group.clusterName}__${customer.customerName}__${customer.salesmanName}__${dateKey}`,
                            clusterName: group.clusterName,
                            customerName: customer.customerName,
                            salesmanName: customer.salesmanName,
                            clusterRowSpan: 0,
                            customerRowSpan: 0,
                            orderDate: o.orderDate,
                            createdDate: dateKey,
                            approvedDate: o.approvedDate,
                            status: "For Consolidation",
                            amount: 0,
                            consolidation: 0,
                            clusterTotal: 0,
                        });
                    }

                    const r = agg.get(key)!;
                    r.amount += amt;
                    r.consolidation += amt;
                });
            });

            const groupRows = Array.from(agg.values());
            const clusterTotal = groupRows.reduce((sum, r) => sum + r.amount, 0);
            groupRows.forEach((r) => (r.clusterTotal = clusterTotal));
            rows.push(...groupRows);
        });

        return rows;
    };

    const tableRows = useMemo(() => {
        return getGroupedRows(
            rawGroups,
            { cluster: clusterFilter, salesman: salesmanFilter, search: searchTerm },
            { range: dateRange, from: customDateFrom, to: customDateTo }
        );
    }, [rawGroups, searchTerm, salesmanFilter, clusterFilter, dateRange, customDateFrom, customDateTo]);

    const countFilteredOrders = (
        data: ClusterGroupRaw[],
        filters: { cluster: ClusterFilterValue; salesman: string; search?: string; status?: string },
        dateSettings: { range: DateRange; from: string; to: string }
    ) => {
        const searchLower = (filters.search || "").toLowerCase();
        let count = 0;
        const clusterSel = normalizeClusterFilter(filters.cluster);

        data.forEach((group) => {
            if (!clusterSel.all && !clusterSel.set.has(group.clusterName)) return;

            group.customers.forEach((customer) => {
                customer.orders.forEach((o) => {
                    if (!checkDateRange(o.createdDate, dateSettings.range, dateSettings.from, dateSettings.to)) return;
                    if (filters.salesman !== "All" && customer.salesmanName !== filters.salesman) return;

                    if (filters.search) {
                        const hit =
                            customer.customerName.toLowerCase().includes(searchLower) ||
                            customer.salesmanName.toLowerCase().includes(searchLower);
                        if (!hit) return;
                    }

                    count++;
                });
            });
        });
        return count;
    };

    const consolidationOrdersCount = useMemo(() => {
        return countFilteredOrders(
            rawGroups,
            { cluster: clusterFilter, salesman: salesmanFilter, search: searchTerm },
            { range: dateRange, from: customDateFrom, to: customDateTo }
        );
    }, [rawGroups, searchTerm, salesmanFilter, clusterFilter, dateRange, customDateFrom, customDateTo]);

    const sortedRows = useMemo(() => {
        return sortRowsFn(tableRows, sortConfig);
    }, [tableRows, sortConfig]);

    const availableSalesmen = useMemo(() => {
        const rowsWithoutSalesmanFilter = getGroupedRows(
            rawGroups,
            { cluster: clusterFilter, salesman: "All", search: searchTerm },
            { range: dateRange, from: customDateFrom, to: customDateTo }
        );
        const salesmen = new Set<string>();
        rowsWithoutSalesmanFilter.forEach((r) => salesmen.add(r.salesmanName));
        return Array.from(salesmen).sort();
    }, [rawGroups, clusterFilter, searchTerm, dateRange, customDateFrom, customDateTo]);

    const availableClusters = useMemo(() => {
        const rowsWithoutClusterFilter = getGroupedRows(
            rawGroups,
            { cluster: [], salesman: salesmanFilter, search: searchTerm },
            { range: dateRange, from: customDateFrom, to: customDateTo }
        );
        const clusters = new Set<string>();
        rowsWithoutClusterFilter.forEach((r) => clusters.add(r.clusterName));
        return Array.from(clusters).sort();
    }, [rawGroups, salesmanFilter, searchTerm, dateRange, customDateFrom, customDateTo]);

    return {
        rawGroups,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        salesmanFilter,
        setSalesmanFilter,
        clusterFilter,
        setClusterFilter,
        dateRange,
        setDateRange,
        customDateFrom,
        setCustomDateFrom,
        customDateTo,
        setCustomDateTo,
        sortConfig,
        setSortConfig,
        tableRows,
        consolidationOrdersCount,
        sortedRows,
        availableSalesmen,
        availableClusters,
        getGroupedRows,
        countFilteredOrders
    };
};
