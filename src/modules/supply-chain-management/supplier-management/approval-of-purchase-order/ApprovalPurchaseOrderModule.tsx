"use client";

import * as React from "react";

import type { PendingApprovalPO, PurchaseOrderDetail, PaymentTerm } from "./types";
import * as provider from "./providers/approvalPurchaseOrderProvider";

import PendingApprovalList from "./components/PendingApprovalList";
import PurchaseOrderReviewPanel from "./components/PurchaseOrderReviewPanel";

export default function ApprovalPurchaseOrderModule() {
    const [loadingList, setLoadingList] = React.useState(true);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [error, setError] = React.useState("");

    const [pending, setPending] = React.useState<PendingApprovalPO[]>([]);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [detail, setDetail] = React.useState<PurchaseOrderDetail | null>(null);

    const refreshList = React.useCallback(async () => {
        try {
            setLoadingList(true);
            setError("");
            const data = await provider.fetchPendingApprovalPOs();
            setPending(data);
        } catch (e: any) {
            setError(String(e?.message ?? e));
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
        } catch (e: any) {
            setError(String(e?.message ?? e));
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
            paymentTerm: PaymentTerm;
            termsDays?: number;
        }) => {
            if (!selectedId) return;

            try {
                setError("");
                await provider.approvePurchaseOrder({
                    id: selectedId,
                    markAsInvoice: opts.markAsInvoice,
                    paymentTerm: opts.paymentTerm,
                    termsDays: opts.termsDays,
                });

                window.alert("Purchase Order approved successfully!");

                // remove from list + clear selection
                setPending((prev) => prev.filter((x) => x.id !== selectedId));
                setSelectedId(null);
                setDetail(null);
            } catch (e: any) {
                setError(String(e?.message ?? e));
            }
        },
        [selectedId]
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

            <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 min-w-0">
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
                    onApprove={onApprove}
                />
            </div>
        </div>
    );
}
