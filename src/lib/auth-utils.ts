/**
 * src/lib/auth-utils.ts
 * Centralized JWT utilities for VOS ERP.
 */

export const COOKIE_NAME = "vos_access_token";
export const COOKIE_MAX_AGE_CAP = 60 * 60 * 24 * 7; // 7 days cap

export interface JwtPayload {
    sub: string;
    email: string;
    FirstName?: string;
    MiddleName?: string;
    LastName?: string;
    role?: string;
    subsystems?: string[];
    iat?: number;
    exp?: number;
    [key: string]: unknown;
}

/**
 * Decodes a JWT payload without verifying the signature.
 * Safe for use in both Client and Server environments (if using Buffer or atob).
 * Note: Next.js middleware supports `Buffer`.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
    if (!token) return null;

    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const base64Url = parts[1];
        let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        
        // Pad for base64
        while (base64.length % 4) {
            base64 += "=";
        }

        const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
        return JSON.parse(jsonPayload) as JwtPayload;
    } catch (error) {
        console.error("[auth-utils] Error decoding JWT payload:", error);
        return null;
    }
}

/**
 * Utility to extract token from various backend response formats.
 */
export function pickTokenFromPayload(payload: Record<string, unknown> | string | null): string | null {
    if (!payload) return null;
    if (typeof payload === "string") return payload.trim() || null;
    
    const t = payload.token ?? payload.accessToken ?? payload.access_token ?? payload.jwt;
    return typeof t === "string" && t.trim() ? t.trim() : null;
}
