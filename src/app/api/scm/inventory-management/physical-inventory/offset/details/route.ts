import { NextRequest, NextResponse } from "next/server";

import {
    type DirectusItemsResponse,
    directusFetch,
    ensureDirectusConfigured,
} from "../_lib/directus";
import type { PhysicalInventoryDetailApiRow } from "../_lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
    const configError = ensureDirectusConfigured();
    if (configError) return configError;

    const incomingUrl = new URL(req.url);
    const phIdParam = incomingUrl.searchParams.get("ph_id");
    const parsedPhId = Number(phIdParam);

    if (!Number.isInteger(parsedPhId) || parsedPhId <= 0) {
        return NextResponse.json(
            { ok: false, message: "A valid ph_id is required." },
            { status: 400 },
        );
    }

    const fields = [
        "id",
        "ph_id",
        "date_encoded",
        "product_id",
        "unit_price",
        "system_count",
        "physical_count",
        "variance",
        "difference_cost",
        "amount",
        "offset_match",
    ].join(",");

    const directusPath =
        `/items/physical_inventory_details` +
        `?fields=${encodeURIComponent(fields)}` +
        `&filter[ph_id][_eq]=${parsedPhId}` +
        `&sort=id` +
        `&limit=-1`;

    try {
        const response =
            await directusFetch<DirectusItemsResponse<PhysicalInventoryDetailApiRow>>(directusPath);

        return NextResponse.json(response.data ?? [], { status: 200 });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch physical inventory details.";

        return NextResponse.json(
            { ok: false, message },
            { status: 500 },
        );
    }
}