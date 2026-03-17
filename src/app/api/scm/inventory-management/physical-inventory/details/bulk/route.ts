import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const DIRECTUS_TOKEN =
    process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_SERVICE_TOKEN || "";

type BulkDetailUpdateItem = {
    id: number;
    physical_count?: number | null;
    variance?: number | null;
    difference_cost?: number | null;
    amount?: number | null;
};

type DirectusItemResponse<T> = {
    data: T;
};

type PhysicalInventoryDetailRow = {
    id: number;
    ph_id: number;
    date_encoded: string | null;
    product_id: number;
    unit_price: number | null;
    system_count: number | null;
    physical_count: number | null;
    variance: number | null;
    difference_cost: number | null;
    amount: number | null;
    offset_match: number | null;
};

function directusHeaders(): HeadersInit {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (DIRECTUS_TOKEN) {
        headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    }

    return headers;
}

function normalizeNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUpdateItem(value: unknown): BulkDetailUpdateItem | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const raw = value as Record<string, unknown>;
    const id = Number(raw.id);

    if (!Number.isFinite(id) || id <= 0) {
        return null;
    }

    const normalized: BulkDetailUpdateItem = { id };

    if ("physical_count" in raw) {
        normalized.physical_count = normalizeNullableNumber(raw.physical_count);
    }
    if ("variance" in raw) {
        normalized.variance = normalizeNullableNumber(raw.variance);
    }
    if ("difference_cost" in raw) {
        normalized.difference_cost = normalizeNullableNumber(raw.difference_cost);
    }
    if ("amount" in raw) {
        normalized.amount = normalizeNullableNumber(raw.amount);
    }

    return normalized;
}

async function patchDetailRow(
    item: BulkDetailUpdateItem,
): Promise<PhysicalInventoryDetailRow> {
    const upstream = new URL(
        `/items/physical_inventory_details/${item.id}`,
        DIRECTUS_BASE_URL,
    );

    const payload: Record<string, number | null> = {};

    if ("physical_count" in item) {
        payload.physical_count = item.physical_count ?? 0;
    }
    if ("variance" in item) {
        payload.variance = item.variance ?? 0;
    }
    if ("difference_cost" in item) {
        payload.difference_cost = item.difference_cost ?? 0;
    }
    if ("amount" in item) {
        payload.amount = item.amount ?? 0;
    }

    const response = await fetch(upstream.toString(), {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    const text = await response.text().catch(() => "");

    if (!response.ok) {
        throw new Error(
            text || `Failed to update detail row ${item.id} with status ${response.status}.`,
        );
    }

    if (!text) {
        throw new Error(`Empty response while updating detail row ${item.id}.`);
    }

    const json = JSON.parse(text) as DirectusItemResponse<PhysicalInventoryDetailRow>;
    return json.data;
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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

        const rawUpdates = Array.isArray(body.updates) ? body.updates : [];
        const updates = rawUpdates
            .map(normalizeUpdateItem)
            .filter((item): item is BulkDetailUpdateItem => item !== null);

        if (!updates.length) {
            return NextResponse.json(
                { error: "At least one valid detail update is required." },
                { status: 400 },
            );
        }

        const updatedRows = await Promise.all(updates.map((item) => patchDetailRow(item)));

        return NextResponse.json({ data: updatedRows });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to bulk update PI details.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}