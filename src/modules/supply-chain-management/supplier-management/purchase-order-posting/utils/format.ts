export function money(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency} ${Number(amount || 0).toFixed(2)}`;
    }
}

export function safeText(v: unknown, fb = "—") {
    const s = String(v ?? "").trim();
    return s ? s : fb;
}

export function formatPostedAt(isoLike: string) {
    const s = safeText(isoLike, "");
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
