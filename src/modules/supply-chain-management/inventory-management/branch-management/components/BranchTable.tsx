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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Branch, User } from "../types";

interface BranchTableProps {
    branches: Branch[];
    users: User[];
    loading: boolean;
}

function BranchTableSkeleton() {
    return (
        <div className="rounded-xl border bg-card/30 backdrop-blur-md border-white/10 shadow-lg relative overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10 bg-muted/40 font-bold uppercase tracking-widest text-[10px]">
                        <TableHead className="py-4 text-primary/90">Branch Detail</TableHead>
                        <TableHead className="py-4 text-foreground/70">Code</TableHead>
                        <TableHead className="py-4 text-foreground/70">Contact Person</TableHead>
                        <TableHead className="py-4 text-foreground/70">Contact Info</TableHead>
                        <TableHead className="py-4 text-foreground/70">Location</TableHead>
                        <TableHead className="py-4 text-foreground/70 text-right pr-6">Status</TableHead>
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
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function BranchTable({ branches, users, loading }: BranchTableProps) {
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
                                        ) : (
                                            <Badge variant="default" className="text-[9px] uppercase font-black tracking-tighter !bg-emerald-600 !text-white hover:!bg-emerald-700 dark:!bg-emerald-500 shadow-sm shadow-emerald-500/20 border-none">
                                                Active
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
