"use client";

import * as React from "react";
import type {
    BranchRow,
    CategoryRow,
    PhysicalInventoryHeaderRow,
    PriceTypeRow,
    SupplierRow,
} from "../types";
import { derivePhysicalInventoryStatus } from "../utils/compute";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, Search } from "lucide-react";

import { PhysicalInventoryStatusBadge } from "./PhysicalInventoryStatusBadge";

type Props = {
    rows: PhysicalInventoryHeaderRow[];
    branches: BranchRow[];
    suppliers: SupplierRow[];
    categories: CategoryRow[];
    priceTypes: PriceTypeRow[];
    isLoading?: boolean;
    onCreateNew: () => void;
    onOpen: (row: PhysicalInventoryHeaderRow) => void;
};

function resolveBranchName(branches: BranchRow[], branchId: number | null): string {
    if (!branchId) return "—";
    return branches.find((row) => row.id === branchId)?.branch_name ?? "—";
}

function resolveSupplierName(suppliers: SupplierRow[], supplierId: number | null): string {
    if (!supplierId) return "—";
    return suppliers.find((row) => row.id === supplierId)?.supplier_name ?? "—";
}

function resolveCategoryName(categories: CategoryRow[], categoryId: number | null): string {
    if (!categoryId) return "—";
    return categories.find((row) => row.category_id === categoryId)?.category_name ?? "—";
}

function resolvePriceTypeName(priceTypes: PriceTypeRow[], priceTypeId: number | null): string {
    if (!priceTypeId) return "—";
    return (
        priceTypes.find((row) => row.price_type_id === priceTypeId)?.price_type_name ?? "—"
    );
}

function fmtMoney(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

type RowView = {
    row: PhysicalInventoryHeaderRow;
    branch_name: string;
    supplier_name: string;
    category_name: string;
    price_type_name: string;
    status: ReturnType<typeof derivePhysicalInventoryStatus>;
};

export function PhysicalInventoryList(props: Props) {
    const {
        rows,
        branches,
        suppliers,
        categories,
        priceTypes,
        isLoading = false,
        onCreateNew,
        onOpen,
    } = props;

    const [query, setQuery] = React.useState("");

    const viewRows = React.useMemo<RowView[]>(() => {
        return rows.map((row) => ({
            row,
            branch_name: resolveBranchName(branches, row.branch_id),
            supplier_name: resolveSupplierName(suppliers, row.supplier_id),
            category_name: resolveCategoryName(categories, row.category_id),
            price_type_name: resolvePriceTypeName(priceTypes, row.price_type),
            status: derivePhysicalInventoryStatus({
                isCancelled: row.isCancelled,
                isComitted: row.isComitted,
            }),
        }));
    }, [branches, categories, priceTypes, rows, suppliers]);

    const filteredRows = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return viewRows;

        return viewRows.filter((item) => {
            const haystack = [
                item.row.ph_no ?? "",
                item.branch_name,
                item.supplier_name,
                item.category_name,
                item.price_type_name,
                item.status,
                item.row.cutOff_date ?? "",
                item.row.starting_date ?? "",
            ]
                .join(" ")
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [query, viewRows]);

    return (
        <Card className="rounded-2xl border shadow-sm">
            <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search PH no, branch, supplier, category..."
                            className="pl-9"
                        />
                    </div>

                    <Button className="cursor-pointer" onClick={onCreateNew}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Physical Inventory
                    </Button>
                </div>

                <ScrollArea className="w-full">
                    <div className="min-w-[1180px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>PH No</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price Type</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>Cut Off Date</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date Encoded</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                                            Loading Physical Inventory records...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRows.length ? (
                                    filteredRows.map((item) => (
                                        <TableRow key={item.row.id}>
                                            <TableCell className="font-medium">
                                                {item.row.ph_no ?? `Draft #${item.row.id}`}
                                            </TableCell>
                                            <TableCell>{item.branch_name}</TableCell>
                                            <TableCell>{item.supplier_name}</TableCell>
                                            <TableCell>{item.category_name}</TableCell>
                                            <TableCell>{item.price_type_name}</TableCell>
                                            <TableCell>{item.row.starting_date ?? "—"}</TableCell>
                                            <TableCell>{item.row.cutOff_date ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                ₱ {fmtMoney(item.row.total_amount)}
                                            </TableCell>
                                            <TableCell>
                                                <PhysicalInventoryStatusBadge status={item.status} />
                                            </TableCell>
                                            <TableCell>{item.row.date_encoded ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    className="cursor-pointer"
                                                    onClick={() => onOpen(item.row)}
                                                >
                                                    Open
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                                            No Physical Inventory records found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
}