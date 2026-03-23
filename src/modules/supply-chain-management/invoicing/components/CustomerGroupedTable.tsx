"use client";

import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CustomerGroup, SalesOrder } from "../types";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, FileText, User, Hash, Calendar, DollarSign, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SalesOrderModal } from "./SalesOrderModal";

interface CustomerGroupedTableProps {
    groups: CustomerGroup[];
    onUpdateRemarks?: (orderId: number, newRemarks: string) => void;
}

export const CustomerGroupedTable: React.FC<CustomerGroupedTableProps> = ({ groups, onUpdateRemarks }) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleGroup = (customerCode: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(customerCode)) {
            newExpanded.delete(customerCode);
        } else {
            newExpanded.add(customerCode);
        }
        setExpandedGroups(newExpanded);
    };

    const handleRowClick = (order: SalesOrder) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const handleRemarksUpdate = (orderId: number, remarks: string) => {
        if (selectedOrder && selectedOrder.order_id === orderId) {
            setSelectedOrder({ ...selectedOrder, remarks });
        }
        if (onUpdateRemarks) {
            onUpdateRemarks(orderId, remarks);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "—";
        try {
            return format(new Date(dateString), "MMM dd, yyyy");
        } catch {
            return dateString;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(amount);
    };

    return (
        <>
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-xl ring-1 ring-border/50">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead className="font-semibold text-foreground/80"><div className="flex items-center gap-2"><User size={14} className="text-primary" /> Customer</div></TableHead>
                            <TableHead className="font-semibold text-foreground/80"><div className="flex items-center gap-2"><Hash size={14} className="text-primary" /> Code</div></TableHead>
                            <TableHead className="text-center font-semibold text-foreground/80">Orders</TableHead>
                            <TableHead className="text-right font-semibold text-foreground/80">Total Group Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groups.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FileText size={48} className="opacity-10" />
                                        <span>No sales orders found for the selected criteria.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            groups.map((group) => (
                                <React.Fragment key={group.customer_code}>
                                    <TableRow 
                                        className={cn(
                                            "cursor-pointer transition-colors duration-200",
                                            expandedGroups.has(group.customer_code) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                                        )}
                                        onClick={() => toggleGroup(group.customer_code)}
                                    >
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all duration-300">
                                                {expandedGroups.has(group.customer_code) ? (
                                                    <ChevronDown size={20} className="text-primary animate-in fade-in zoom-in duration-300" />
                                                ) : (
                                                    <ChevronRight size={20} className="text-muted-foreground/60 transition-transform duration-300 group-hover:translate-x-1" />
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="font-black text-lg md:text-xl text-foreground/90 tracking-tight">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-1 bg-primary/20 rounded-full group-hover:bg-primary transition-colors duration-500" />
                                                {group.customer_name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs bg-muted/30 border-primary/20 text-primary">
                                                {group.customer_code}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-semibold">
                                                {group.order_count} {group.order_count === 1 ? "Order" : "Orders"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-black text-primary text-2xl tracking-tighter drop-shadow-sm">
                                                {formatCurrency(group.total_amount)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                    
                                    {expandedGroups.has(group.customer_code) && (
                                        <TableRow className="bg-muted/10 hover:bg-muted/10 border-b-0">
                                            <TableCell colSpan={5} className="p-0">
                                                <div className="p-4 bg-gradient-to-b from-muted/20 to-transparent border-x animate-in slide-in-from-top-2 duration-300 ease-out">
                                                    <div className="rounded-lg border bg-background overflow-hidden shadow-inner ring-1 ring-border/30">
                                                        <Table>
                                                              <TableHeader className="bg-muted/40 divide-y-0">
                                                                <TableRow className="hover:bg-transparent border-b-0">
                                                                    <TableHead className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                                                                        <div className="flex items-center gap-2"><Calendar size={12} /> Date</div>
                                                                    </TableHead>
                                                                    <TableHead className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                                                                        <div className="flex items-center gap-2"><Hash size={12} /> Order No.</div>
                                                                    </TableHead>
                                                                    <TableHead className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">
                                                                        <div className="flex items-center gap-2"><FileText size={12} /> PO No.</div>
                                                                    </TableHead>
                                                                    <TableHead className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Supplier</TableHead>
                                                                    <TableHead className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Salesman</TableHead>
                                                                    <TableHead className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Branch</TableHead>
                                                                    <TableHead className="text-right text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Total</TableHead>
                                                                    <TableHead className="text-right text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60">Allocated</TableHead>
                                                                </TableRow>
                                                              </TableHeader>
                                                            <TableBody>
                                                                {group.orders.map((order) => (
                                                                    <TableRow 
                                                                        key={order.order_id || order.order_no} 
                                                                        className="hover:bg-primary/10 border-b last:border-0 transition-colors cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRowClick(order);
                                                                        }}
                                                                    >
                                                                        <TableCell className="text-xs py-3"><div className="flex items-center gap-1.5"><Calendar size={12} className="text-muted-foreground" /> {formatDate(order.order_date)}</div></TableCell>
                                                                        <TableCell className="text-xs font-bold text-primary py-3">{order.order_no}</TableCell>
                                                                        <TableCell className="text-xs py-3">{order.po_no || "—"}</TableCell>
                                                                        <TableCell className="text-xs py-3 font-medium text-foreground/80">{order.supplier_id?.supplier_shortcut || "—"}</TableCell>
                                                                        <TableCell className="text-xs py-3">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-semibold text-foreground/90">{order.salesman_id?.salesman_name || "—"}</span>
                                                                                <span className="text-[10px] text-muted-foreground font-mono">{order.salesman_id?.salesman_code}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-xs py-3"><div className="flex items-center gap-1.5"><MapPin size={12} className="text-muted-foreground" /> {order.branch_id?.branch_name || "—"}</div></TableCell>
                                                                        <TableCell className="text-right text-xs font-bold py-3 text-foreground/90">{formatCurrency(order.total_amount || 0)}</TableCell>
                                                                        <TableCell className="text-right text-xs py-3">
                                                                            <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 font-bold">
                                                                                {formatCurrency(order.allocated_amount || 0)}
                                                                            </Badge>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <SalesOrderModal 
                order={selectedOrder}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpdateRemarks={handleRemarksUpdate}
            />
        </>
    );
};
