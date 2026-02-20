import { useState, useEffect, useMemo } from "react";
import { ClusterGroupRaw, TableRow, DateRange, ClusterFilterValue, SortConfig, SortDirection } from "../types";
import { fetchPendingDeliveries } from "../providers/fetchProvider";
import { toLocalDayKey, statusToBucket, checkDateRange, normalizeClusterFilter } from "../utils";

export const usePendingDeliveries = () => {
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
                const data = await fetchPendingDeliveries();
                setRawGroups(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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
                    if (!checkDateRange(o.order_date, dateSettings.range, dateSettings.from, dateSettings.to)) return;
                    if (filters.salesman !== "All" && customer.salesmanName !== filters.salesman) return;

                    if (filters.status && filters.status !== "All") {
                        const orderStatusLower = (o.order_status || "").toLowerCase();
                        const target = filters.status.toLowerCase().replace("for ", "");
                        if (!orderStatusLower.includes(target)) return;
                    }

                    if (filters.search) {
                        const hit =
                            customer.customerName.toLowerCase().includes(searchLower) ||
                            customer.salesmanName.toLowerCase().includes(searchLower);
                        if (!hit) return;
                    }

                    const dateKey = toLocalDayKey(o.order_date);
                    const key = `${customer.customerName}||${customer.salesmanName}||${dateKey}`;
                    const amt = Number((o.allocated_amount ?? o.total_amount ?? 0) as any);
                    const bucket = statusToBucket(o.order_status);

                    if (!agg.has(key)) {
                        agg.set(key, {
                            uniqueId: `${group.clusterName}__${customer.customerName}__${customer.salesmanName}__${dateKey}`,
                            clusterName: group.clusterName,
                            customerName: customer.customerName,
                            salesmanName: customer.salesmanName,
                            clusterRowSpan: 0,
                            customerRowSpan: 0,
                            orderDate: dateKey,
                            status: "Mixed",
                            amount: 0,
                            approval: 0,
                            consolidation: 0,
                            picking: 0,
                            invoicing: 0,
                            loading: 0,
                            shipping: 0,
                            clusterTotal: 0,
                        });
                    }

                    const r = agg.get(key)!;
                    r.amount += amt;
                    if (bucket.approval) r.approval += amt;
                    if (bucket.consolidation) r.consolidation += amt;
                    if (bucket.picking) r.picking += amt;
                    if (bucket.invoicing) r.invoicing += amt;
                    if (bucket.loading) r.loading += amt;
                    if (bucket.shipping) r.shipping += amt;
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
                    if (!checkDateRange(o.order_date, dateSettings.range, dateSettings.from, dateSettings.to)) return;
                    if (filters.salesman !== "All" && customer.salesmanName !== filters.salesman) return;

                    if (filters.status && filters.status !== "All") {
                        const orderStatusLower = (o.order_status || "").toLowerCase();
                        const target = filters.status.toLowerCase().replace("for ", "");
                        if (!orderStatusLower.includes(target)) return;
                    }

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

    const pendingOrdersCount = useMemo(() => {
        return countFilteredOrders(
            rawGroups,
            { cluster: clusterFilter, salesman: salesmanFilter, search: searchTerm },
            { range: dateRange, from: customDateFrom, to: customDateTo }
        );
    }, [rawGroups, searchTerm, salesmanFilter, clusterFilter, dateRange, customDateFrom, customDateTo]);

    const statusTotals = useMemo(() => {
        return tableRows.reduce(
            (acc, r) => {
                acc.approval += r.approval;
                acc.consolidation += r.consolidation;
                acc.picking += r.picking;
                acc.invoicing += r.invoicing;
                acc.loading += r.loading;
                acc.shipping += r.shipping;
                return acc;
            },
            { approval: 0, consolidation: 0, picking: 0, invoicing: 0, loading: 0, shipping: 0 }
        );
    }, [tableRows]);

    const sortedRows = useMemo(() => {
        const base = [...tableRows].sort((a, b) => {
            const c = a.clusterName.localeCompare(b.clusterName);
            if (c !== 0) return c;
            const cu = a.customerName.localeCompare(b.customerName);
            if (cu !== 0) return cu;
            const s = a.salesmanName.localeCompare(b.salesmanName);
            if (s !== 0) return s;
            return a.orderDate.localeCompare(b.orderDate);
        });

        if (!sortConfig) return base;

        const blocks = new Map<string, TableRow[]>();
        for (const r of base) {
            const k = `${r.clusterName}||${r.customerName}`;
            if (!blocks.has(k)) blocks.set(k, []);
            blocks.get(k)!.push(r);
        }

        const compare = (a: TableRow, b: TableRow) => {
            const av = a[sortConfig.key];
            const bv = b[sortConfig.key];

            if (typeof av === "number" && typeof bv === "number") {
                return sortConfig.direction === "asc" ? av - bv : bv - av;
            }
            if (typeof av === "string" && typeof bv === "string") {
                return sortConfig.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return 0;
        };

        const out: TableRow[] = [];
        const seen = new Set<string>();
        for (const r of base) {
            const k = `${r.clusterName}||${r.customerName}`;
            if (seen.has(k)) continue;
            seen.add(k);

            const block = blocks.get(k)!;
            block.sort(compare);
            out.push(...block);
        }

        return out;
    }, [tableRows, sortConfig]);

    const availableSalesmen = useMemo(() => {
        const salesmen = new Set<string>();
        rawGroups.forEach((group) => group.customers.forEach((c) => salesmen.add(c.salesmanName)));
        return Array.from(salesmen).sort();
    }, [rawGroups]);

    const availableClusters = useMemo(() => {
        const clusters = new Set<string>();
        rawGroups.forEach((group) => clusters.add(group.clusterName));
        return Array.from(clusters).sort();
    }, [rawGroups]);

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
        pendingOrdersCount,
        statusTotals,
        sortedRows,
        availableSalesmen,
        availableClusters,
        getGroupedRows,
        countFilteredOrders
    };
};
