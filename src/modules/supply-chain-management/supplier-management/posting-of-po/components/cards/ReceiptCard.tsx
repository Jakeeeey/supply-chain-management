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

    const isPosted = !!receipt.isPosted;
    const canPost = !!selectedPO?.id && !isPosted;

    return (
        <Card className="p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{safeText(receipt.receiptNo)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        Receipt Date: {formatPostedAt(receipt.receiptDate)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                        Lines: {receipt.linesCount} • Qty: {receipt.totalReceivedQty}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={isPosted ? "outline" : "secondary"}>
                        {isPosted ? "POSTED" : "UNPOSTED"}
                    </Badge>
                    <Button type="button" size="sm" disabled={!canPost || posting} onClick={() => setOpen(true)}>
                        Post
                    </Button>
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
        </Card>
    );
}
