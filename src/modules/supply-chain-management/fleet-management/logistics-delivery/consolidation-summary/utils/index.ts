import { DateRange, ClusterFilterValue, TableRow, SortConfig } from "../types";

export const formatCurrency = (amount: number) => {
    if (amount === 0) return "-";
    return `₱${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export const formatTotalCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export const formatCardCurrency = (amount: number) => {
    if (amount === 0) return "₱ -";
    return `₱${amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
};

export const formatNumberForPDF = (amount: number) => {
    if (amount === 0) return "-";
    return amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const formatTotalForPDF = (amount: number) => {
    if (amount === 0) return "-";
    return amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const formatDatePrinted = (d: Date) => {
    return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

export const toLocalDayKey = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

export const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const [y, m, d] = dateString.split("-").map((x) => Number(x));
    const local = new Date(y, (m || 1) - 1, d || 1);
    return local.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export const checkDateRange = (dateString: string, range: DateRange, customFrom?: string, customTo?: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (range === "custom") {
        if (!customFrom || !customTo) return true;
        const [fy, fm, fd] = customFrom.split("-").map(Number);
        const [ty, tm, td] = customTo.split("-").map(Number);
        const from = new Date(fy, fm - 1, fd);
        const to = new Date(ty, tm - 1, td, 23, 59, 59, 999);
        return date >= from && date <= to;
    }

    if (range === "today") return targetDate.getTime() === startOfToday.getTime();

    if (range === "yesterday") {
        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        return targetDate.getTime() === yesterday.getTime();
    }

    if (range === "this-week") {
        const dayOfWeek = startOfToday.getDay();
        const diff = startOfToday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(diff);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return date >= startOfWeek && date <= endOfWeek;
    }

    if (range === "this-month")
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    if (range === "this-year") return date.getFullYear() === now.getFullYear();

    return true;
};

export const statusToBucket = (statusRaw: string) => {
    const s = (statusRaw || "").toLowerCase();
    return {
        consolidation: s.includes("conso") || s.includes("consolidation"),
    };
};

export function normalizeClusterFilter(v: ClusterFilterValue): { all: boolean; set: Set<string> } {
    if (Array.isArray(v)) {
        const cleaned = v.filter(Boolean);
        if (cleaned.length === 0 || cleaned.includes("All")) return { all: true, set: new Set() };
        return { all: false, set: new Set(cleaned) };
    }
    if (!v || v === "All") return { all: true, set: new Set() };
    return { all: false, set: new Set([v]) };
}

export function clusterLabel(selected: string[], allLabel = "All Clusters") {
    if (!selected || selected.length === 0) return allLabel;
    if (selected.length <= 2) return selected.join(", ");
    return `${selected.length} clusters`;
}

export const sortRowsFn = (rows: TableRow[], sortConfig: SortConfig | null) => {
    const base = [...rows].sort((a, b) => {
        const c = a.clusterName.localeCompare(b.clusterName);
        if (c !== 0) return c;
        const cu = a.customerName.localeCompare(b.customerName);
        if (cu !== 0) return cu;
        const s = a.salesmanName.localeCompare(b.salesmanName);
        if (s !== 0) return s;
        return a.orderDate.localeCompare(b.orderDate);
    });

    if (!sortConfig) return base;

    return base.sort((a, b) => {
        let cmp = 0;

        // 1. Cluster Level Comparison
        if (sortConfig.key === "clusterName" || sortConfig.key === "clusterTotal") {
            const av = a[sortConfig.key];
            const bv = b[sortConfig.key];
            if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
            else if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
            
            if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
            
            const c = a.clusterName.localeCompare(b.clusterName);
            if (c !== 0) return c;
        } else {
            const c = a.clusterName.localeCompare(b.clusterName);
            if (c !== 0) return c;
        }

        // 2. Customer Level Comparison
        if (sortConfig.key === "customerName" || sortConfig.key === "salesmanName") {
            const av = a[sortConfig.key];
            const bv = b[sortConfig.key];
            if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
            else if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
            
            if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
            
            const cu = a.customerName.localeCompare(b.customerName);
            if (cu !== 0) return cu;
        } else {
            const cu = a.customerName.localeCompare(b.customerName);
            if (cu !== 0) return cu;
        }

        // 3. Order Level Comparison
        if (sortConfig.key === "consolidation" || sortConfig.key === "orderDate") {
            const av = a[sortConfig.key];
            const bv = b[sortConfig.key];
            if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
            else if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
            
            if (cmp !== 0) return sortConfig.direction === "asc" ? cmp : -cmp;
        }

        return a.orderDate.localeCompare(b.orderDate);
    });
};
