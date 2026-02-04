// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/utils/format.ts

export function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function buildMoneyFormatter() {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function makePoMeta() {
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const poNumber = `PO-${dateStr}-${timestamp}`;
    const poDate = new Intl.DateTimeFormat("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
    }).format(new Date());

    return { poNumber, poDate };
}
