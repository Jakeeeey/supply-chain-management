/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PostingReceipt } from "../../types";
import { formatPostedAt, safeText } from "../../utils/format";
import { ConfirmPostReceiptDialog } from "../dialogs/ConfirmPostReceiptDialog";
import { usePostingOfPo } from "../../providers/PostingOfPoProvider";

export function ReceiptCard({ receipt }: { receipt: PostingReceipt }) {
    const { selectedPO, postReceipt, posting } = usePostingOfPo();
    const [open, setOpen] = React.useState(false);

    // Normalise isPosted to boolean — API returns 0 | 1
    const isPosted = Number(receipt.isPosted) === 1 || receipt.isPosted === true;

    const poStatus = String((selectedPO as any)?.status || "").toUpperCase();

    // PO is ready to post receipts when:
    //   - PARTIAL: some items received, nothing posted yet
    //   - PARTIAL_POSTED: some receipts already posted, more can still be posted
    //   - RECEIVED: fully received, posting receipts to close it out
    const poReady =
        (selectedPO as any)?.postingReady === true ||
        poStatus === "RECEIVED" ||
        poStatus === "PARTIAL" ||
        poStatus === "PARTIAL_POSTED";

    const canPost = !!(selectedPO as any)?.id && !isPosted && poReady;

    const disabledReason = !poReady
        ? "PO is not ready. Complete receiving first."
        : isPosted
        ? "Receipt already posted."
        : "";

    return (
        <Card className="p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
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

                    <span title={!canPost ? disabledReason : ""}>
                        <Button
                            type="button"
                            size="sm"
                            disabled={!canPost || posting}
                            onClick={() => setOpen(true)}
                        >
                            Post
                        </Button>
                    </span>
                </div>
            </div>

            <ConfirmPostReceiptDialog
                open={open}
                onOpenChange={setOpen}
                loading={posting}
                onConfirm={async () => {
                    setOpen(false);
                    if (!(selectedPO as any)?.id) return;
                    await postReceipt((selectedPO as any).id, receipt.receiptNo);
                }}
            />
        </Card>
    );
}