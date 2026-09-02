export function formatMoney(amount: number, currency = "PHP") {
    try {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(Number(amount || 0));
    } catch {
        // fallback
        return `₱${Number(amount || 0).toFixed(2)}`;
    }
}

export function formatDate(dateISO: string) {
    try {
        const d = new Date(dateISO);
        if (Number.isNaN(d.getTime())) return dateISO;
        return d.toLocaleDateString("en-US");
    } catch {
        return dateISO;
    }
}

export function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}
