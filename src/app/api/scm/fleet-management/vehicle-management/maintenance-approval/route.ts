import { NextRequest, NextResponse } from "next/server";
import { decodeJwtPayload, COOKIE_NAME } from "@/lib/auth-utils";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

function getUserIdFromRequest(req: NextRequest): number | null {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    const rawId = payload?.user_id ?? payload?.id ?? payload?.sub;
    const num = Number(rawId);
    return isNaN(num) || num <= 0 ? null : num;
  } catch {
    return null;
  }
}

function directusHeaders(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { "Content-Type": "application/json", ...extra };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function GET(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    // Mode: users/options
    if (mode === "options") {
      const uRes = await fetch(
        `${DIRECTUS_URL}/items/user?limit=-1&fields=user_id,user_fname,user_mname,user_lname,user_email,user_position,role,isDeleted,is_deleted`,
        {
          cache: "no-store",
          headers: directusHeaders(),
        }
      ).catch(() => null);

      const rawUsers = uRes ? (await uRes.json().catch(() => ({})))?.data || [] : [];
      interface RawUserRecord {
        user_id: number;
        user_fname?: string;
        user_mname?: string;
        user_lname?: string;
        user_email?: string;
        user_position?: string;
        role?: string;
        isDeleted?: boolean | number | string;
        is_deleted?: boolean | number | string;
      }

      const users = (Array.isArray(rawUsers) ? (rawUsers as RawUserRecord[]) : [])
        .filter((u) => {
          const isDel1 = u.isDeleted === 1 || u.isDeleted === true || u.isDeleted === "1";
          const isDel2 = u.is_deleted === 1 || u.is_deleted === true || u.is_deleted === "1";
          return !isDel1 && !isDel2;
        })
        .map((u) => ({
          id: u.user_id,
          first_name: u.user_fname || "",
          last_name: u.user_lname || "",
          email: u.user_email || "",
          position: u.user_position || "",
          role: u.role || "",
        }));

      return json({ data: { users } });
    }

    // Default: fetch Requested Job Orders for approval
    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-id");
    params.set("fields", "*,vehicle_id.*,requested_by.*,approved_by.*,mechanic_id.*");
    params.set("filter[status][_eq]", "Requested");

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders?${params.toString()}`, {
      cache: "no-store",
      headers: directusHeaders(),
    });

    const body = await upstream.json().catch(() => ({ data: [] }));
    const jobOrders = body?.data || [];

    // Also get parts requested for these job orders
    const joPartsRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts?limit=-1&fields=*,part_id.*`, {
      cache: "no-store",
      headers: directusHeaders(),
    }).catch(() => null);

    const joParts = joPartsRes ? (await joPartsRes.json().catch(() => ({})))?.data || [] : [];

    const enriched = jobOrders.map((jo: { id: number }) => {
      const partsForJo = joParts
        .filter((jp: { job_order_id: number | { id: number } }) => {
          const jpJoId = typeof jp.job_order_id === "object" && jp.job_order_id !== null ? jp.job_order_id.id : jp.job_order_id;
          return Number(jpJoId) === Number(jo.id);
        })
        .map((jp: { id: number; part_id: unknown; quantity_requested: number; quantity_issued?: number; unit_cost?: number; remarks?: string }) => {
          const partObj =
            typeof jp.part_id === "object" && jp.part_id !== null
              ? (jp.part_id as { id: number; part_name?: string; part_code?: string; unit_cost?: number })
              : null;
          return {
            id: jp.id,
            part_id: partObj ? partObj.id : Number(jp.part_id),
            part_name: partObj?.part_name || "",
            part_code: partObj?.part_code || "",
            quantity_requested: Number(jp.quantity_requested) || 0,
            quantity_issued: Number(jp.quantity_issued) || 0,
            unit_cost: Number(jp.unit_cost || partObj?.unit_cost) || 0,
            remarks: jp.remarks || "",
          };
        });

      return {
        ...jo,
        parts: partsForJo,
      };
    });

    return json({ data: enriched });
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { action } = payload;
    const userId = getUserIdFromRequest(req);

    if (action === "approve_assign") {
      const { job_order_id, decision, mechanic_id, decision_remarks } = payload;

      if (!job_order_id || !decision) {
        return json({ error: "Missing required approval payload" }, 400);
      }

      const updateData: Record<string, unknown> = {
        status: decision,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        decision_remarks: decision_remarks || null,
      };

      if (decision === "Approved" && mechanic_id) {
        updateData.mechanic_id = Number(mechanic_id);
      }

      const res = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify(updateData),
      });

      const body = await res.json().catch(() => ({}));
      return json(body, res.status);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
