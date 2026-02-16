"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { usePostingOfPo } from "../../providers/PostingOfPoProvider";

export function ProductsReceivingStatusCard() {
    const { selectedPO } = usePostingOfPo();

    const allocs = Array.isArray(selectedPO?.allocations) ? selectedPO!.allocations : [];

    return (
        <Card className="p-4 min-w-0">
            <div className="text-sm font-semibold">Products Receiving Status</div>
            <div className="text-xs text-muted-foreground">Breakdown by branch</div>

            <div className="mt-3 rounded-lg border border-dashed">
                <ScrollArea className="h-72">
                    <div className="p-3 space-y-3">
                        {allocs.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                No receiving lines found.
                            </div>
                        ) : (
                            allocs.map((a) => (
                                <div key={a.branch.id} className="rounded-lg border p-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="text-sm font-medium">{a.branch.name}</div>
                                        <Badge variant="outline">{a.items.length} items</Badge>
                                    </div>

                                    <div className="space-y-2">
                                        {a.items.map((it) => {
                                            const expected = Number(it.expectedQty || 0);
                                            const received = Number(it.receivedQty || 0);
                                            const ok = expected > 0 ? received >= expected : received > 0;

                                            return (
                                                <div key={it.id} className="flex items-start justify-between gap-3 text-xs">
                                                    <div className="min-w-0">
                                                        <div className="truncate font-medium">{it.name}</div>
                                                        <div className="truncate text-muted-foreground">{it.barcode}</div>
                                                    </div>
                                                    <div className="shrink-0 flex items-center gap-2">
                                                        <Badge variant={ok ? "outline" : "secondary"}>
                                                            {received} / {expected}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </Card>
    );
}
