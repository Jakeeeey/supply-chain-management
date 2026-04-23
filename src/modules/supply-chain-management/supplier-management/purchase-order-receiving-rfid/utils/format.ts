export function money(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
}
