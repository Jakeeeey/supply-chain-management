import { DateRange, ClusterFilterValue } from "../types";

export const formatCurrency = (amount: number) => {
    if (amount === 0) return "-";
    return `₱${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export const formatTotalCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
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
        const from = new Date(customFrom);
        const to = new Date(customTo);
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
        return date >= startOfWeek;
    }

    if (range === "this-month")
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    if (range === "this-year") return date.getFullYear() === now.getFullYear();

    return true;
};

export const statusToBucket = (statusRaw: string) => {
    const s = (statusRaw || "").toLowerCase();
    return {
        approval: s.includes("approval"),
        consolidation: s.includes("conso") || s.includes("consolidation"),
        picking: s.includes("picking"),
        invoicing: s.includes("invoicing"),
        loading: s.includes("loading"),
        shipping: s.includes("shipping"),
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
