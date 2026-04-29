"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useChangePassword } from "../hooks/useChangePassword";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const ChangePasswordForm = () => {
    const { form, isSubmitting, handleSubmit } = useChangePassword();
    const { register, formState: { errors } } = form;

    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="flex items-center justify-center py-10">
            <Card className="w-full max-w-md border shadow-xl bg-background">
                <CardHeader className="flex flex-col items-center pb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-4">
                        <Lock className="h-6 w-6 text-foreground/80" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">Change Password</h2>
                    <p className="text-sm text-muted-foreground text-center">
                        Update your password to keep your account secure
                    </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Current Password */}
                        <div className="space-y-2">
                            <Label htmlFor="oldPassword">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="oldPassword"
                                    type={showOld ? "text" : "password"}
                                    placeholder="Enter current password"
                                    className={cn(
                                        "pr-10 bg-muted/30 border-none h-11",
                                        errors.oldPassword && "ring-2 ring-destructive"
                                    )}
                                    {...register("oldPassword")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOld(!showOld)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.oldPassword && (
                                <p className="text-xs font-medium text-destructive">{errors.oldPassword.message}</p>
                            )}
                        </div>

                        {/* New Password */}
                        <div className="space-y-3">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showNew ? "text" : "password"}
                                    placeholder="Enter new password"
                                    className={cn(
                                        "pr-10 bg-muted/30 border-none h-11",
                                        errors.newPassword && "ring-2 ring-destructive"
                                    )}
                                    {...register("newPassword")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Password Requirements Checklist */}
                            <div className="bg-muted/20 p-3 rounded-lg space-y-2 border border-border/50">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password Requirements</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { label: "At least 15 characters", met: (form.watch("newPassword")?.length || 0) >= 15 },
                                        { label: "One uppercase letter", met: /[A-Z]/.test(form.watch("newPassword") || "") },
                                        { label: "One lowercase letter", met: /[a-z]/.test(form.watch("newPassword") || "") },
                                        { label: "One digit (0-9)", met: /\d/.test(form.watch("newPassword") || "") },
                                        { label: "One special character (!@#$%^&*()_+-=[]{};':\"\\|,.<>?`~)", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?`~]/.test(form.watch("newPassword") || "") },
                                    ].map((req, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className={cn(
                                                "h-1.5 w-1.5 rounded-full transition-all duration-300",
                                                req.met ? "bg-green-500 scale-125" : "bg-muted-foreground/30"
                                            )} />
                                            <span className={cn(
                                                "text-[11px] transition-colors duration-300",
                                                req.met ? "text-green-600 font-medium" : "text-muted-foreground"
                                            )}>
                                                {req.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {errors.newPassword && (
                                <p className="text-xs font-medium text-destructive">{errors.newPassword.message}</p>
                            )}
                        </div>

                        {/* Confirm New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Re-enter new password"
                                    className={cn(
                                        "pr-10 bg-muted/30 border-none h-11",
                                        errors.confirmPassword && "ring-2 ring-destructive"
                                    )}
                                    {...register("confirmPassword")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-[#030712] hover:bg-[#030712]/90 text-white font-medium h-12 mt-4 transition-all"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Updating..." : "Change Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
