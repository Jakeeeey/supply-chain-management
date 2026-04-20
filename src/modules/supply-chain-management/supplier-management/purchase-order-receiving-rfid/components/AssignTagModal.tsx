"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useReceivingProducts, type UntaggedItem } from "../providers/ReceivingProductsProvider";
import { Tag, Package, MapPin, Loader2, X } from "lucide-react";

export function AssignTagModal() {
    const { pendingTag, tagAndReceive, dismissPendingTag, taggingInProgress } = useReceivingProducts();

    if (!pendingTag) return null;

    const handleAssign = async (item: UntaggedItem) => {
        await tagAndReceive(item.productId, item.branchId);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-lg mx-4 p-0 overflow-hidden shadow-2xl border-primary/20">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20">
                            <Tag className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold">New Tag Detected</div>
                            <div className="text-xs text-muted-foreground font-mono">
                                {pendingTag.rfid.slice(-8).toUpperCase()}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={dismissPendingTag} disabled={taggingInProgress}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        This RFID tag is not registered. Select the product to assign it to:
                    </p>

                    <div className="space-y-2 max-h-[320px] overflow-y-auto">
                        {pendingTag.items.map((item) => (
                            <button
                                key={`${item.productId}-${item.branchId}`}
                                className="w-full text-left rounded-lg border border-border p-3 hover:bg-accent/50 hover:border-primary/30 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleAssign(item)}
                                disabled={taggingInProgress}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.barcode}</div>
                                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                {item.branchName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                        Qty: {item.expectedQty}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                {taggingInProgress && (
                    <div className="flex items-center justify-center gap-2 px-5 py-3 border-t bg-muted/30">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Assigning tag...</span>
                    </div>
                )}
            </Card>
        </div>
    );
}
