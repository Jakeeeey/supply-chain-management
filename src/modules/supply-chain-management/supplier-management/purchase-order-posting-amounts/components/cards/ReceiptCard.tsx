"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PostingReceipt } from "../../types";
import { formatPostedAt, safeText } from "../../utils/format";
import { ConfirmPostReceiptDialog } from "../dialogs/ConfirmPostReceiptDialog";
import { ConfirmRevertReceiptDialog } from "../dialogs/ConfirmRevertReceiptDialog";
import { usePostingOfPo } from "../../providers/PostingOfPoProvider";

export function ReceiptCard({ receipt }: { receipt: PostingReceipt }) {
    const { selectedPO, postReceipt, posting, revertReceipt, reverting } = usePostingOfPo();
    const [open, setOpen] = React.useState(false);
    const [revertOpen, setRevertOpen] = React.useState(false);

    if (!selectedPO) return null;

    // Normalise isPosted to boolean — API returns 0 | 1
    const isPosted = Number(receipt.isPosted) === 1 || receipt.isPosted === true;

    const poStatus = String(selectedPO.status || "").toUpperCase();

    // PO is ready to post receipts when:
    //   - PARTIAL: some items received, nothing posted yet
    //   - PARTIAL_POSTED: some receipts already posted, more can still be posted
    //   - RECEIVED: fully received, posting receipts to close it out
    const poReady =
        selectedPO.postingReady === true ||
        poStatus === "RECEIVED" ||
        poStatus === "PARTIAL" ||
        poStatus === "PARTIAL_POSTED";

    const canPost = !!selectedPO.id && !isPosted && poReady;
    const canRevert = !!selectedPO.id && !isPosted;

    const disabledReason = !poReady
        ? "PO is not ready. Complete receiving first."
        : isPosted
        ? "Receipt already posted."
        : "";

    return (
        <Card className="p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold">
                        {safeText(receipt.receiptNo)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        Receipt Date: {formatPostedAt(receipt.receiptDate)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        Lines: {receipt.linesCount} • Qty: {receipt.totalReceivedQty}
                    </div>

                    {/* Hint when receipt can't be posted yet */}
                    {!isPosted && !poReady ? (
                        <div className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                            {disabledReason}
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={isPosted ? "outline" : "secondary"}>
                        {isPosted ? "POSTED" : "UNPOSTED"}
                    </Badge>

                    {canRevert && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reverting || posting}
                            onClick={() => setRevertOpen(true)}
                            className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-950"
                        >
                            {reverting ? "Reverting..." : "Revert"}
                        </Button>
                    )}

                </div>
            </div>

            <ConfirmPostReceiptDialog
                open={open}
                onOpenChange={setOpen}
                loading={posting}
                onConfirm={async () => {
                    setOpen(false);
                    if (!selectedPO?.id) return;
                    await postReceipt(selectedPO.id, receipt.receiptNo);
                }}
            />

            <ConfirmRevertReceiptDialog
                open={revertOpen}
                onOpenChange={setRevertOpen}
                loading={reverting}
                receiptNo={receipt.receiptNo}
                onConfirm={async () => {
                    setRevertOpen(false);
                    if (!selectedPO?.id) return;
                    await revertReceipt(selectedPO.id, receipt.receiptNo);
                }}
            />
        </Card>
    );
}