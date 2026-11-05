import { NextRequest, NextResponse } from "next/server";

import {
    type DirectusItemResponse,
    directusFetch,
    ensureDirectusConfigured,
} from "../../_lib/directus";
import type { PhysicalInventoryHeaderApiRow } from "../../_lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    const configError = ensureDirectusConfigured();
    if (configError) return configError;

    const { id } = await context.params;
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return NextResponse.json(
            { ok: false, message: "Invalid physical inventory id." },
            { status: 400 },
        );
    }

    const fields = [
        "id",
        "ph_no",
        "date_encoded",
        "cutOff_date",
        "starting_date",
        "price_type",
        "stock_type",
        "branch_id",
        "remarks",
        "isComitted",
        "isCancelled",
        "total_amount",
        "supplier_id",
        "category_id",
        "encoder_id",
    ].join(",");

    try {
        const response = await directusFetch<DirectusItemResponse<PhysicalInventoryHeaderApiRow>>(
            `/items/physical_inventory/${parsedId}?fields=${encodeURIComponent(fields)}`,
        );

        return NextResponse.json(response.data, { status: 200 });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch physical inventory header.";

        return NextResponse.json(
            { ok: false, message },
            { status: 500 },
        );
    }
}