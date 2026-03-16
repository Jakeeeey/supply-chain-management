import { NextRequest, NextResponse } from "next/server";

import {
    type DirectusItemsResponse,
    directusFetch,
    ensureDirectusConfigured,
} from "../_lib/directus";
import type { ProductApiRow } from "../_lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveIntegerList(value: string | null): number[] {
    if (!value) return [];

    return value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((item) => Number.isInteger(item) && item > 0);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const configError = ensureDirectusConfigured();
    if (configError) return configError;

    const incomingUrl = new URL(req.url);
    const ids = parsePositiveIntegerList(incomingUrl.searchParams.get("ids"));

    if (ids.length === 0) {
        return NextResponse.json([], { status: 200 });
    }

    const fields = [
        "product_id",
        "isActive",
        "parent_id",
        "product_name",
        "short_description",
        "product_code",
        "unit_of_measurement_count",
    ].join(",");

    const directusPath =
        `/items/products` +
        `?fields=${encodeURIComponent(fields)}` +
        `&filter[product_id][_in]=${encodeURIComponent(ids.join(","))}` +
        `&sort=product_name` +
        `&limit=-1`;

    try {
        const response = await directusFetch<DirectusItemsResponse<ProductApiRow>>(directusPath);

        return NextResponse.json(response.data ?? [], { status: 200 });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch products.";

        return NextResponse.json(
            { ok: false, message },
            { status: 500 },
        );
    }
}