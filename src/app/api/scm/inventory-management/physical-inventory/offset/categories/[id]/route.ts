import { NextRequest, NextResponse } from "next/server";

import {
    type DirectusItemsResponse,
    directusFetch,
    ensureDirectusConfigured,
} from "../../_lib/directus";
import type { CategoryApiRow } from "../../_lib/types";

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
            { ok: false, message: "Invalid category id." },
            { status: 400 },
        );
    }

    const fields = [
        "category_id",
        "category_name",
    ].join(",");

    const directusPath =
        `/items/categories` +
        `?fields=${encodeURIComponent(fields)}` +
        `&filter[category_id][_eq]=${parsedId}` +
        `&limit=1`;

    try {
        const response = await directusFetch<DirectusItemsResponse<CategoryApiRow>>(directusPath);
        const category = response.data[0] ?? null;

        if (!category) {
            return NextResponse.json(
                { ok: false, message: "Category not found." },
                { status: 404 },
            );
        }

        return NextResponse.json(category, { status: 200 });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch category.";

        return NextResponse.json(
            { ok: false, message },
            { status: 500 },
        );
    }
}