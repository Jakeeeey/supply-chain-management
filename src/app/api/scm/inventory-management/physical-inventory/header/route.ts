//src/app/api/scm/physical-inventory/header/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN ?? "";

function directusHeaders(): HeadersInit {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (DIRECTUS_TOKEN) {
        headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    }

    return headers;
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
            payloadUnknown && typeof payloadUnknown === "object" && "sub" in payloadUnknown
                ? (payloadUnknown as { sub?: unknown }).sub
                : undefined;

        const userId = Number(sub);
        return Number.isFinite(userId) ? userId : null;
    } catch {
        return null;
    }
}

function normalizeString(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        if (!DIRECTUS_BASE_URL) {
            return NextResponse.json(
                { error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
                { status: 500 },
            );
        }

        const bodyUnknown: unknown = await req.json();
        const body =
            bodyUnknown && typeof bodyUnknown === "object"
                ? (bodyUnknown as Record<string, unknown>)
                : {};

        const encoderId = decodeUserIdFromJwtCookie(req);
        if (!encoderId) {
            return NextResponse.json(
                { error: "Unable to resolve encoder_id from auth token." },
                { status: 401 },
            );
        }

        const payload = {
            ph_no: normalizeString(body.ph_no).trim(),
            cutOff_date:
                typeof body.cutOff_date === "string" ? body.cutOff_date : null,
            starting_date:
                typeof body.starting_date === "string" ? body.starting_date : null,
            price_type: normalizeNullableNumber(body.price_type),
            stock_type: normalizeString(body.stock_type).trim(),
            branch_id: normalizeNullableNumber(body.branch_id),
            remarks: normalizeString(body.remarks, ""),
            supplier_id: normalizeNullableNumber(body.supplier_id),
            category_id: normalizeNullableNumber(body.category_id),
            encoder_id: encoderId,
            isComitted: Number(body.isComitted) === 1 ? 1 : 0,
            isCancelled: Number(body.isCancelled) === 1 ? 1 : 0,
            committed_at: typeof body.committed_at === "string" ? body.committed_at : null,
            cancelled_at: typeof body.cancelled_at === "string" ? body.cancelled_at : null,
            total_amount: Number.isFinite(Number(body.total_amount))
                ? Number(body.total_amount)
                : 0,
        };

        const upstream = new URL("/items/physical_inventory", DIRECTUS_BASE_URL);

        const response = await fetch(upstream.toString(), {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        const text = await response.text();
        return new NextResponse(text, {
            status: response.status,
            headers: {
                "Content-Type":
                    response.headers.get("content-type") ?? "application/json",
            },
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to create PI header.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}