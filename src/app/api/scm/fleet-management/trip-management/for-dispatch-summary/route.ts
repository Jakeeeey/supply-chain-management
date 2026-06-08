import { NextResponse } from "next/server";
import { getEnrichedForDispatchSummary } from "@/modules/supply-chain-management/fleet-management/trip-management/for-dispatch-summary/services/for-dispatch-summary.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getEnrichedForDispatchSummary();
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: "Failed to load for-dispatch summary data",
        details: String(error?.message || error),
      },
      { status: 500 },
    );
  }
}
