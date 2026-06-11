import { NextResponse } from "next/server";
import { getEnrichedForArrivalSummary } from "@/modules/supply-chain-management/fleet-management/trip-management/for-arrival-summary/services/for-arrival-summary.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getEnrichedForArrivalSummary();
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: "Failed to load for-arrival summary data",
        details: String(error?.message || error),
      },
      { status: 500 },
    );
  }
}
