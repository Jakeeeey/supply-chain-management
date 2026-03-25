"use client";

import React, { useState } from "react";
import {
    CheckCircle2,
    XCircle,
    Eye,
    Truck,
    User as UserIcon,
    Clock,
    MapPin,
    Receipt,
    Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Mock Data based on your SQL schema
const MOCK_APPROVAL_DATA = [
    {
        id: 1,
        doc_no: "DP-2023-001",
        driver_name: "John Doe",
        vehicle_plate: "NPL-1234",
        starting_point: "Main Warehouse",
        total_distance: 150.5,
        status: "For Approval",
        amount: 5500.00,
        etd: "2023-10-25 08:00",
        staff: [{ name: "Jane Smith", role: "Helper" }],
        budget: [
            { item: "Fuel", amount: 3000 },
            { item: "Toll", amount: 500 }
        ],
        stops_count: 5 // Sum of invoices + purchases + others
    }
];

export function DispatchApprovalModule() {
    const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Pending Approvals</h2>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                    {MOCK_APPROVAL_DATA.length} Plans Awaiting Action
                </Badge>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Doc No</TableHead>
                            <TableHead>Driver & Vehicle</TableHead>
                            <TableHead>Route Info</TableHead>
                            <TableHead>Total Budget</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {MOCK_APPROVAL_DATA.map((plan) => (
                            <TableRow key={plan.id}>
                                <TableCell className="font-medium text-blue-600">{plan.doc_no}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold">{plan.driver_name}</span>
                                        <span className="text-xs text-muted-foreground">{plan.vehicle_plate}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-xs">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" /> {plan.starting_point}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {plan.etd}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="font-mono">₱{plan.amount.toLocaleString()}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                        {plan.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedPlan(plan)}
                                    >
                                        <Eye className="mr-2 h-4 w-4" /> Review
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Detail Review Drawer */}
            <Sheet open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Review Dispatch Plan</SheetTitle>
                        <SheetDescription>
                            Verify details for {selectedPlan?.doc_no} before approving for dispatch.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                        {/* Fleet & Staff Section */}
                        <section className="space-y-3">
                            <h4 className="flex items-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                <Truck className="mr-2 h-4 w-4" /> Fleet & Personnel
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Driver</p>
                                    <p className="text-sm font-medium">{selectedPlan?.driver_name}</p>
                                </div>
                                <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Vehicle</p>
                                    <p className="text-sm font-medium">{selectedPlan?.vehicle_plate}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border p-3">
                                <p className="flex items-center text-xs text-muted-foreground mb-2">
                                    <Users className="mr-1 h-3 w-3" /> Assigned Helpers
                                </p>
                                {selectedPlan?.staff.map((s: any, i: number) => (
                                    <div key={i} className="text-sm py-1 border-t first:border-t-0">
                                        {s.name} <Badge variant="outline" className="ml-2 text-[10px]">{s.role}</Badge>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Budgeting Section (post_dispatch_budgeting) */}
                        <section className="space-y-3">
                            <h4 className="flex items-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                <Receipt className="mr-2 h-4 w-4" /> Budget Allocation
                            </h4>
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableBody>
                                            {selectedPlan?.budget.map((b: any, i: number) => (
                                                <TableRow key={i}>
                                                    <TableCell className="text-sm">{b.item}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm">
                                                        ₱{b.amount.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-muted/50 font-bold">
                                                <TableCell>Total Requested</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    ₱{selectedPlan?.amount.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Stops/Invoices Section */}
                        <section className="space-y-3">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                Route Statistics
                            </h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-50 p-2 rounded border">
                                    <p className="text-xl font-bold">{selectedPlan?.stops_count}</p>
                                    <p className="text-[10px] uppercase text-muted-foreground">Total Stops</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border">
                                    <p className="text-xl font-bold">{selectedPlan?.total_distance}km</p>
                                    <p className="text-[10px] uppercase text-muted-foreground">Est. Dist</p>
                                </div>
                                <div className="bg-slate-50 p-2 rounded border">
                                    <p className="text-xl font-bold">2</p>
                                    <p className="text-[10px] uppercase text-muted-foreground">Invoices</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    <Separator className="my-6" />

                    <SheetFooter className="flex-col gap-2 sm:flex-col">
                        <Button className="w-full bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Dispatch Plan
                        </Button>
                        <Button variant="destructive" className="w-full">
                            <XCircle className="mr-2 h-4 w-4" /> Reject Plan
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}