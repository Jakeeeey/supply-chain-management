//src/app/api/scm/physical-inventory/header/[id]/route.ts
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

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    try {
        if (!DIRECTUS_BASE_URL) {
            return NextResponse.json(
                { error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
                { status: 500 },
            );
        }

        const { id } = await context.params;

        const bodyUnknown: unknown = await req.json();
        const body =
            bodyUnknown && typeof bodyUnknown === "object"
                ? (bodyUnknown as Record<string, unknown>)
                : {};

        const encoderId = decodeUserIdFromJwtCookie(req);

        const payload: Record<string, unknown> = {};

        if ("ph_no" in body) payload.ph_no = typeof body.ph_no === "string" ? body.ph_no.trim() : "";
        if ("cutOff_date" in body) payload.cutOff_date = typeof body.cutOff_date === "string" ? body.cutOff_date : null;
        if ("starting_date" in body) payload.starting_date = typeof body.starting_date === "string" ? body.starting_date : null;
        if ("price_type" in body) payload.price_type = Number.isFinite(Number(body.price_type)) ? Number(body.price_type) : null;
        if ("stock_type" in body) payload.stock_type = typeof body.stock_type === "string" ? body.stock_type.trim() : "";
        if ("branch_id" in body) payload.branch_id = Number.isFinite(Number(body.branch_id)) ? Number(body.branch_id) : null;
        if ("remarks" in body) payload.remarks = typeof body.remarks === "string" ? body.remarks : "";
        if ("supplier_id" in body) payload.supplier_id = Number.isFinite(Number(body.supplier_id)) ? Number(body.supplier_id) : null;
        if ("category_id" in body) payload.category_id = Number.isFinite(Number(body.category_id)) ? Number(body.category_id) : null;
        if ("isComitted" in body) payload.isComitted = Number(body.isComitted) === 1 ? 1 : 0;
        if ("isCancelled" in body) payload.isCancelled = Number(body.isCancelled) === 1 ? 1 : 0;
        if ("total_amount" in body) payload.total_amount = Number.isFinite(Number(body.total_amount)) ? Number(body.total_amount) : 0;

        if (encoderId) {
            payload.encoder_id = encoderId;
        }

        const upstream = new URL(`/items/physical_inventory/${id}`, DIRECTUS_BASE_URL);

        const response = await fetch(upstream.toString(), {
            method: "PATCH",
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
            error instanceof Error ? error.message : "Failed to update PI header.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}