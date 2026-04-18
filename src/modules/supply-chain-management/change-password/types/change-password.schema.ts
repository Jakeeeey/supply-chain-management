import { z } from "zod";

/**
 * Regex for strong password — mirrors server-side @Pattern validation:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character from: !@#$%^&*()_+-=[]{};':"\\|,.<>?`~
 * Character set is kept in sync with the Spring Boot @Pattern annotation.
 */
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?`~]{8,}$/;

export const ChangePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string()
        .min(15, "Password must be at least 15 characters long")
        .max(64, "Password must be no more than 64 characters long")
        .regex(passwordRegex, {
            message: "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
        }),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

export interface ChangePasswordResponse {
    success: boolean;
    message?: string;
    token?: string;
}
