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
 *
 * Supports patterns like:
 * - 12x10, 3 x 10 x 12, 12×10
 * - 12 PACKS OF 10 PCS  => 120
 * - 24 PCS / 24PC / 24 PIECES => 24
 * - 24'S / 24S => 24
 *
 * ✅ NEW (added only, no removal):
 * - (10pcsx20bags) => 200
 * - 48gx60pcs / 74gx40pcs / 39gx60pcs => 60/40/60 (ignore grams/ml)
 * - 250mlx48 / 500mlx24 / 330ml x 24  => 48/24/24
 * - 150mlFtx48 / 150ml FTX 48         => 48
 * - (12+2) / (11+1) / 12+2            => 14 / 12 / etc
 * - size-only like "17KG" (no pack indicators) => 1 (container, not pack count)
 *
 * ✅ ADDED (this request):
 * - 48X100G / 20X1KG => return COUNT (48/20), NOT multiply
 * - 70STRIPS/CASE / (75STRIPS/CASE) / CASE OF 70 STRIPS => return 70/75
 * - size-only "25KLS", "25KGS" => 1 (if no pack indicators)
 *
 * IMPORTANT:
 * - returns "pieces per box"
 * - if nothing matched -> fallbackCount if > 1 else 1
 */
export function deriveUnitsPerBoxFromText(
    name?: string,
    description?: string,
    fallbackCount?: number
): number {
    const raw = `${name ?? ""} ${description ?? ""}`.trim();
    if (!raw) {
        const fb = Number(fallbackCount ?? 1);
        return Number.isFinite(fb) && fb > 1 ? Math.round(fb) : 1;
    }

    const text = raw
        .toUpperCase()
        .replace(/,/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const safeInt = (n: number) => {
        if (!Number.isFinite(n)) return 0;
        if (n <= 0) return 0;
        if (n > 10000) return 0;
        return Math.round(n);
    };

    // =========================================================
    // 0) ✅ SPECIAL/EDGE CASES (pack formats without spaces)
    // =========================================================
    {
        // E) ✅ Promo freebies like "(12+2)" / "(11+1)" => 14 / 12
        // Also catches "12+2" even if embedded in SKU.
        const promoParen = text.match(
            /\(\s*(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\s*\)/
        );
        if (promoParen) {
            const a = Number(promoParen[1]);
            const b = Number(promoParen[2]);
            const out = safeInt(a + b);
            if (out > 0) return Math.max(1, out);
        }

        const promoInline = text.match(/\b(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\b/);
        if (promoInline) {
            const a = Number(promoInline[1]);
            const b = Number(promoInline[2]);
            // guard: avoid weird sums
            const out = safeInt(a + b);
            if (out > 0 && out <= 1000) return Math.max(1, out);
        }

        // =========================================================
        // 0) ✅ NEW: COUNT x SIZE formats should return COUNT (not multiply)
        // Examples:
        // - 48X100G  => 48
        // - 10X1000G => 10
        // - 12X450G  => 12
        // - 20X1KG   => 20
        // - 4X2500G  => 4
        // =========================================================
        const countXSize = text.match(
            /\b(\d{1,5})\s*(?:X|×|\*)\s*(\d+(?:\.\d+)?)\s*(?:ML|G|KG|KGS|KLS|L|OZ|LTR|LITER|LITRE)\b/
        );
        if (countXSize) {
            const count = Number(countXSize[1]);
            const out = safeInt(count);
            if (out > 0) return Math.max(1, out);
        }

        // =========================================================
        // 0) ✅ NEW: "70STRIPS/CASE", "(75STRIPS/CASE)", "48PCS/CASE", etc => return left number
        // Examples:
        // - (75STRIPS/CASE) => 75
        // - 70 STRIPS / CASE => 70
        // - 48 PCS/CTN => 48
        // =========================================================
        const perCase = text.match(
            /\b(\d{1,5})\s*(STRIPS?|STRIP|SACHETS?|SACHET|PCS?|PC|PIECES|PCE|EA|CT|PACKS?|PKS?|PK|BAGS?|BAG)\s*(?:\/|PER)\s*(CASE|CS|CTN|CARTON|BOX)\b/
        );
        if (perCase) {
            const out = safeInt(Number(perCase[1]));
            if (out > 0) return Math.max(1, out);
        }

        // Variant: "70 STRIPS CASE" (no slash/per)
        const unitThenCase = text.match(
            /\b(\d{1,5})\s*(STRIPS?|STRIP|SACHETS?|SACHET|PCS?|PC|PIECES|PCE|EA|CT|PACKS?|PKS?|PK|BAGS?|BAG)\s*(CASE|CS|CTN|CARTON|BOX)\b/
        );
        if (unitThenCase) {
            const out = safeInt(Number(unitThenCase[1]));
            if (out > 0) return Math.max(1, out);
        }

        // Variant: "CASE OF 70 STRIPS" => 70
        const caseOf = text.match(
            /\b(?:CASE|CS|CTN|CARTON|BOX)\s*(?:OF\s*)?(\d{1,5})\s*(STRIPS?|STRIP|SACHETS?|SACHET|PCS?|PC|PIECES|PCE|EA|CT|PACKS?|PKS?|PK|BAGS?|BAG)\b/
        );
        if (caseOf) {
            const out = safeInt(Number(caseOf[1]));
            if (out > 0) return Math.max(1, out);
        }

        // =========================================================
        // 0) ✅ NEW: Size-only kilo abbreviations (ex: "25KLS", "25KGS") => 1
        // (useful for items like "CORNSTARCH 25KLS - MASTER CHEF")
        // =========================================================
        const hasSizeOnlyAlt = /\b\d+(?:\.\d+)?\s*(?:KLS|KGS|KILO|KILOS)\b/.test(text);
        const hasPackIndicatorsAlt =
            /\b(?:X|×|\*|PCS?|PC|PIECES|PCE|EA|CT|PACKS?|PKS?|PK|BAGS?|BAG|TIES?|BUNDLES?|BUNDLE|SACHETS?|SACHET|STRIPS?|STRIP|ROLLS?|ROLL)\b/.test(
                text
            ) ||
            /'?\s*S\b/.test(text) ||
            /\+/.test(text);

        if (hasSizeOnlyAlt && !hasPackIndicatorsAlt) {
            return 1;
        }

        // A) (10PCSX20BAGS) / 10PCS X 20BAGS / 10PC X 20 => 200
        const m = text.match(
            /\b(\d+(?:\.\d+)?)\s*(PCS?|PC|PIECES|PCE|EA|CT)\s*(?:X|×|\*)\s*(\d+(?:\.\d+)?)(?:\s*(BAGS?|BAG|PACKS?|PKS?|PK|TIES?|BUNDLES?|BUNDLE|SACHETS?|SACHET|STRIPS?|STRIP|ROLLS?|ROLL))?\b/
        );
        if (m) {
            const a = Number(m[1]);
            const b = Number(m[3]);
            const out = safeInt(a * b);
            if (out > 0) return Math.max(1, out);
        }

        // B) SIZE+UNIT then X counts (ignore size), supports trailing units:
        // - 48GX60PCS => 60
        // - 250MLX48  => 48
        // - 250ML X 4 X 6 => 24
        // - 74GX40PCS => 40
        const seg = text.match(
            /\b\d+(?:\.\d+)?\s*(?:ML|G|KG|L|OZ|LTR|LITER|LITRE)\s*(?:FTX|FT|F)?\s*(?:X|×|\*)\s*\d+(?:\.\d+)?\s*(?:PCS?|PC|PIECES|PCE|EA|CT|BAGS?|BAG|PACKS?|PKS?|PK|TIES?|BUNDLES?|BUNDLE|SACHETS?|SACHET|STRIPS?|STRIP|ROLLS?|ROLL)?(?:\s*(?:X|×|\*)\s*\d+(?:\.\d+)?\s*(?:PCS?|PC|PIECES|PCE|EA|CT|BAGS?|BAG|PACKS?|PKS?|PK|TIES?|BUNDLES?|BUNDLE|SACHETS?|SACHET|STRIPS?|STRIP|ROLLS?|ROLL)?)*\b/
        );

        if (seg?.[0]) {
            const rest = seg[0]
                .replace(
                    /^\s*\d+(?:\.\d+)?\s*(?:ML|G|KG|L|OZ|LTR|LITER|LITRE)\s*(?:FTX|FT|F)?\s*/i,
                    ""
                )
                .trim();

            const nums = rest
                .split(/X|×|\*/g)
                .map((s) => Number(String(s).replace(/[^\d.]/g, "")))
                .filter((n) => Number.isFinite(n) && n > 0);

            if (nums.length >= 1) {
                const product = nums.reduce((acc, n) => acc * n, 1);
                const out = safeInt(product);
                if (out > 0) return Math.max(1, out);
            }
        }

        // C) Generic "X60PCS" / "X 60 PCS" anywhere (fixes missing word-boundary cases)
        const xpcs = text.match(/(?:X|×|\*)\s*(\d{1,5})\s*(PCS?|PC|PIECES|PCE|EA|CT)\b/);
        if (xpcs?.[1]) {
            const out = safeInt(Number(xpcs[1]));
            if (out > 0) return Math.max(1, out);
        }

        // D) FTX variant: "150MLFTX48" / "150ML FTX 48" => 48
        const ftx = text.match(
            /\b\d+(?:\.\d+)?\s*(?:ML|G|KG|L|OZ|LTR|LITER|LITRE)\s*(?:FTX|FT|F)\s*(\d{1,5})\b/
        );
        if (ftx?.[1]) {
            const out = safeInt(Number(ftx[1]));
            if (out > 0) return Math.max(1, out);
        }

        // F) ✅ Size-only container like "17KG" / "500ML" with NO pack indicators => 1
        // This makes these cases explicitly recognized (useful if your caller logs "not converted").
        const hasSizeOnly = /\b\d+(?:\.\d+)?\s*(?:ML|G|KG|L|OZ|LTR|LITER|LITRE)\b/.test(text);
        const hasPackIndicators =
            /\b(?:X|×|\*|PCS?|PC|PIECES|PCE|EA|CT|PACKS?|PKS?|PK|BAGS?|BAG|TIES?|BUNDLES?|BUNDLE|SACHETS?|SACHET|STRIPS?|STRIP|ROLLS?|ROLL)\b/.test(
                text
            ) ||
            /'?\s*S\b/.test(text) ||
            /\+/.test(text);

        if (hasSizeOnly && !hasPackIndicators) {
            return 1;
        }
    }

    // 1) Strongest: chained multipliers like 12x10, 3 x 10 x 12 (also ×)
    {
        const m = text.match(
            /\b\d+(?:\.\d+)?\s*(?:X|×|\*)\s*\d+(?:\.\d+)?(?:\s*(?:X|×|\*)\s*\d+(?:\.\d+)?)*\b/
        );

        if (m?.[0]) {
            const nums = m[0]
                .split(/X|×|\*/g)
                .map((s) => Number(String(s).replace(/[^\d.]/g, "")))
                .filter((n) => Number.isFinite(n) && n > 0);

            if (nums.length >= 2) {
                const product = nums.reduce((acc, n) => acc * n, 1);
                const out = safeInt(product);
                if (out > 0) return Math.max(1, out);
            }
        }
    }

    // 2) "12 PACKS OF 10 PCS" / "12 PK OF 10" => 120
    {
        const m = text.match(
            /\b(\d+(?:\.\d+)?)\s*(PACKS?|PKS?|PK|TIES?|BUNDLES?|BUNDLE|BAGS?|BAG|SACHETS?|SACHET|STRIPS?|STRIP|ROLLS?|ROLL)\s*(?:OF\s*)?(\d+(?:\.\d+)?)\s*(PCS?|PC|PIECES|PCE|EA|CT)?\b/
        );
        if (m) {
            const outer = Number(m[1]);
            const inner = Number(m[3]);
            const out = safeInt(outer * inner);
            if (out > 0) return Math.max(1, out);
        }
    }

    // 3) "24 PCS", "24PC", "24 PIECES" => 24
    {
        const m = text.match(/\b(\d+(?:\.\d+)?)\s*(PCS?|PC|PIECES|PCE|EA|CT)\b/);
        if (m) {
            const out = safeInt(Number(m[1]));
            if (out > 0) return Math.max(1, out);
        }
    }

    // 4) "24'S", "24S" common FMCG format
    {
        const m = text.match(/\b(\d{1,3})(?:\s*'?\s*S)\b/);
        if (m) {
            const n = Number(m[1]);
            if (Number.isFinite(n) && n > 0 && n <= 500) return Math.max(1, Math.round(n));
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

    const ewtGoods = Math.max(0,vatExclusive * ewtGoodsRate); // ✅ 1% of Net

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
