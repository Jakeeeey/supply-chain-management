import { ReceivingProductsManualModule } from "@/modules/supply-chain-management/supplier-management/receiving-products-manual";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Receiving Products (Manual)",
};

export default function ReceivingProductsManualPage() {
    return <ReceivingProductsManualModule />;
}
