import { NextRequest, NextResponse } from "next/server";
import { asNullableNumber, asNullableString, directusError, directusFetch, fieldsParam } from "../../_directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  reported: ["acknowledged", "cancelled"],
  acknowledged: ["responding", "cancelled"],
  responding: ["resolved", "cancelled"],
  resolved: [],
  cancelled: [],
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const nextStatus = typeof body.status === "string" ? body.status.trim() : "";

    if (!nextStatus) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const currentRes = await directusFetch(
      `/items/fleet_emergency_reports/${encodeURIComponent(id)}?fields=${fieldsParam(["id", "status"])}`
    );
    if (!currentRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch emergency report", details: await directusError(currentRes) },
        { status: currentRes.status }
      );
    }

    const currentData = await currentRes.json();
    const currentStatus = currentData.data?.status;
    const allowed = STATUS_TRANSITIONS[String(currentStatus)] || [];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        { error: `Cannot move emergency report from ${currentStatus || "unknown"} to ${nextStatus}` },
        { status: 400 }
      );
    }

    const resolutionNotes = asNullableString(body.resolution_notes);
    const cancelledReason = asNullableString(body.cancelled_reason);
    if (nextStatus === "resolved" && !resolutionNotes) {
      return NextResponse.json({ error: "resolution_notes is required when resolving a report" }, { status: 400 });
    }
    if (nextStatus === "cancelled" && !cancelledReason) {
      return NextResponse.json({ error: "cancelled_reason is required when cancelling a report" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const payload = {
      status: nextStatus,
      assigned_to: asNullableNumber(body.assigned_to),
      resolution_notes: resolutionNotes,
      cancelled_reason: cancelledReason,
      resolved_at: nextStatus === "resolved" ? now : null,
      updated_at: now,
    };

    const updateRes = await directusFetch(`/items/fleet_emergency_reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!updateRes.ok) {
      return NextResponse.json(
        { error: "Failed to update emergency report", details: await directusError(updateRes) },
        { status: updateRes.status }
      );
    }

    const updatedData = await updateRes.json();
    return NextResponse.json({ report: updatedData.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update emergency report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
