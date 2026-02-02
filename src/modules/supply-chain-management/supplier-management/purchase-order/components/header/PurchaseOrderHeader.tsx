import { POInfoCard } from "../common/POInfoCard";

export function PurchaseOrderHeader() {
    return (
        <div className="flex items-start justify-between">
            <div>
                <h1 className="text-2xl font-semibold">
                    Create Purchase Order
                </h1>
                <p className="text-sm text-muted-foreground">
                    Select a branch first, then add products to that branch
                </p>
            </div>

            <POInfoCard poNumber="PO-20260202-1770021405978" />
        </div>
    );
}
