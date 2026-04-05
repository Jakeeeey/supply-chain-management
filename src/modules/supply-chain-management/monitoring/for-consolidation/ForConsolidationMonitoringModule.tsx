"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw, Search, AlertCircle } from "lucide-react";
import { ForConsolidationOrder } from "./types";
import { fetchForConsolidationQueue } from "./providers/fetchProviders";
import { MetricsCards } from "./components/MetricsCards";
import { QueueTable } from "./components/QueueTable";

export default function ForConsolidationMonitoringModule() {
    const [orders, setOrders] = useState<ForConsolidationOrder[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const loadData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setErrorMsg(null);

        try {
            const data = await fetchForConsolidationQueue();
            setOrders(data);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Network error communicating with the server.";
            setErrorMsg(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(false);
        const interval = setInterval(() => loadData(true), 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    const filteredOrders = orders.filter(order =>
        order.orderNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto">

            {/* 1. Page Header (Clean, no floating inputs) */}
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold tracking-tight">For Consolidation Queue</h2>
                <p className="text-muted-foreground">Monitor real-time warehouse assignments and allocated values.</p>
            </div>

            {/* 2. Global Error Display */}
            {errorMsg && (
                <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-lg flex items-center border border-destructive/20">
                    <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="font-medium">{errorMsg}</span>
                </div>
            )}

            {/* 3. Metrics Overview */}
            <MetricsCards orders={orders} />

            {/* 4. Grouped Data Section (Toolbar + Table) */}
            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4">
                    <div>
                        <CardTitle className="text-lg">Queue Details</CardTitle>
                        <CardDescription>View and search pending orders.</CardDescription>
                    </div>

                    {/* Action Toolbar grouped with the table */}
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search order no. or customer..."
                                className="pl-9 bg-muted/40"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            onClick={() => loadData(false)}
                            disabled={isLoading}
                            variant="outline"
                            size="icon"
                            className="flex-shrink-0"
                            title="Refresh Queue"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <QueueTable orders={filteredOrders} isLoading={isLoading} />
                </CardContent>
            </Card>

        </div>
    );
}