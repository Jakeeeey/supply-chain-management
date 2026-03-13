"use client";

import React, { useState } from "react";
import { Truck, MapPin, AlertCircle, ChevronRight, ChevronDown, CornerDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VPreDispatchPlanDetailedDto } from "../types";

interface Props {
    driver: string;
    customers: Record<string, VPreDispatchPlanDetailedDto[]>; // 🚀 Now receiving Customers Dict
}

export function DriverDispatchCard({ driver, customers }: Props) {
    const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

    const toggleCustomer = (customerName: string) => {
        setExpandedCustomers(prev => ({ ...prev, [customerName]: !prev[customerName] }));
    };

    const driverItems = Object.values(customers).flat();
    const driverTotalAmount = driverItems.reduce((sum, item) => sum + (item.dispatchAmount || 0), 0);
    const firstItem = driverItems[0] || {} as VPreDispatchPlanDetailedDto;

    return (
        <div className="bg-card border border-border/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            {/* DRIVER HEADER */}
            <div className="bg-muted/30 p-4 sm:p-6 border-b border-border/40 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-black uppercase tracking-tighter truncate">{driver}</h3>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                            <Badge variant="outline" className={`text-[8px] sm:text-[9px] uppercase font-black whitespace-nowrap ${
                                firstItem.dispatchStatus === 'DELIVERED'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                            }`}>
                                Status: {firstItem.dispatchStatus || "PENDING"}
                            </Badge>
                            <Badge variant="outline" className="text-[8px] sm:text-[9px] uppercase font-black bg-background text-muted-foreground whitespace-nowrap">
                                {firstItem.clusterName || "General Area"}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="text-left sm:text-right shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">Driver Total</p>
                    <p className="text-xl sm:text-2xl font-black italic text-foreground">
                        ₱{driverTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* CUSTOMERS TABLE */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-muted-foreground bg-muted/10">
                    <tr>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Outlet / Customer</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Location</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Orders</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">Customer Total</th>
                    </tr>
                    </thead>
                    {/* 🚀 Render a tbody for every Customer */}
                    {Object.entries(customers).map(([customerName, orders]) => {
                        const isExpanded = expandedCustomers[customerName];
                        const customerTotal = orders.reduce((s, o) => s + (o.dispatchAmount || 0), 0);
                        const customerLocationItem = orders[0];

                        return (
                            <tbody key={customerName} className="divide-y divide-border/20 border-b border-border/40 last:border-0">
                            {/* CUSTOMER MASTER ROW (Click to expand) */}
                            <tr
                                onClick={() => toggleCustomer(customerName)}
                                className={`cursor-pointer transition-colors group ${isExpanded ? 'bg-primary/5' : 'bg-muted/5 hover:bg-muted/10'}`}
                            >
                                <td className="px-4 sm:px-6 py-3 sm:py-4">
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-primary shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />}
                                        <div className={`font-black break-words min-w-[120px] ${isExpanded ? 'text-primary' : 'text-foreground'}`}>
                                            {customerName}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] sm:text-xs font-medium min-w-[100px]">
                                        <MapPin className="w-3.5 h-3.5 opacity-50 shrink-0" />
                                        <span className="line-clamp-2">{customerLocationItem.customerCity}, {customerLocationItem.customerProvince}</span>
                                    </div>
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                                    {orders.length} SO(s)
                                </td>
                                <td className={`px-4 sm:px-6 py-3 sm:py-4 text-right font-black italic whitespace-nowrap ${isExpanded ? 'text-primary' : 'text-foreground'}`}>
                                    ₱{customerTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>

                            {/* 🚀 COLLAPSIBLE SALES ORDERS (Child Rows) */}
                            {isExpanded && orders.map((order, idx) => (
                                <tr key={`${order.orderNo}-${idx}`} className="bg-background hover:bg-muted/5 transition-colors">
                                    <td className="px-4 sm:px-6 py-2 sm:py-3 pl-10 sm:pl-12">
                                        <div className="flex items-center gap-2">
                                            <CornerDownRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                                            <span className="font-mono text-[10px] sm:text-xs font-bold text-muted-foreground">
                                                    SO: {order.orderNo}
                                                </span>
                                        </div>
                                        {order.dispatchRemarks && (
                                            <div className="text-[9px] sm:text-[10px] text-orange-500/80 uppercase font-black flex items-center gap-1 mt-1 ml-6">
                                                <AlertCircle className="w-3 h-3 shrink-0" />
                                                <span className="line-clamp-2">{order.dispatchRemarks}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 sm:px-6 py-2 sm:py-3" colSpan={2}>
                                        {/* Blank space to indent properly under location/orders */}
                                    </td>
                                    <td className="px-4 sm:px-6 py-2 sm:py-3 text-right font-bold italic whitespace-nowrap text-muted-foreground text-xs">
                                        ₱{order.dispatchAmount ? order.dispatchAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        );
                    })}
                </table>
            </div>
        </div>
    );
}