import { NextRequest, NextResponse } from "next/server";

import {
    type DirectusItemResponse,
    directusFetch,
    ensureDirectusConfigured,
} from "../../_lib/directus";
import type { BranchApiRow } from "../../_lib/types";

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
            { ok: false, message: "Invalid branch id." },
            { status: 400 },
        );
    }

    const fields = [
        "id",
        "branch_name",
        "branch_code",
        "branch_description",
    ].join(",");

    try {
        const response = await directusFetch<DirectusItemResponse<BranchApiRow>>(
            `/items/branches/${parsedId}?fields=${encodeURIComponent(fields)}`,
        );

        return NextResponse.json(response.data, { status: 200 });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch branch.";

        return NextResponse.json(
            { ok: false, message },
            { status: 500 },
        );
    }
}