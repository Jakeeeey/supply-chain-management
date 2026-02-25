"use client";

import * as React from "react";
import { PostingOfPoProvider } from "./providers/PostingOfPoProvider";
import { PostingPOList } from "./components/PostingPOList";
import { PostingPODetail } from "./components/PostingPODetail";

export default function PostingOfProductsModule() {
    return (
        <PostingOfPoProvider>
            <div className="w-full px-6 py-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Posting of Purchase Order
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Post receipts after Receiving. This confirms receiving is finalized.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
                    <PostingPOList />
                    <PostingPODetail />
                </div>
            </div>
        </PostingOfPoProvider>
    );
}
