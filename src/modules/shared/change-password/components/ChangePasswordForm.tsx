"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useChangePassword } from "../hooks/useChangePassword";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const ChangePasswordForm = ({ onSuccess }: { onSuccess?: () => void }) => {
    const { form, isSubmitting, submitPasswordChange } = useChangePassword();
    const { register, formState: { errors } } = form;

    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const onSubmit = form.handleSubmit(async (data) => {
        const success = await submitPasswordChange(data);
        if (success) {
            onSuccess?.(); // Notify parent on success
        }
    });

    return (
        <div className="w-full">
            <div className="flex flex-col items-center pb-2 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 mb-4 shadow-inner">
                    <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Change Password</h2>
                <p className="text-sm text-muted-foreground text-center">
                    Update your password to keep your account secure
                </p>
            </div>
            
            <form onSubmit={onSubmit} className="space-y-5">
                {/* Current Password */}
                <div className="space-y-2">
                    <Label htmlFor="oldPassword">Current Password</Label>
                    <div className="relative">
                        <Input
                            id="oldPassword"
                            type={showOld ? "text" : "password"}
                            placeholder="Enter current password"
                            className={cn(
                                "pr-10 bg-muted/10 dark:bg-muted/20 border-border dark:border-zinc-700 h-11 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors",
                                errors.oldPassword && "ring-2 ring-destructive border-destructive"
                            )}
                            {...register("oldPassword")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowOld(!showOld)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer"
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
                                "pr-10 bg-muted/10 dark:bg-muted/20 border-border dark:border-zinc-700 h-11 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors",
                                errors.newPassword && "ring-2 ring-destructive border-destructive"
                            )}
                            {...register("newPassword")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer"
                        >
                            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Password Requirements Checklist */}
                    <div className="bg-muted/20 p-3 rounded-lg space-y-2 border border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password Requirements</p>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { label: "At least 8 characters", met: (form.watch("newPassword")?.length || 0) >= 8 },
                                { label: "One uppercase letter", met: /[A-Z]/.test(form.watch("newPassword") || "") },
                                { label: "One lowercase letter", met: /[a-z]/.test(form.watch("newPassword") || "") },
                                { label: "One digit (0-9)", met: /\d/.test(form.watch("newPassword") || "") },
                                { label: "One special character (e.g. !@#$%)", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?`~]/.test(form.watch("newPassword") || "") },
                            ].map((req, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={cn(
                                        "h-1.5 w-1.5 rounded-full transition-all duration-300",
                                        req.met ? "bg-green-500 dark:bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)] scale-125" : "bg-muted-foreground/50"
                                    )} />
                                    <span className={cn(
                                        "text-[11px] transition-colors duration-300",
                                        req.met ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
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
                                "pr-10 bg-muted/10 dark:bg-muted/20 border-border dark:border-zinc-700 h-11 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors",
                                errors.confirmPassword && "ring-2 ring-destructive border-destructive"
                            )}
                            {...register("confirmPassword")}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer"
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
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md transition-all h-11 cursor-pointer"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Updating..." : "Change Password"}
                </Button>
            </form>
        </div>
    );
};
