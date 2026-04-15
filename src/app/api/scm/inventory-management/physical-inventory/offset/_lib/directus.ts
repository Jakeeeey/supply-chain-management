import { NextResponse } from "next/server";

export const DIRECTUS_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN ?? "";

export type DirectusItemResponse<T> = {
    data: T;
};

export type DirectusItemsResponse<T> = {
    data: T[];
};

export function directusHeaders(): HeadersInit {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (DIRECTUS_TOKEN) {
        headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    }

    return headers;
}

export function ensureDirectusConfigured(): NextResponse | null {
    if (!DIRECTUS_BASE_URL) {
        return NextResponse.json(
            {
                ok: false,
                message: "NEXT_PUBLIC_API_BASE_URL is not configured.",
            },
            { status: 500 },
        );
    }

    return null;
}

export async function directusFetch<T>(path: string): Promise<T> {
    const response = await fetch(`${DIRECTUS_BASE_URL}${path}`, {
        method: "GET",
        headers: directusHeaders(),
        cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(text || `Directus request failed with status ${response.status}`);
    }

    return JSON.parse(text) as T;
}