"use client";

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DriverWithDetails, User } from "../types";

interface DriverTableProps {
    drivers: DriverWithDetails[];
    users: User[];
    loading: boolean;
    onEdit: (driver: DriverWithDetails) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

function DriverTableSkeleton() {
    return (
        <div className="rounded-xl border bg-card/30 backdrop-blur-md border-white/10 shadow-lg overflow-hidden animate-pulse">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10 bg-muted/40 font-bold uppercase tracking-widest text-[10px]">
                        <TableHead className="py-4 text-primary/90">No.</TableHead>
                        <TableHead className="py-4 text-foreground/70">Driver</TableHead>
                        <TableHead className="py-4 text-foreground/70">Good Branch</TableHead>
                        <TableHead className="py-4 text-foreground/70">Bad Branch</TableHead>
                        <TableHead className="py-4 text-foreground/70">Last Updated</TableHead>
                        <TableHead className="py-4 text-foreground/70 text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i} className="border-white/5">
                            <TableCell className="py-4"><Skeleton className="h-4 w-8" /></TableCell>
                            <TableCell className="py-4"><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell className="py-4"><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell className="py-4"><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell className="py-4"><div className="flex justify-center gap-2"><Skeleton className="h-8 w-8 rounded" /><Skeleton className="h-8 w-8 rounded" /></div></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function DriverTable({
    drivers,
    users,
    loading,
    onEdit,
    currentPage,
    totalPages,
    onPageChange
}: DriverTableProps) {
    const userMap = React.useMemo(() => {
        const map = new Map<number, User>();
        users.forEach((u) => map.set(u.user_id, u));
        return map;
    }, [users]);

    if (loading) {
        return <DriverTableSkeleton />;
    }

    if (drivers.length === 0) {
        return <div className="p-12 text-center text-muted-foreground text-sm font-medium">No drivers found.</div>;
    }

    const startIndex = (currentPage - 1) * 10 + 1;

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border bg-card/30 backdrop-blur-md border-white/10 shadow-lg relative overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/10 bg-muted/40">
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-primary/90 w-12">No.</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70">Driver</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70">Good Branch</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70">Bad Branch</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70 text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {drivers.map((driver) => {
                            const user = driver.user;
                            const driverName = user
                                ? `${user.user_fname} ${user.user_mname ? user.user_mname + " " : ""}${user.user_lname}`.trim()
                                : "N/A";
                            const goodBranchName = driver.good_branch?.branch_name || "N/A";
                            const badBranchName = driver.bad_branch?.branch_name || "N/A";

                            return (
                                <TableRow key={driver.id} className="hover:bg-primary/[0.02] border-white/5 transition-colors group">
                                    <TableCell className="py-4 font-bold text-sm text-foreground/80 w-12">
                                        {driver.user_id}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                {driverName}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="outline" className="text-[9px] w-fit bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                {goodBranchName}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            {badBranchName !== "N/A" ? (
                                                <Badge variant="outline" className="text-[9px] w-fit bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                                                    {badBranchName}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] w-fit bg-muted/30 text-muted-foreground/50 border-white/5">
                                                    None
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-center">
                                        <div className="flex justify-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(driver)}
                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground/70 font-medium">
                    Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-9 gap-1 rounded-lg"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-9 gap-1 rounded-lg"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
