// src/app/api/scm/physical-inventory/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { PhysicalInventoryHeaderRow } from "../../../../modules/supply-chain-management/physical-inventory-management/types";


type DirectusSingleResponse<T> = {
    data: T;
};

function getDirectusBaseUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
    }
    return baseUrl.replace(/\/$/, "");
}

function getDirectusToken(): string {
    return (
        process.env.DIRECTUS_STATIC_TOKEN ??
        process.env.DIRECTUS_SERVICE_TOKEN ??
        ""
    );
}

function buildHeaders(initHeaders?: HeadersInit): Headers {
    const headers = new Headers(initHeaders);
    headers.set("Content-Type", "application/json");

    const token = getDirectusToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
}

async function directusFetch<T>(
    path: string,
    init?: RequestInit,
): Promise<T> {
    const url = `${getDirectusBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

    const response = await fetch(url, {
        ...init,
        headers: buildHeaders(init?.headers),
        cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            text || `Directus request failed with status ${response.status}.`,
        );
    }

    if (!text) {
        throw new Error("Empty response from Directus.");
    }

    const parsedUnknown: unknown = JSON.parse(text);

    if (
        parsedUnknown &&
        typeof parsedUnknown === "object" &&
        "data" in parsedUnknown
    ) {
        return (parsedUnknown as DirectusSingleResponse<T>).data;
    }

    return parsedUnknown as T;
}

function decodeUserIdFromJwtCookie(
    req: NextRequest,
    cookieName = "vos_access_token",
): number | null {
    const token = req.cookies.get(cookieName)?.value;
    if (!token) return null;

    const parts = token.split(".");
    if (parts.length < 2) return null;

    try {
        const payloadPart = parts[1];
        const pad = "=".repeat((4 - (payloadPart.length % 4)) % 4);
        const b64 = (payloadPart + pad).replace(/-/g, "+").replace(/_/g, "/");
        const jsonStr = Buffer.from(b64, "base64").toString("utf8");

        const payloadUnknown: unknown = JSON.parse(jsonStr);
        const sub =
            payloadUnknown &&
            typeof payloadUnknown === "object" &&
            "sub" in payloadUnknown
                ? (payloadUnknown as { sub?: unknown }).sub
                : undefined;

        const userId = Number(sub);
        return Number.isFinite(userId) ? userId : null;
    } catch {
        return null;
    }
}

type CreatePhysicalInventoryBody = Omit<
    PhysicalInventoryHeaderRow,
    "id" | "date_encoded" | "encoder_id"
>;

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = (await req.json()) as CreatePhysicalInventoryBody;

        const encoderId = decodeUserIdFromJwtCookie(req);
        if (encoderId === null) {
            return NextResponse.json(
                { message: "Unable to resolve encoder_id from login session." },
                { status: 401 },
            );
        }

        const created = await directusFetch<PhysicalInventoryHeaderRow>(
            "/items/physical_inventory",
            {
                method: "POST",
                body: JSON.stringify({
                    ...body,
                    encoder_id: encoderId,
                }),
            },
        );

        return NextResponse.json(created);
    } catch (error) {
        return NextResponse.json(
            {
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to create physical inventory.",
            },
            { status: 500 },
        );
    }
}