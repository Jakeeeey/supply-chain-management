"use client";

import * as React from "react";
import { PostingOfPoProvider } from "./providers/PostingOfPoProvider";
import { PostingPOList } from "./components/PostingPOList";
import { PostingPODetail } from "./components/PostingPODetail";

export default function PostingOfProductsModule() {
    return (
        <PostingOfPoProvider>
            <div className="w-full min-w-0 space-y-4">
                <div className="space-y-1">
                    <div className="text-2xl font-black">Purchase Order Post Inventory</div>
                    <div className="text-sm text-muted-foreground">
                        Post receipts after Receiving. This confirms receiving is finalized.
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr] min-w-0 items-start">
                    <PostingPOList />
                    <PostingPODetail />
                </div>
            </div>
        </PostingOfPoProvider>
    );
}
