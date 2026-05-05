"use client";

import React from "react";
import { SalesReturnSummary } from "./components/SalesReturnSummary";

export default function SalesReturnModule() {
    return (
        <div className="space-y-6 p-4 md:p-8 w-full bg-background min-h-screen animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-bold text-foreground tracking-tight">
                        Sales Return Summary
                    </h2>
                    <p className="text-muted-foreground">Overview of all product returns</p>
                </div>
            </div>

            <SalesReturnSummary />
        </div>
    );
}

export { SalesReturnSummary };
