import React, { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PackageOpen, Store } from "lucide-react";
import { ForConsolidationOrder } from "../types";

interface QueueTableProps {
    orders: ForConsolidationOrder[];
    isLoading: boolean;
}

export function QueueTable({ orders, isLoading }: QueueTableProps) {
    // 1. Group orders by customerName
    const groupedOrders = useMemo(() => {
        const groups: Record<string, ForConsolidationOrder[]> = {};

        orders.forEach(order => {
            const customer = order.customerName || "Unknown Customer";
            if (!groups[customer]) {
                groups[customer] = [];
            }
            groups[customer].push(order);
        });

        // Convert to array and sort alphabetically by customer name
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [orders]);

    // 2. Queue time badge logic optimized for dark mode
    const getQueueTimeDetails = (timestamp: string) => {
        if (!timestamp) return { text: "N/A", variant: "secondary" as const, customClass: "" };

        const diffMins = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);

        if (diffMins > 240) {
            // Critical: Uses Shadcn's built-in destructive variant
            return { text: `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`, variant: "destructive" as const, customClass: "" };
        } else if (diffMins > 60) {
            // Warning: Custom amber styling that adapts to dark mode
            return {
                text: `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`,
                variant: "outline" as const,
                customClass: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10"
            };
        }
        // Normal: Uses standard secondary variant
        return { text: `${diffMins} mins`, variant: "secondary" as const, customClass: "" };
    };

    return (
        <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="font-semibold w-[30%]">Order No</TableHead>
                        <TableHead className="font-semibold w-[40%]">Time in Queue</TableHead>
                        <TableHead className="text-right font-semibold w-[30%]">Allocated Amount (₱)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        // Loading State
                        Array.from({ length: 5 }).map((_, idx) => (
                            <TableRow key={idx}>
                                <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : orders.length === 0 ? (
                        // Empty State
                        <TableRow>
                            <TableCell colSpan={3} className="h-40 text-center">
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <PackageOpen className="h-10 w-10 mb-3 opacity-30" />
                                    <p className="text-base font-medium">Queue is empty</p>
                                    <p className="text-sm opacity-70">No orders currently waiting for consolidation.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        // Grouped Data State
                        groupedOrders.map(([customerName, customerOrders]) => (
                            <React.Fragment key={customerName}>
                                {/* Customer Header Row */}
                                <TableRow className="bg-secondary/40 hover:bg-secondary/40 border-b-border/50">
                                    <TableCell colSpan={3} className="py-2.5">
                                        <div className="flex items-center text-secondary-foreground font-semibold">
                                            <Store className="h-4 w-4 mr-2 opacity-70" />
                                            {customerName}
                                            <Badge variant="outline" className="ml-3 font-normal text-xs bg-background/50">
                                                {customerOrders.length} {customerOrders.length === 1 ? 'order' : 'orders'}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                </TableRow>

                                {/* Individual Orders for this Customer */}
                                {customerOrders.map((order) => {
                                    const timeDetails = getQueueTimeDetails(order.forConsolidationAt);
                                    return (
                                        <TableRow key={order.orderId} className="hover:bg-muted/30 transition-colors border-border/50">
                                            <TableCell className="pl-8 font-medium text-primary">
                                                <div className="flex items-center before:content-[''] before:w-2 before:h-[1px] before:bg-border before:mr-2">
                                                    {order.orderNo}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={timeDetails.variant} className={`font-mono text-xs shadow-none ${timeDetails.customClass}`}>
                                                    {timeDetails.text}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-muted-foreground">
                                                {order.allocatedAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}