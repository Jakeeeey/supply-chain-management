"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IdCard, MapPin, Phone, ShieldAlert, UserRound } from "lucide-react";
import type { Branch, DriverWithDetails, User } from "../types";

interface DriverDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    driver: DriverWithDetails | null;
    driverContactFieldsSupported: boolean;
}

function fullName(user?: User) {
    if (!user) return "Not provided";
    return [user.user_fname, user.user_mname, user.user_lname]
        .map((part) => (part || "").trim())
        .filter(Boolean)
        .join(" ") || "Not provided";
}

function displayValue(value: string | number | null | undefined): React.ReactNode {
    if (value === null || value === undefined) return "Not provided";
    if (typeof value === "number") return value;
    return value.trim() || "Not provided";
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="min-w-0 space-y-1">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</dt>
            <dd className="min-h-5 break-words text-sm font-medium text-foreground">{value}</dd>
        </div>
    );
}

function DetailSection({
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
            <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {icon}
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80">{title}</h3>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
        </section>
    );
}

function BranchBadge({ branch, fallback }: { branch?: Branch; fallback: string }) {
    if (!branch) {
        return (
            <Badge variant="outline" className="bg-muted/30 text-muted-foreground/60">
                {fallback}
            </Badge>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/20">
                {branch.branch_name}
            </Badge>
            <span className="text-xs text-muted-foreground">
                {[branch.brgy, branch.city, branch.state_province].filter(Boolean).join(", ") || "No address provided"}
            </span>
        </div>
    );
}

export function DriverDetailsModal({
    isOpen,
    onClose,
    driver,
    driverContactFieldsSupported,
}: DriverDetailsModalProps) {
    const user = driver?.user;
    const driverName = fullName(user);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col rounded-2xl border-white/10 overflow-hidden">
                <DialogHeader className="p-6 pb-4 shrink-0 border-b">
                    <div className="flex items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <IdCard className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="truncate text-2xl font-bold">{driverName}</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">
                                Driver details and assigned branches.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {driver ? (
                    <div className="flex-1 overflow-y-auto min-h-0 space-y-5 p-6">
                        <DetailSection icon={<UserRound className="size-4" />} title="Driver Information">
                            <DetailItem label="Driver ID" value={driver.id} />
                            <DetailItem label="User ID" value={driver.user_id} />
                            <DetailItem label="Full Name" value={driverName} />
                            <DetailItem label="Position" value={displayValue(user?.user_position)} />
                            <DetailItem label="Email" value={displayValue(user?.user_email)} />
                            <DetailItem label="User Contact" value={displayValue(user?.user_contact)} />
                        </DetailSection>

                        <DetailSection icon={<MapPin className="size-4" />} title="Branch Assignment">
                            <DetailItem label="Good Branch" value={<BranchBadge branch={driver.good_branch} fallback="Not provided" />} />
                            <DetailItem label="Bad Branch" value={<BranchBadge branch={driver.bad_branch} fallback="None" />} />
                        </DetailSection>

                        {driverContactFieldsSupported && (
                            <>
                                <DetailSection icon={<Phone className="size-4" />} title="Contact Information">
                                    <DetailItem label="Phone" value={displayValue(driver.contact_phone)} />
                                    <DetailItem label="Email" value={displayValue(driver.contact_email)} />
                                    <DetailItem label="Address" value={displayValue(driver.contact_address)} />
                                </DetailSection>

                                <DetailSection icon={<ShieldAlert className="size-4" />} title="Emergency Contact">
                                    <DetailItem label="Contact Name" value={displayValue(driver.emergency_contact_name)} />
                                    <DetailItem label="Relationship" value={displayValue(driver.emergency_contact_relationship)} />
                                    <DetailItem label="Phone" value={displayValue(driver.emergency_contact_phone)} />
                                    <DetailItem label="Address" value={displayValue(driver.emergency_contact_address)} />
                                </DetailSection>
                            </>
                        )}

                        <Separator />

                        <dl className="grid gap-4 sm:grid-cols-2">
                            <DetailItem label="Created At" value={displayValue(driver.created_at)} />
                            <DetailItem label="Updated At" value={displayValue(driver.updated_at)} />
                        </dl>
                    </div>
                ) : null}

                <DialogFooter className="shrink-0 border-t p-6">
                    <Button type="button" onClick={onClose} className="rounded-xl font-bold h-11 px-6">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
