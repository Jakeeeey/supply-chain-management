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

// src/modules/supply-chain-management/supplier-management/create-of-purchase-order/utils/calculations.ts

export const TAX_RATES = {
    VAT: 0.12,
    EWT_GOODS: 0.01,
    EWT_SERVICES: 0.02,
};

export function calculateFinancials(
    items: { price_per_unit: number; orderQty: number }[],
    discountPercentage: number = 0 // Assuming global discount for now
) {
    // 1. Gross Amount = Sum of (Qty * Unit Price)
    const grossAmount = items.reduce((acc, item) => acc + (item.price_per_unit * item.orderQty), 0);

    // 2. Discount Amount
    const discountAmount = grossAmount * (discountPercentage / 100);

    // 3. Net Amount (Pre-Tax basis for Exclusive, or Payment Amount for Inclusive)
    const netAmount = grossAmount - discountAmount;

    // 4. Net of VAT (Extraction: netAmount / 1.12)
    // Per your prompt: "net of vat = net_amount 1.12 this is variable"
    const netOfVat = netAmount / (1 + TAX_RATES.VAT);

    // 5. VAT Amount = Net Amount - Net of VAT
    const vatAmount = netAmount - netOfVat;

    return {
        subtotal: grossAmount,
        discount: discountAmount,
        netAmount,      // Amount to pay (if inclusive)
        netOfVat,       // Vatable Sales
        vatAmount,      // 12% Component
        total: netAmount // Grand Total
    };
}