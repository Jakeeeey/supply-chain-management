import { ChangePasswordRequest } from "../types/change-password.schema";
import { cookies } from "next/headers";

const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;
const VOS_COOKIE_NAME = "vos_access_token";
const SPRING_COOKIE_NAME = "springboot_token";

/**
 * Utility to decode JWT without a library
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeJwt(token: string): Record<string, any> | null {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, "base64")
                .toString()
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export class ChangePasswordService {
    /**
     * Authenticate with Spring Boot to get a token
     */
    private static async login(email: string, password: string): Promise<string | null> {
        try {
            const response = await fetch(`${SPRING_API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email,
                    hashPassword: password, // The backend expects 'hashPassword' for the login attempt
                }),
            });

            if (!response.ok) return null;

            const data = await response.json();
            return data.token || null;
        } catch (error) {
            console.error("Spring Boot login failed:", error);
            return null;
        }
    }

    /**
     * Change password for the logged-in user
     */
    static async changePassword(data: ChangePasswordRequest): Promise<{ success: boolean; message: string }> {
        const cookieStore = await cookies();

        // 1. Get user details from vos_access_token
        const vosToken = cookieStore.get(VOS_COOKIE_NAME)?.value;
        if (!vosToken) {
            return { success: false, message: "User not authenticated in VOS" };
        }

        const payload = decodeJwt(vosToken);
        const userId = payload?.sub;
        const email = payload?.email; // Extract email from VOS token

        if (!userId || !email) {
            return { success: false, message: "Invalid user session" };
        }

        // 2. Get Spring Boot token or login if needed
        let springToken = cookieStore.get(SPRING_COOKIE_NAME)?.value;

        const performRequest = async (token: string) => {
            return fetch(`${SPRING_API_BASE_URL}/users/${userId}`, {
                method: "POST", // User specified POST operation
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    oldPassword: data.oldPassword,
                    newPassword: data.newPassword
                }),
            });
        };

        let response: Response;

        if (!springToken) {
            springToken = await this.login(email, data.oldPassword) ?? undefined;
            if (!springToken) return { success: false, message: "Current password is incorrect. Please try again." };

            // Store new token in cookies
            cookieStore.set(SPRING_COOKIE_NAME, springToken, { path: "/", httpOnly: true });
        }

        response = await performRequest(springToken);

        // 3. Retry if unauthorized (token might be expired)
        if (response.status !== 200) {
            console.log("Spring token likely expired or invalid, retrying login...");
            springToken = await this.login(email, data.oldPassword) ?? undefined;
            if (springToken) {
                cookieStore.set(SPRING_COOKIE_NAME, springToken, { path: "/", httpOnly: true });
                response = await performRequest(springToken);
            } else {
                return {
                    success: false,
                    message: "Current password is incorrect. Please try again."
                };
            }
        }

        if (response.ok) {
            return { success: true, message: "Password updated successfully" };
        }

        return {
            success: false,
            message: "Current password is incorrect. Please try again."
        };
    }
}
