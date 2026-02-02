import { Separator } from "@/components/ui/separator";

export function PurchaseOrderSummary({
                                         supplier,
                                     }: {
    supplier: string;
}) {
    return (
        <div className="rounded-lg border bg-muted/30 p-6 space-y-4">
            <h3 className="font-semibold">Purchase Order Summary</h3>

            {/* PO Information */}
            <div className="space-y-2">
                <p className="text-sm font-medium">PO Information</p>

                <div className="text-sm">
                    <p>
                        PO Number:{" "}
                        <span className="font-medium">
              0213123
            </span>
                    </p>
                    <p>Supplier</p>
                    <p className="font-semibold">{supplier}</p>
                    <p>
                        a/p: ₱125,000
                    </p>
                </div>
            </div>

            <Separator />

            {/* Financial Summary */}
            <div className="space-y-2">
                <p className="text-sm font-medium">
                    Financial Summary
                </p>

                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₱1,000.00</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Discount</span>
                        <span>- ₱100.00</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tax (12%)</span>
                        <span>₱100.00</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>₱1,000.00</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
