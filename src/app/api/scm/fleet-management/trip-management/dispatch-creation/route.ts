import { handleApiError } from "@/lib/error-handler";
import { dispatchCreationQueryService } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/services/query";
import { DispatchCreationFormSchema } from "@/modules/supply-chain-management/fleet-management/trip-management/dispatch-creation/types/schema";
import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/+$/,
  "",
);
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Generates a human-readable dispatch number: DP-YYYYMMDD-HHMM
 */
function generateDispatchNo() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.getHours().toString().padStart(2, "0") + 
                 now.getMinutes().toString().padStart(2, "0");
  const randomStr = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `DP-${dateStr}-${timeStr}${randomStr}`;
}

/**
 * Prepares the staff payloads for a dispatch plan.
 */
function prepareStaffPayload(planId: number, driverId: number, helpers: { user_id: number }[]) {
  return [
    {
      post_dispatch_plan_id: planId,
      user_id: driverId,
      role: "Driver",
      is_present: false,
    },
    ...(helpers ?? []).map((h) => ({
      post_dispatch_plan_id: planId,
      user_id: h.user_id,
      role: "Helper",
      is_present: false,
    })),
  ];
}

/**
 * Performs a batch POST request to a Directus collection.
 */
async function batchCreate(collection: string, payloads: any[]) {
  if (!payloads.length) return;
  const res = await fetch(`${DIRECTUS_BASE}/items/${collection}`, {
    method: "POST",
    headers: directusHeaders(),
    body: JSON.stringify(payloads),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(`Batch create failed for ${collection}: ${JSON.stringify(errorBody.errors || errorBody)}`);
  }
}

// ─── Handlers ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "master") {
      const data = await dispatchCreationQueryService.fetchMasterData();
      return NextResponse.json({ data });
    }

    if (type === "approved_plans") {
      const branchId = searchParams.get("branch_id");
      const currentPlanId = searchParams.get("current_plan_id");
      const result =
        await dispatchCreationQueryService.fetchApprovedPreDispatchPlans(
          branchId ? Number(branchId) : undefined,
          currentPlanId ? Number(currentPlanId) : undefined,
        );
      return NextResponse.json(result);
    }

    if (type === "plan_details") {
      const planId = searchParams.get("plan_id");
      const tripId = searchParams.get("trip_id");
      if (!planId) {
        return NextResponse.json(
          { error: "plan_id is required" },
          { status: 400 },
        );
      }
      const result = await dispatchCreationQueryService.fetchPlanDetails(
        Number(planId),
        tripId ? Number(tripId) : undefined
      );
      return NextResponse.json(result);
    }

    if (type === "budget_summary") {
      const data = await dispatchCreationQueryService.fetchAllBudgets();
      return NextResponse.json({ data });
    }

    if (type === "plan_budgets") {
      const planId = searchParams.get("plan_id");
      if (!planId) {
        return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
      }
      const data = await dispatchCreationQueryService.fetchPlanBudgets(Number(planId));
      return NextResponse.json({ data });
    }

    if (type === "post_plan_details") {
      const planId = searchParams.get("plan_id");
      if (!planId) {
        return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
      }
      const data = await dispatchCreationQueryService.fetchPostDispatchPlanDetails(Number(planId));
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("[Dispatch GET Error]:", error);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Zod Validation
    const parsed = DispatchCreationFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 2. Insert into post_dispatch_plan (Header)
    const planPayload = {
      doc_no: generateDispatchNo(),
      dispatch_id: data.pre_dispatch_plan_id,
      driver_id: data.driver_id,
      vehicle_id: data.vehicle_id,
      starting_point: data.starting_point,
      status: "For Approval",
      amount: data.amount,
      encoder_id: data.driver_id, 
      estimated_time_of_dispatch: new Date(data.estimated_time_of_dispatch).toISOString(),
      estimated_time_of_arrival: new Date(data.estimated_time_of_arrival).toISOString(),
      remarks: data.remarks,
    };

    const planRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(planPayload),
    });

    if (!planRes.ok) {
      const errorBody = await planRes.json().catch(() => ({}));
      throw new Error(`Failed to create dispatch plan header: ${JSON.stringify(errorBody.errors || errorBody)}`);
    }
    const planDoc = await planRes.json();
    const newPlanId = planDoc.data.id;

    // 3. Prepare Sub-Payloads
    const staffPayloads = prepareStaffPayload(newPlanId, data.driver_id, data.helpers ?? []);
    
    const junctionPayload = {
      post_dispatch_plan_id: newPlanId,
      dispatch_plan_id: data.pre_dispatch_plan_id,
      linked_at: new Date().toISOString(),
      linked_by: data.driver_id,
    };

    const budgetPayloads = (data.budgets ?? []).map((b: any) => ({
      post_dispatch_plan_id: newPlanId,
      coa_id: b.coa_id,
      amount: b.amount,
      remarks: b.remarks,
    }));

    const invoiceIds = await dispatchCreationQueryService.fetchPdpInvoiceIds(data.pre_dispatch_plan_id);
    const invoicePayloads = invoiceIds.map((id, index) => ({
      post_dispatch_plan_id: newPlanId,
      invoice_id: id,
      sequence: index + 1,
      status: "Not Fulfilled",
    }));

    // 4. Batch Inserts for better performance and atomicity
    await Promise.all([
      batchCreate("post_dispatch_plan_staff", staffPayloads),
      batchCreate("post_dispatch_dispatch_plans", [junctionPayload]),
      batchCreate("post_dispatch_budgeting", budgetPayloads),
      batchCreate("post_dispatch_invoices", invoicePayloads),
      // Update source status
      fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${data.pre_dispatch_plan_id}`, {
        method: "PATCH", headers: directusHeaders(), body: JSON.stringify({ status: "Dispatched" }),
      }).then(r => r.ok ? r : Promise.reject("Failed to update source PDP status")),
    ]);

    return NextResponse.json({ success: true, id: newPlanId });
  } catch (error) {
    console.error("[Dispatch POST Error]:", error);
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("plan_id");
    const action = searchParams.get("action");
    const body = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
    }

    if (action === "update_trip") {
      const { 
        pre_dispatch_plan_id: newPdpId, 
        driver_id, 
        vehicle_id, 
        starting_point, 
        estimated_time_of_dispatch, 
        estimated_time_of_arrival, 
        remarks, 
        amount, 
        helpers, 
        invoices 
      } = body;

      // 1. Resolve PDP Swapping
      const junctionFetchRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans?filter[post_dispatch_plan_id][_eq]=${planId}`, { headers: directusHeaders() });
      const junctionData = await junctionFetchRes.json();
      const junctionRecord = junctionData.data?.[0];
      const oldPdpId = junctionRecord?.dispatch_plan_id;

      const pdpSwapTasks = [];
      if (newPdpId && oldPdpId && newPdpId !== oldPdpId) {
        pdpSwapTasks.push(
          fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${oldPdpId}`, { method: "PATCH", headers: directusHeaders(), body: JSON.stringify({ status: "Picked" }) }),
          fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${newPdpId}`, { method: "PATCH", headers: directusHeaders(), body: JSON.stringify({ status: "Dispatched" }) }),
          fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans/${junctionRecord.id}`, { 
            method: "PATCH", headers: directusHeaders(), body: JSON.stringify({ dispatch_plan_id: newPdpId, linked_by: driver_id }) 
          })
        );
      } else if (newPdpId && !oldPdpId) {
        pdpSwapTasks.push(
          fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${newPdpId}`, { method: "PATCH", headers: directusHeaders(), body: JSON.stringify({ status: "Dispatched" }) }),
          fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans`, { 
            method: "POST", headers: directusHeaders(), body: JSON.stringify({ post_dispatch_plan_id: Number(planId), dispatch_plan_id: newPdpId, linked_at: new Date().toISOString(), linked_by: driver_id }) 
          })
        );
      }

      // 2. Sync Invoices
      let newInvoicePayloads: any[] = [];
      if (invoices && invoices.length > 0) {
        newInvoicePayloads = invoices.map((inv: any, idx: number) => ({
          post_dispatch_plan_id: Number(planId),
          invoice_id: inv.invoice_id,
          sequence: inv.sequence || idx + 1,
          status: "Not Fulfilled"
        }));
      } else if (newPdpId && oldPdpId && newPdpId !== oldPdpId) {
        const invIds = await dispatchCreationQueryService.fetchPdpInvoiceIds(newPdpId);
        newInvoicePayloads = invIds.map((id, idx) => ({
          post_dispatch_plan_id: Number(planId),
          invoice_id: id,
          sequence: idx + 1,
          status: "Not Fulfilled"
        }));
      }

      if (newInvoicePayloads.length > 0) {
        const oldInvoicesRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices?filter[post_dispatch_plan_id][_eq]=${planId}&fields=id`, { headers: directusHeaders() });
        const oldIds = ((await oldInvoicesRes.json()).data || []).map((i: any) => i.id);
        if (oldIds.length > 0) {
          await fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, { method: "DELETE", headers: directusHeaders(), body: JSON.stringify(oldIds) });
        }
        await batchCreate("post_dispatch_invoices", newInvoicePayloads);
      }

      // 3. Update Header & Staff
      const headerPayload = {
        dispatch_id: newPdpId, driver_id, vehicle_id, starting_point,
        estimated_time_of_dispatch: new Date(estimated_time_of_dispatch).toISOString(),
        estimated_time_of_arrival: new Date(estimated_time_of_arrival).toISOString(),
        remarks, amount, encoder_id: driver_id,
      };

      const staffPayloads = prepareStaffPayload(Number(planId), driver_id, helpers ?? []);

      await Promise.all([
        fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan/${planId}`, { method: "PATCH", headers: directusHeaders(), body: JSON.stringify(headerPayload) }),
        ...pdpSwapTasks,
        // Staff replacement (Clear then Add)
        (async () => {
          const sRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff?filter[post_dispatch_plan_id][_eq]=${planId}&fields=id`, { headers: directusHeaders() });
          const ids = ((await sRes.json()).data || []).map((s: any) => s.id);
          if (ids.length > 0) await fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff`, { method: "DELETE", headers: directusHeaders(), body: JSON.stringify(ids) });
          await batchCreate("post_dispatch_plan_staff", staffPayloads);
        })()
      ]);

      return NextResponse.json({ success: true });
    }

    // Default: Budget Update
    const { budgets } = body;

    const existingRes = await fetch(
      `${DIRECTUS_BASE}/items/post_dispatch_budgeting?filter[post_dispatch_plan_id][_eq]=${planId}&fields=id`,
      { headers: directusHeaders() },
    );
    const existingData = await existingRes.json();
    const existingIds = (existingData.data || []).map((b: any) => b.id);

    if (existingIds.length > 0) {
      await fetch(`${DIRECTUS_BASE}/items/post_dispatch_budgeting`, {
        method: "DELETE",
        headers: directusHeaders(),
        body: JSON.stringify(existingIds),
      });
    }

    if (budgets && budgets.length > 0) {
      const budgetPayloads = budgets.map((b: any) => ({
        post_dispatch_plan_id: Number(planId),
        coa_id: b.coa_id,
        amount: b.amount,
        remarks: b.remarks,
      }));
      await batchCreate("post_dispatch_budgeting", budgetPayloads);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Dispatch PATCH Error]:", error);
    return handleApiError(error);
  }
}
