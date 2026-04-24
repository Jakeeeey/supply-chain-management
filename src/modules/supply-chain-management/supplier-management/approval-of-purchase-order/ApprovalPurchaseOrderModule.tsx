"use client";

import * as React from "react";
import { toast } from "sonner";

import type { PendingApprovalPO, PurchaseOrderDetail, PaymentTerm } from "./types";
import * as provider from "./providers/fetchProviders";

import PendingApprovalList from "./components/PendingApprovalList";
import PurchaseOrderReviewPanel from "./components/PurchaseOrderReviewPanel";

export default function ApprovalPurchaseOrderModule({ approverId }: { approverId?: number }) {
    const [loadingList, setLoadingList] = React.useState(true);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [error, setError] = React.useState("");

    const [pending, setPending] = React.useState<PendingApprovalPO[]>([]);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [detail, setDetail] = React.useState<PurchaseOrderDetail | null>(null);
    const [paymentTerms, setPaymentTerms] = React.useState<PaymentTerm[]>([]);

    const refreshList = React.useCallback(async () => {
        try {
            setLoadingList(true);
            setError("");
            const [data, terms] = await Promise.all([
                provider.fetchPendingApprovalPOs(),
                provider.fetchPaymentTerms(),
            ]);
            setPending(data);
            setPaymentTerms(terms);
        } catch (e: unknown) {
            const msg = String(e instanceof Error ? e.message : e);
            if (msg.trim().toLowerCase() !== "fetch failed") {
                setError(msg);
                toast.error(`Load failed: ${msg}`);
            }
        } finally {
            setLoadingList(false);
        }
    }, []);

    React.useEffect(() => {
        refreshList();
    }, [refreshList]);

    const loadDetail = React.useCallback(async (id: string) => {
        try {
            setLoadingDetail(true);
            setError("");
            setDetail(null);
            const d = await provider.fetchPurchaseOrderDetail(id);
            setDetail(d);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg.trim().toLowerCase() !== "fetch failed") {
                setError(msg);
                toast.error(`Failed to load PO detail: ${msg}`);
            }
        } finally {
            setLoadingDetail(false);
        }
    }, []);

    const onSelect = React.useCallback(
        (id: string) => {
            setSelectedId(id);
            loadDetail(id);
        },
        [loadDetail]
    );

    const onApprove = React.useCallback(
        async (opts: {
            markAsInvoice: boolean;
            payment_type: number | null;
            termsDays?: number;
            gross_amount?: number;
            discounted_amount?: number;
            vat_amount?: number;
            withholding_tax_amount?: number;
            total_amount?: number;
            branch_id?: number | null;
            receiver_id?: number | null;
        }) => {
            if (!selectedId) return;

            try {
                setError("");
                await provider.approvePurchaseOrder({
                    id: selectedId,
                    ...opts,
                    approverId: approverId,
                });

                // Refresh list and clear selection
                await refreshList();
                setSelectedId(null);
                setDetail(null);
            } catch (e: unknown) {
                const msg = String(e instanceof Error ? e.message : e);
                setError(msg);
                toast.error(`Approval failed: ${msg}`);
            }
        },
        [selectedId, refreshList]
    );

    return (
        <div className="w-full min-w-0 space-y-4">
            <div className="space-y-1">
                <div className="text-2xl font-black">Approval of Purchase Orders</div>
                <div className="text-sm text-muted-foreground">
                    Review and approve pending purchase orders
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 min-w-0 items-start">
                <PendingApprovalList
                    items={pending}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    disabled={loadingList}
                />

                <PurchaseOrderReviewPanel
                    po={detail}
                    loading={loadingDetail}
                    disabled={loadingList}
                    paymentTerms={paymentTerms}
                    onApprove={onApprove}
                />
            </div>
        </div>
    );
}
