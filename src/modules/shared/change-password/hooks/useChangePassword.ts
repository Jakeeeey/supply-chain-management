import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChangePasswordInput, ChangePasswordSchema } from "../types/change-password.schema";
import { useState } from "react";
import { toast } from "sonner";

export const useChangePassword = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ChangePasswordInput>({
        resolver: zodResolver(ChangePasswordSchema),
        defaultValues: {
            oldPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const submitPasswordChange = async (data: ChangePasswordInput): Promise<boolean> => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/shared/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success("Success", {
                    description: "Your password has been changed successfully.",
                });
                form.reset();
                return true;
            } else {
                toast.error("Update Failed", {
                    description: result.message || "Current password is incorrect. Please try again.",
                });
                return false;
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Error", {
                description: "A network error occurred. Please try again.",
            });
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        form,
        isSubmitting,
        submitPasswordChange,
    };
};
