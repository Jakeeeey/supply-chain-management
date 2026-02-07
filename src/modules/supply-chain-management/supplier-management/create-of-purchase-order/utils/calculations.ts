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
    const d = new Date();
    const timestamp = d.getTime();
    const dateStr = d.toISOString().split("T")[0].replace(/-/g, "");
    const poNumber = `PO-${dateStr}-${timestamp}`;

    // keep as-is (you can display a different date format in UI)
    const poDate = new Intl.DateTimeFormat("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
    }).format(d);

    // ✅ add ISO helpers (no breaking change; just additional fields)
    const poDateISO = d.toISOString();
    const poDateOnlyISO = poDateISO.slice(0, 10);

    return { poNumber, poDate, poDateISO, poDateOnlyISO };
}

export const TAX_RATES = {
    VAT: 0.12,
    EWT_GOODS: 0.01,
    EWT_SERVICES: 0.02,
};

/**
 * Legacy VAT-inclusive logic (KEEP — per your instruction, we won't touch usage)
 */
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

    return Math.max(0, Math.min(100, Number(combined.toFixed(4))));
}

/**
 * ✅ Derive units per BOX from product name/description
 */
export function deriveUnitsPerBoxFromText(
    name?: string,
    description?: string,
    fallbackCount?: number
): number {
    const text = `${name ?? ""} ${description ?? ""}`.trim();

    const match = text.match(
        /\d+(?:\.\d+)?(?:\s*'?s)?\s*[xX]\s*\d+(?:\.\d+)?(?:\s*'?s)?(?:\s*[xX]\s*\d+(?:\.\d+)?(?:\s*'?s)?)*?/ // chain
    );

    if (match?.[0]) {
        const cleaned = match[0]
            .toUpperCase()
            .replace(/['\s]/g, "")
            .replace(/S(?=X)/g, "");

        const parts = cleaned
            .split("X")
            .map((p) => Number(String(p).replace(/[^\d.]/g, "")))
            .filter((n) => Number.isFinite(n) && n > 0);

        if (parts.length >= 2) {
            const factor = parts.reduce((acc, n) => acc * n, 1);
            if (Number.isFinite(factor) && factor > 0)
                return Math.max(1, Math.round(factor));
        }
    }

    const fb = Number(fallbackCount ?? 1);
    return Number.isFinite(fb) && fb > 1 ? Math.round(fb) : 1;
}

/**
 * ✅ UPDATED COMPUTATION (per your formula)
 *
 * Net Amount = Gross - Discount
 * VAT Exclusive = Net / 1.12
 * VAT Amount = Net - VAT Exclusive
 * EWT Goods = 1% of Net
 *
 * IMPORTANT:
 * - "Total" here equals Net (VAT is already inside Net as a portion)
 * - This prevents "lumolobo" ang total (no double-adding VAT)
 */
export function calculateVatExclusiveFromAmounts(
    grossAmount: number,
    discountAmount: number,
    vatRate: number = TAX_RATES.VAT,
    ewtGoodsRate: number = TAX_RATES.EWT_GOODS
) {
    const gross = Number(grossAmount || 0);
    const disc = Math.max(0, Number(discountAmount || 0));

    const netAmount = Math.max(0, gross - disc); // ✅ your "Net Amount" basis
    const vatExclusive = netAmount / (1 + vatRate); // ✅ Net / 1.12
    const vatAmount = Math.max(0, netAmount - vatExclusive); // ✅ Net - VAT Exclusive

    const ewtGoods = Math.max(0, netAmount * ewtGoodsRate); // ✅ 1% of Net

    const totalInvoice = netAmount; // ✅ total = net (do NOT add VAT again)
    const payableToSupplier = Math.max(0, totalInvoice - ewtGoods);

    return {
        grossAmount: gross,
        discountAmount: disc,
        netAmount,
        vatExclusive,
        vatAmount,
        ewtGoods,
        total: totalInvoice,
        payableToSupplier,
    };
}
