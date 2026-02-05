// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/utils/calculations.ts

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

export const TAX_RATES = {
    VAT: 0.12,
    EWT_GOODS: 0.01,
    EWT_SERVICES: 0.02,
};

export function calculateFinancials(
    items: { price_per_unit: number; orderQty: number }[],
    discountPercentage: number = 0
) {
    const grossAmount = items.reduce(
        (acc, item) => acc + item.price_per_unit * item.orderQty,
        0
    );

    const discountAmount = grossAmount * (discountPercentage / 100);
    const netAmount = grossAmount - discountAmount;

    const netOfVat = netAmount / (1 + TAX_RATES.VAT);
    const vatAmount = netAmount - netOfVat;

    return {
        subtotal: grossAmount,
        discount: discountAmount,
        netAmount,
        netOfVat,
        vatAmount,
        total: netAmount,
    };
}

/**
 * ✅ Derive discount percent from discount code string
 * Supports:
 *  - L10, L6.5
 *  - L10/L5/L2
 *  - L10/5  (treated as L10/L5)
 * Sequential: total = 1 - Π(1 - pi/100)
 *
 * Notes:
 * - If code has no usable % parts => 0
 * - Ignores numbers > 100 (ex: L1312)
 */
export function deriveDiscountPercentFromCode(codeRaw: string): number {
    const code = String(codeRaw ?? "").trim().toUpperCase();

    if (!code || code === "NO DISCOUNT" || code === "D0") return 0;

    const nums = (code.match(/\d+(?:\.\d+)?/g) ?? [])
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);

    if (!nums.length) return 0;

    const netFactor = nums.reduce((acc, p) => acc * (1 - p / 100), 1);
    const combined = (1 - netFactor) * 100;

    // 2-decimal stable
    return Math.max(0, Math.min(100, Number(combined.toFixed(4))));
}

/**
 * ✅ Derive units per BOX from product name/description
 * Example: "Paminta Cracked 15'sx30 Pieces" => 15 * 30 = 450
 *
 * Fallback:
 * - if no x-pattern: use fallbackCount if > 1 else 1
 */
export function deriveUnitsPerBoxFromText(
    name?: string,
    description?: string,
    fallbackCount?: number
): number {
    const text = `${name ?? ""} ${description ?? ""}`.trim();

    // Find first x-chain: "15'sx30", "15 x 30", "15X30", "15's x30"
    const match = text.match(
        /\d+(?:\.\d+)?(?:\s*'?s)?\s*[xX]\s*\d+(?:\.\d+)?(?:\s*'?s)?(?:\s*[xX]\s*\d+(?:\.\d+)?(?:\s*'?s)?)*?/ // chain
    );

    if (match?.[0]) {
        // keep digits, dot, x
        const cleaned = match[0]
            .toUpperCase()
            .replace(/['\s]/g, "")
            .replace(/S(?=X)/g, ""); // removes "'s" before X loosely

        const parts = cleaned
            .split("X")
            .map((p) => Number(String(p).replace(/[^\d.]/g, "")))
            .filter((n) => Number.isFinite(n) && n > 0);

        if (parts.length >= 2) {
            const factor = parts.reduce((acc, n) => acc * n, 1);
            if (Number.isFinite(factor) && factor > 0) return Math.max(1, Math.round(factor));
        }
    }

    const fb = Number(fallbackCount ?? 1);
    return Number.isFinite(fb) && fb > 1 ? Math.round(fb) : 1;
}
