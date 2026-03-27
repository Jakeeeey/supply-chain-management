"use client";

import React, { useEffect, useState } from "react";
import { InvoicingFilters, SalesOrder, CustomerGroup } from "./types";
import { InvoicingService } from "./services/InvoicingService";
import { InvoicingFiltersComponent } from "./components/InvoicingFilters";
import { CustomerGroupedTable } from "./components/CustomerGroupedTable";
import { toast } from "sonner";
import { Loader2, FileText, ChevronRight, Users, TrendingUp, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { format } from "date-fns";

const InvoicingModule: React.FC = () => {
    const [groupedOrders, setGroupedOrders] = useState<CustomerGroup[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState<InvoicingFilters>({
        orderNo: "",
        poNo: "",
        customer: "",
        salesman: "",
        supplier: "",
        branch: "",
    });

    const groupOrdersByCustomer = (orders: SalesOrder[]): CustomerGroup[] => {
        const groups: Record<string, CustomerGroup> = {};
        
        orders.forEach(order => {
            const code = order.customer_code 
                ? (typeof order.customer_code === 'object' ? order.customer_code.customer_code : order.customer_code)
                : "UNKNOWN";
            
            const name = order.customer_code && typeof order.customer_code === 'object' 
                ? order.customer_code.customer_name 
                : "Unknown Customer";

            if (!groups[code]) {
                groups[code] = {
                    customer_code: code,
                    customer_name: name,
                    orders: [],
                    total_amount: 0,
                    order_count: 0
                };
            }
            groups[code].orders.push(order);
            groups[code].total_amount += (order.total_amount || 0);
            groups[code].order_count += 1;
        });

        return Object.values(groups).sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    };

    const fetchSalesOrders = async (currentFilters: InvoicingFilters) => {
        setIsLoading(true);
        try {
            const data = await InvoicingService.getSalesOrders(currentFilters);
            setGroupedOrders(groupOrdersByCustomer(data));
        } catch (error) {
            console.error("Error fetching sales orders:", error);
            toast.error("Failed to fetch sales orders for invoicing.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSalesOrders(filters);
    }, []);

    const handleFilterChange = (newFilters: InvoicingFilters) => {
        setFilters(newFilters);
        fetchSalesOrders(newFilters);
    };

    return (
        <div className="space-y-8 p-6 max-w-[1600px] mx-auto min-h-screen bg-transparent">
            <div className="flex flex-col gap-6">
                {/* REMOVED BREADCRUMBS */}
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-inner group transition-all duration-500 hover:scale-105">
                                <FileText className="text-primary h-8 w-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground/90 uppercase italic">
                                    Invoicing
                                </h1>
                                <div className="h-1 w-16 bg-primary rounded-full mt-0.5 bg-gradient-to-r from-primary to-primary/20" />
                            </div>
                        </div>
                    
                    <div className="flex flex-wrap md:flex-nowrap gap-4 w-full lg:w-auto">
                        <Card className="flex-1 md:flex-none p-0 overflow-hidden rounded-3xl border-border/50 bg-card/40 backdrop-blur-md shadow-lg ring-1 ring-border/50 min-w-[200px] group transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
                            <CardContent className="p-6 relative">
                                <Users className="absolute top-2 right-2 h-16 w-16 text-primary/5 -rotate-12 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110" />
                                <div className="space-y-1 relative z-10">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5 focus:text-primary transition-colors">
                                        <div className="h-1 w-1 rounded-full bg-primary/40" /> Customers
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-foreground/90 tracking-tighter">{groupedOrders.length}</span>
                                        <Badge variant="outline" className="text-[9px] font-bold bg-green-500/5 text-green-600 border-green-500/20 translate-y-[-10px]">ACTIVE</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="flex-1 md:flex-none p-0 overflow-hidden rounded-3xl border-primary/20 bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/30 flex flex-col ring-2 ring-primary-foreground/20 min-w-[260px] group transition-all duration-500 hover:scale-[1.02] hover:shadow-primary/40">
                            <CardContent className="p-6 relative">
                                <CircleDollarSign className="absolute top-2 right-2 h-20 w-20 text-white/10 -rotate-12 transition-transform duration-700 group-hover:rotate-0" />
                                <div className="space-y-1 relative z-10">
                                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary-foreground/60 flex items-center gap-1.5">
                                        <TrendingUp size={10} /> Total Value
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-4xl font-black text-primary-foreground tracking-tighter">
                                            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
                                                groupedOrders.reduce((acc, curr) => acc + curr.total_amount, 0)
                                            )}
                                        </span>
                                        <span className="text-[9px] font-bold text-primary-foreground/60 tracking-widest uppercase mt-1">Total Group Recievable</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <div className="relative group p-0.5 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 shadow-2xl transition-all duration-500 hover:shadow-primary/5">
                <div className="bg-background/80 backdrop-blur-2xl rounded-[calc(1.5rem-2px)] border p-1 shadow-inner">
                    <InvoicingFiltersComponent onFilterChange={handleFilterChange} />
                </div>
            </div>

            <div className="relative min-h-[500px]">
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[4px] rounded-3xl border border-white/10 transition-all duration-500">
                        <div className="bg-card/90 backdrop-blur-2xl p-8 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border flex flex-col items-center gap-6 animate-in zoom-in-95 fade-in duration-300">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                                <Loader2 className="h-14 w-14 animate-spin text-primary relative z-10" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-black text-xl tracking-tight text-foreground/80">Synchronizing Data</span>
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">Please wait...</span>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className={cn("transition-all duration-500", isLoading ? "opacity-20 scale-[0.99] blur-sm" : "opacity-100 scale-100 blur-0")}>
                    <CustomerGroupedTable groups={groupedOrders} />
                </div>
            </div>
        </div>
    );
};

export default InvoicingModule;

