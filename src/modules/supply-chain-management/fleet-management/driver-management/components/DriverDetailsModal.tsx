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
import { IdCard, MapPin, Phone, ShieldAlert, UserRound, FileCheck2, ExternalLink } from "lucide-react";
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

                        <DetailSection icon={<FileCheck2 className="size-4" />} title="Driver's License & Document Records">
                            <DetailItem label="License Number" value={displayValue(driver.license_no)} />
                            <DetailItem label="Classification" value={displayValue(driver.license_classification)} />
                            <DetailItem label="Restrictions / Conditions" value={displayValue(driver.license_restrictions)} />
                            <DetailItem
                                label="Expiry Date"
                                value={
                                    driver.license_expiry_date ? (
                                        <div className="flex items-center gap-2">
                                            <span>{driver.license_expiry_date.split("T")[0]}</span>
                                            {(() => {
                                                const exp = new Date(driver.license_expiry_date);
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                                if (diffDays < 0) {
                                                    return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-bold">Expired</Badge>;
                                                }
                                                if (diffDays <= 60) {
                                                    return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Expiring Soon</Badge>;
                                                }
                                                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]">Valid</Badge>;
                                            })()}
                                        </div>
                                    ) : (
                                        "Not provided"
                                    )
                                }
                            />
                            <DetailItem
                                label="Document Management Record"
                                value={
                                    driver.license_file_record ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-foreground">{driver.license_file_record.record_name}</span>
                                            <span className="text-xs text-muted-foreground">{driver.license_file_record.description || "ID document"}</span>
                                            {driver.license_file_record.file_ref && (
                                                <a
                                                    href={`${(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "")}/assets/${driver.license_file_record.file_ref}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline mt-1"
                                                >
                                                    View Scanned Document <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    ) : driver.license_file_record_id ? (
                                        `Linked Record ID #${driver.license_file_record_id}`
                                    ) : (
                                        "No document attached"
                                    )
                                }
                            />
                            <DetailItem
                                label="Fleet Admin Verification"
                                value={
                                    driver.license_verified_at ? (
                                        <div className="flex flex-col gap-0.5">
                                            <Badge variant="outline" className="w-fit bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[9px]">
                                                Verified
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {driver.verified_by_user ? `${driver.verified_by_user.user_fname} ${driver.verified_by_user.user_lname}` : "Admin"} on {new Date(driver.license_verified_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ) : (
                                        <Badge variant="outline" className="w-fit bg-muted/40 text-muted-foreground text-[9px]">
                                            Pending Verification
                                        </Badge>
                                    )
                                }
                            />
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
