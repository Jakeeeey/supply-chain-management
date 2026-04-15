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
import type { Branch, User } from "../types";

interface BranchTableProps {
    branches: Branch[];
    users: User[];
    loading: boolean;
    onEdit: (branch: Branch) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

function BranchTableSkeleton() {
    return (
        <div className="rounded-xl border bg-card/30 backdrop-blur-md border-white/10 shadow-lg overflow-hidden animate-pulse">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10 bg-muted/40 font-bold uppercase tracking-widest text-[10px]">
                        <TableHead className="py-4 text-primary/90">Branch Detail</TableHead>
                        <TableHead className="py-4 text-foreground/70">Code</TableHead>
                        <TableHead className="py-4 text-foreground/70">Contact Person</TableHead>
                        <TableHead className="py-4 text-foreground/70">Contact Info</TableHead>
                        <TableHead className="py-4 text-foreground/70">Location</TableHead>
                        <TableHead className="py-4 text-foreground/70 text-right pr-6">Status</TableHead>
                        <TableHead className="py-4 text-foreground/70 text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i} className="border-white/5">
                            <TableCell className="py-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-36" />
                                    <Skeleton className="h-2.5 w-24" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-2.5 w-20" />
                                </div>
                            </TableCell>
                            <TableCell className="pr-6"><div className="flex justify-end gap-2"><Skeleton className="h-5 w-14" /><Skeleton className="h-5 w-14" /></div></TableCell>
                            <TableCell><div className="flex justify-center"><Skeleton className="h-8 w-8" /></div></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function BranchTable({
    branches,
    users,
    loading,
    onEdit,
    currentPage,
    totalPages,
    onPageChange
}: BranchTableProps) {
    const userMap = React.useMemo(() => {
        const map = new Map<number, User>();
        users.forEach((u) => map.set(u.user_id, u));
        return map;
    }, [users]);

    if (loading) {
        return <BranchTableSkeleton />;
    }

    if (branches.length === 0) {
        return <div className="p-8 text-center text-muted-foreground text-sm font-medium">No branches found.</div>;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border bg-card/30 backdrop-blur-md border-white/10 shadow-lg relative overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-white/10 bg-muted/40">
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-primary/90">Branch Detail</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70">Code</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70">Contact Person</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70">Contact Info</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70">Location</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70 text-right pr-6">Status</TableHead>
                            <TableHead className="py-4 font-bold text-[10px] uppercase tracking-widest text-foreground/70 text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {branches.map((branch) => {
                            const head = userMap.get(branch.branch_head);
                            const contactPerson = head ? `${head.user_fname} ${head.user_lname}` : "N/A";
                            const emailAddress = head ? head.user_email : null;
                            const phoneNumber = branch.phone_number;

                            return (
                                <TableRow key={branch.id} className="hover:bg-primary/[0.02] border-white/5 transition-colors group">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{branch.branch_name}</span>
                                            <span className="text-[10px] text-muted-foreground/60 font-medium truncate max-w-[200px]">
                                                {branch.branch_description || "No description"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="px-2 py-1 rounded bg-muted/50 text-[10px] font-mono font-bold text-foreground/80 border border-white/5">
                                            {branch.branch_code}
                                        </code>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-foreground/80">{contactPerson}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            {emailAddress && <span className="text-xs text-primary/70 font-medium">{emailAddress}</span>}
                                            {phoneNumber && <span className="text-[10px] text-muted-foreground/80">{phoneNumber}</span>}
                                            {!emailAddress && !phoneNumber && <span className="text-xs text-muted-foreground/40 italic">No contact info</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {(!branch.state_province || branch.state_province === "N/A") &&
                                            (!branch.city || branch.city === "N/A") &&
                                            (!branch.brgy || branch.brgy === "N/A") ? (
                                            <span className="text-muted-foreground/30 font-medium ml-2">-</span>
                                        ) : (
                                            <div className="flex flex-col text-xs">
                                                <span className="text-foreground/80 font-medium">
                                                    {[branch.state_province, branch.city]
                                                        .filter(val => val && val !== "N/A")
                                                        .join(", ") || "-"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground/60">
                                                    {branch.brgy && branch.brgy !== "N/A" ? branch.brgy : "-"}
                                                    {branch.postal_code ? ` (${branch.postal_code})` : ""}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex justify-end gap-2">
                                            {branch.isMoving ? (
                                                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                    Moving
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter bg-muted/30 text-muted-foreground/50 border-white/5">
                                                    Not Moving
                                                </Badge>
                                            )}
                                            {branch.isBadStock ? (
                                                <Badge variant="destructive" className="text-[9px] uppercase font-black tracking-tighter shadow-sm">
                                                    Badstock
                                                </Badge>
                                            ) : branch.isActive === 1 || branch.isActive === true ? (
                                                <Badge variant="default" className="text-[9px] uppercase font-black tracking-tighter !bg-emerald-600 !text-white hover:!bg-emerald-700 dark:!bg-emerald-500 shadow-sm shadow-emerald-500/20 border-none">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-tighter bg-muted/40 text-muted-foreground/40 border-white/5">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(branch)}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                    <p className="text-xs text-muted-foreground font-medium">
                        Showing page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="h-8 px-2 rounded-lg border-white/10 bg-card/50 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    // Show first, last, and pages around current
                                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, index, array) => {
                                    const showDots = index > 0 && page - array[index - 1] > 1;
                                    return (
                                        <React.Fragment key={page}>
                                            {showDots && <span className="text-muted-foreground px-1">...</span>}
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => onPageChange(page)}
                                                className={`h-8 w-8 rounded-lg transition-all ${currentPage === page
                                                    ? "shadow-sm shadow-primary/20"
                                                    : "border-white/10 bg-card/50 hover:bg-primary/10 hover:text-primary"
                                                    }`}
                                            >
                                                {page}
                                            </Button>
                                        </React.Fragment>
                                    );
                                })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="h-8 px-2 rounded-lg border-white/10 bg-card/50 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30"
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )
            }
        </div >
    );
}
