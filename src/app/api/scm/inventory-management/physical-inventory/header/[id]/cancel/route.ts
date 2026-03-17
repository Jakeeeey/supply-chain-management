// src/app/api/scm/physical-inventory/header/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN =
    process.env.DIRECTUS_STATIC_TOKEN || process.env.DIRECTUS_SERVICE_TOKEN || "";

const TABLE_PH = "physical_inventory";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

type PhysicalInventoryHeaderRow = {
    id: number;
    ph_no: string | null;
    cutOff_date: string | null;
    starting_date: string | null;
    price_type: number | null;
    stock_type: "GOOD" | "BAD" | null;
    branch_id: number | null;
    remarks: string | null;
    isComitted: number;
    isCancelled: number;
    total_amount: number | null;
    supplier_id: number | null;
    category_id: number | null;
    encoder_id: number | null;
};

function directusHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (DIRECTUS_TOKEN) {
        headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    }

    return headers;
}

async function directusGetSingle<T>(path: string): Promise<T> {
    if (!DIRECTUS_URL) {
        throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
    }

    const response = await fetch(`${DIRECTUS_URL}${path}`, {
        method: "GET",
        headers: directusHeaders(),
        cache: "no-store",
    });

    const text = await response.text().catch(() => "");
    if (!response.ok) {
        throw new Error(text || `Directus GET failed with ${response.status}.`);
    }

    const json = JSON.parse(text) as { data: T };
    return json.data;
}

async function directusPatch<T>(path: string, payload: unknown): Promise<T> {
    if (!DIRECTUS_URL) {
        throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
    }

    const response = await fetch(`${DIRECTUS_URL}${path}`, {
        method: "PATCH",
        headers: directusHeaders(),
        cache: "no-store",
        body: JSON.stringify(payload),
    });

    const text = await response.text().catch(() => "");
    if (!response.ok) {
        throw new Error(text || `Directus PATCH failed with ${response.status}.`);
    }

    const json = JSON.parse(text) as { data: T };
    return json.data;
}

export async function POST(_req: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const headerId = Number(id);

        if (!Number.isFinite(headerId) || headerId <= 0) {
            return NextResponse.json(
                { error: "Invalid header id." },
                { status: 400 },
            );
        }

        const header = await directusGetSingle<PhysicalInventoryHeaderRow>(
            `/items/${TABLE_PH}/${headerId}?fields=id,ph_no,cutOff_date,starting_date,price_type,stock_type,branch_id,remarks,isComitted,isCancelled,total_amount,supplier_id,category_id,encoder_id`,
        );

        if (!header) {
            return NextResponse.json(
                { error: "Physical Inventory not found." },
                { status: 404 },
            );
        }

        if (header.isCancelled === 1) {
            return NextResponse.json(
                { error: "Physical Inventory is already cancelled." },
                { status: 400 },
            );
        }

        if (header.isComitted === 1) {
            return NextResponse.json(
                { error: "Committed Physical Inventory cannot be cancelled." },
                { status: 400 },
            );
        }

        const updated = await directusPatch<PhysicalInventoryHeaderRow>(
            `/items/${TABLE_PH}/${headerId}`,
            {
                isCancelled: 1,
                isComitted: 0,
            },
        );

        return NextResponse.json({ data: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to cancel PI.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}