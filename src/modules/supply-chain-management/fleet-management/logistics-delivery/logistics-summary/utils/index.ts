import { DateRange } from "../types";

export const calculateDateRange = (range: string, customStartVal?: string, customEndVal?: string) => {
    const now = new Date();
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    let start = new Date();
    let end = new Date();

    const T_START = 'T00:00:00';
    const T_END = 'T23:59:59';

    if (range === 'today') {
        const todayStr = formatDate(now);
        return `${todayStr}${T_START},${todayStr}${T_END}`;
    }
    if (range === 'yesterday') {
        start.setDate(now.getDate() - 1);
        const yestStr = formatDate(start);
        return `${yestStr}${T_START},${yestStr}${T_END}`;
    }
    if (range === 'tomorrow') {
        start.setDate(now.getDate() + 1);
        const tomStr = formatDate(start);
        return `${tomStr}${T_START},${tomStr}${T_END}`;
    }
    if (range === 'this-week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end.setDate(start.getDate() + 6);
    } else if (range === 'this-month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === 'this-year') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
    } else if (range === 'custom') {
        if (!customStartVal || !customEndVal) return '';
        return `${customStartVal}${T_START},${customEndVal}${T_END}`;
    }

    return `${formatDate(start)}${T_START},${formatDate(end)}${T_END}`;
};

export const parseCurrency = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = String(val).replace(/[^0-9.-]+/g, "");
    return parseFloat(cleanStr) || 0;
};

export const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatCurrencyPdf = (amount: number) =>
    amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
