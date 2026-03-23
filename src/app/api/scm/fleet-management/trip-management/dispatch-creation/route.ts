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

    // 2. Insert into post_dispatch_plan
    const planPayload = {
      doc_no: `DP-${Date.now()}`,
      dispatch_id: data.pre_dispatch_plan_id,
      driver_id: data.driver_id,
      vehicle_id: data.vehicle_id,
      starting_point: data.starting_point,
      status: "For Approval",
      amount: data.amount,
      encoder_id: data.driver_id, // Fallback to driver as encoder
      estimated_time_of_dispatch: new Date(
        data.estimated_time_of_dispatch,
      ).toISOString(),
      estimated_time_of_arrival: new Date(
        data.estimated_time_of_arrival,
      ).toISOString(),
      remarks: data.remarks,
    };

    console.log(
      "[Dispatch POST] Sending Payload:",
      JSON.stringify(planPayload, null, 2),
    );

    const planRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(planPayload),
    });

    if (!planRes.ok) {
      const errorBody = await planRes.json().catch(() => ({}));
      console.error(
        "[Dispatch POST] Header creation failed:",
        JSON.stringify(errorBody, null, 2),
      );
      throw new Error(
        `Failed to create dispatch plan header: ${JSON.stringify(errorBody.errors || errorBody)}`,
      );
    }
    const planDoc = await planRes.json();
    const newPlanId = planDoc.data.id;

    // 3-6. Secondary Insertions in Parallel
    const staffPayloads = [
      {
        post_dispatch_plan_id: newPlanId,
        user_id: data.driver_id,
        role: "Driver",
        is_present: false,
      },
      ...(data.helpers ?? []).map((h: { user_id: number }) => ({
        post_dispatch_plan_id: newPlanId,
        user_id: h.user_id,
        role: "Helper",
        is_present: false,
      })),
    ];

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

    // Execute multiple sub-tasks in parallel
    const subTasks = [
      // Staff
      ...staffPayloads.map(sp => 
        fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff`, {
          method: "POST", headers: directusHeaders(), body: JSON.stringify(sp),
        }).then(r => r.ok ? r : Promise.reject(`Staff assignment failed: ${sp.user_id}`))
      ),
      // Junction
      fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans`, {
        method: "POST", headers: directusHeaders(), body: JSON.stringify(junctionPayload),
      }).then(r => r.ok ? r : Promise.reject("Failed to link PDP junction")),
      // Budgets
      ...budgetPayloads.map(bp => 
        fetch(`${DIRECTUS_BASE}/items/post_dispatch_budgeting`, {
          method: "POST", headers: directusHeaders(), body: JSON.stringify(bp),
        }).then(r => r.ok ? r : Promise.reject(`Budget allocation failed: ${bp.coa_id}`))
      ),
      // Invoices
      ...invoicePayloads.map(ip => 
        fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, {
          method: "POST", headers: directusHeaders(), body: JSON.stringify(ip),
        }).then(r => r.ok ? r : Promise.reject(`Invoice sync failed: ${ip.invoice_id}`))
      ),
      // Update source status
      fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${data.pre_dispatch_plan_id}`, {
        method: "PATCH", headers: directusHeaders(), body: JSON.stringify({ status: "Dispatched" }),
      }).then(r => r.ok ? r : Promise.reject("Failed to update source PDP status")),
    ];

    try {
      await Promise.all(subTasks);
    } catch (err: any) {
      console.error("[Dispatch POST] Sub-task failed:", err);
      // We don't throw yet as partial success is still meaningful, but we log it.
      // In a more complex system, we'd attempt a rollback here.
      throw new Error(err.toString());
    }

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
      const { pre_dispatch_plan_id: newPdpId, driver_id, vehicle_id, starting_point, estimated_time_of_dispatch, estimated_time_of_arrival, remarks, amount, helpers, invoices } = body;

      // 1-2. Resolve PDP Swapping
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

      // 3. Sync Invoices (sequential for safety with DELETE)
      if (invoices && invoices.length > 0) {
        const oldInvoicesRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices?filter[post_dispatch_plan_id][_eq]=${planId}&fields=id`, { headers: directusHeaders() });
        const oldInvoicesData = await oldInvoicesRes.json();
        const oldIds = (oldInvoicesData.data || []).map((i: any) => i.id);
        if (oldIds.length > 0) {
          await fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, { method: "DELETE", headers: directusHeaders(), body: JSON.stringify(oldIds) });
        }
        const invPayloads = invoices.map((inv: any, idx: number) => ({ post_dispatch_plan_id: Number(planId), invoice_id: inv.invoice_id, sequence: inv.sequence || idx + 1, status: "Not Fulfilled" }));
        await Promise.all(invPayloads.map((ip: any) => fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, { method: "POST", headers: directusHeaders(), body: JSON.stringify(ip) })));
      } else if (newPdpId && oldPdpId && newPdpId !== oldPdpId) {
        // Swap PDP -> fetch new default invoices
        const oldInvoicesRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices?filter[post_dispatch_plan_id][_eq]=${planId}&fields=id`, { headers: directusHeaders() });
        const oldIds = ((await oldInvoicesRes.json()).data || []).map((i: any) => i.id);
        if (oldIds.length > 0) await fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, { method: "DELETE", headers: directusHeaders(), body: JSON.stringify(oldIds) });

        const invIds = await dispatchCreationQueryService.fetchPdpInvoiceIds(newPdpId);
        const invPayloads = invIds.map((id, idx) => ({ post_dispatch_plan_id: Number(planId), invoice_id: id, sequence: idx + 1, status: "Not Fulfilled" }));
        await Promise.all(invPayloads.map(ip => fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, { method: "POST", headers: directusHeaders(), body: JSON.stringify(ip) })));
      }

      // 4. Update Header & Staff in parallel
      const headerPayload = {
        dispatch_id: newPdpId, driver_id, vehicle_id, starting_point,
        estimated_time_of_dispatch: new Date(estimated_time_of_dispatch).toISOString(),
        estimated_time_of_arrival: new Date(estimated_time_of_arrival).toISOString(),
        remarks, amount, encoder_id: driver_id,
      };

      const staffPayloads = [
        { post_dispatch_plan_id: Number(planId), user_id: driver_id, role: "Driver", is_present: false },
        ...(helpers ?? []).map((h: { user_id: number }) => ({ post_dispatch_plan_id: Number(planId), user_id: h.user_id, role: "Helper", is_present: false })),
      ];

      const finalizeTasks = [
        fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan/${planId}`, { method: "PATCH", headers: directusHeaders(), body: JSON.stringify(headerPayload) }),
        ...pdpSwapTasks,
        // Staff replacement (Clear then Add)
        (async () => {
          const sRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff?filter[post_dispatch_plan_id][_eq]=${planId}&fields=id`, { headers: directusHeaders() });
          const ids = ((await sRes.json()).data || []).map((s: any) => s.id);
          if (ids.length > 0) await fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff`, { method: "DELETE", headers: directusHeaders(), body: JSON.stringify(ids) });
          await Promise.all(staffPayloads.map(sp => fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff`, { method: "POST", headers: directusHeaders(), body: JSON.stringify(sp) })));
        })()
      ];

      await Promise.all(finalizeTasks);
      return NextResponse.json({ success: true });
    }

    // Default: Budget Update (if no action, or action='budget')
    const { budgets } = body;

    // 1. Delete existing budgets for this plan
    // We fetch them first to get their IDs if direct delete-by-filter is not supported or to be safer
    const existingRes = await fetch(
      `${DIRECTUS_BASE}/items/post_dispatch_budgeting?filter[post_dispatch_plan_id][_eq]=${planId}&fields=id`,
      { headers: directusHeaders() },
    );
    const existingData = await existingRes.json();
    const existingIds = (existingData.data || []).map((b: any) => b.id);

    if (existingIds.length > 0) {
      const deleteRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_budgeting`, {
        method: "DELETE",
        headers: directusHeaders(),
        body: JSON.stringify(existingIds),
      });
      if (!deleteRes.ok) throw new Error("Failed to clear existing budgets");
    }

    // 2. Insert new budgets
    if (budgets && budgets.length > 0) {
      const budgetPayloads = budgets.map((b: any) => ({
        post_dispatch_plan_id: Number(planId),
        coa_id: b.coa_id,
        amount: b.amount,
        remarks: b.remarks,
      }));

      const insertRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_budgeting`, {
        method: "POST",
        headers: directusHeaders(),
        body: JSON.stringify(budgetPayloads),
      });

      if (!insertRes.ok) {
        const errorText = await insertRes.text();
        throw new Error(`Failed to insert new budgets: ${errorText}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Dispatch PATCH Error]:", error);
    return handleApiError(error);
  }
}
