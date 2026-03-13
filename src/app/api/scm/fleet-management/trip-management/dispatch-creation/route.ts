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
      if (!planId) {
        return NextResponse.json(
          { error: "plan_id is required" },
          { status: 400 },
        );
      }
      const result = await dispatchCreationQueryService.fetchPlanDetails(
        Number(planId),
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

    // 3. Insert Driver & Helpers into post_dispatch_plan_staff
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

    const staffResults = await Promise.all(
      staffPayloads.map((sp) =>
        fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify(sp),
        }),
      ),
    );

    for (const res of staffResults) {
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[Dispatch POST] Staff insert failed:", errorText);
        throw new Error(`Staff assignment failed: ${errorText}`);
      }
    }

    // 4. Insert into post_dispatch_dispatch_plans (Junction)
    const junctionPayload = {
      post_dispatch_plan_id: newPlanId,
      dispatch_plan_id: data.pre_dispatch_plan_id,
      linked_at: new Date().toISOString(),
      linked_by: data.driver_id, // Mandatory field in DDL
    };

    const junctionRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans`, {
      method: "POST",
      headers: directusHeaders(),
      body: JSON.stringify(junctionPayload),
    });

    if (!junctionRes.ok) {
      const errorText = await junctionRes.text();
      console.error("[Dispatch POST] Junction insert failed:", errorText);
      throw new Error(`Failed to link PDP: ${errorText}`);
    }

    // 5. Insert Budgets into post_dispatch_budgeting
    if (data.budgets && data.budgets.length > 0) {
      const budgetPayloads = data.budgets.map(
        (b: { coa_id: number; amount: number; remarks?: string }) => ({
          post_dispatch_plan_id: newPlanId,
          coa_id: b.coa_id,
          amount: b.amount,
          remarks: b.remarks,
        }),
      );

      await Promise.all(
        budgetPayloads.map((bp: any) =>
          fetch(`${DIRECTUS_BASE}/items/post_dispatch_budgeting`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify(bp),
          }),
        ),
      );
    }

    // 6. Insert Invoices from PDP into post_dispatch_invoices
    const invoiceIds = await dispatchCreationQueryService.fetchPdpInvoiceIds(
      data.pre_dispatch_plan_id,
    );
    if (invoiceIds.length > 0) {
      const invoicePayloads = invoiceIds.map((id, index) => ({
        post_dispatch_plan_id: newPlanId,
        invoice_id: id,
        sequence: index + 1,
        status: "Not Fulfilled",
      }));

      await Promise.all(
        invoicePayloads.map((ip) =>
          fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify(ip),
          }),
        ),
      );
    }

    // 5. Update source pre_dispatch_plan status
    const updateRes = await fetch(
      `${DIRECTUS_BASE}/items/dispatch_plan/${data.pre_dispatch_plan_id}`,
      {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({ status: "Dispatched" }),
      },
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error("[Dispatch POST] Source plan update failed:", errorText);
      throw new Error(`Failed to update source plan status: ${errorText}`);
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

    if (!planId) {
      return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
    }

    if (action === "update_trip") {
      const body = await req.json();
      
      // 1. Fetch existing PDP link from junction table
      const junctionFetchRes = await fetch(
        `${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans?filter[post_dispatch_plan_id][_eq]=${planId}`,
        { headers: directusHeaders() }
      );
      const junctionData = await junctionFetchRes.json();
      const junctionRecord = junctionData.data?.[0];
      const oldPdpId = junctionRecord?.dispatch_plan_id;
      const newPdpId = body.pre_dispatch_plan_id;

      // 2. Handle PDP swapping status and junction update
      if (newPdpId && oldPdpId && newPdpId !== oldPdpId) {
        // Revert old PDP to "Picked"
        await fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${oldPdpId}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify({ status: "Picked" }),
        });
        
        // Mark new PDP as Dispatched
        await fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${newPdpId}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify({ status: "Dispatched" }),
        });

        // Update Junction Record
        if (junctionRecord) {
          await fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans/${junctionRecord.id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({ 
              dispatch_plan_id: newPdpId,
              linked_by: body.driver_id,
            }),
          });
        }

        // Sync Invoices: Delete old ones and insert new ones
        await fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices?filter[post_dispatch_plan_id][_eq]=${planId}`, {
          method: "DELETE",
          headers: directusHeaders(),
        });

        const invoiceIds = await dispatchCreationQueryService.fetchPdpInvoiceIds(newPdpId);
        if (invoiceIds.length > 0) {
          const invoicePayloads = invoiceIds.map((id, index) => ({
            post_dispatch_plan_id: Number(planId),
            invoice_id: id,
            sequence: index + 1,
            status: "Not Fulfilled",
          }));
          await Promise.all(invoicePayloads.map(ip => 
            fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, {
              method: "POST",
              headers: directusHeaders(),
              body: JSON.stringify(ip)
            })
          ));
        }
      } else if (newPdpId && !oldPdpId) {
        // Just mark new as Dispatched and create junction if it wasn't linked before
        await fetch(`${DIRECTUS_BASE}/items/dispatch_plan/${newPdpId}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify({ status: "Dispatched" }),
        });

        await fetch(`${DIRECTUS_BASE}/items/post_dispatch_dispatch_plans`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            post_dispatch_plan_id: Number(planId),
            dispatch_plan_id: newPdpId,
            linked_at: new Date().toISOString(),
            linked_by: body.driver_id,
          }),
        });

        // Insert new invoices
        const invoiceIds = await dispatchCreationQueryService.fetchPdpInvoiceIds(newPdpId);
        if (invoiceIds.length > 0) {
          const invoicePayloads = invoiceIds.map((id, index) => ({
            post_dispatch_plan_id: Number(planId),
            invoice_id: id,
            sequence: index + 1,
            status: "Not Fulfilled",
          }));
          await Promise.all(invoicePayloads.map(ip => 
            fetch(`${DIRECTUS_BASE}/items/post_dispatch_invoices`, {
              method: "POST",
              headers: directusHeaders(),
              body: JSON.stringify(ip)
            })
          ));
        }
      }

      const planPayload = {
        driver_id: body.driver_id,
        vehicle_id: body.vehicle_id,
        starting_point: body.starting_point,
        estimated_time_of_dispatch: new Date(body.estimated_time_of_dispatch).toISOString(),
        estimated_time_of_arrival: new Date(body.estimated_time_of_arrival).toISOString(),
        remarks: body.remarks,
        amount: body.amount,
      };

      // 1. Update Header
      const planRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan/${planId}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify(planPayload),
      });

      if (!planRes.ok) {
        throw new Error("Failed to update dispatch plan header");
      }

      // 2. Clear old staff
      const existingStaffRes = await fetch(
        `${DIRECTUS_BASE}/items/post_dispatch_plan_staff?filter[post_dispatch_plan_id][_eq]=${planId}&fields=id`,
        { headers: directusHeaders() },
      );
      const existingStaffData = await existingStaffRes.json();
      const existingStaffIds = (existingStaffData.data || []).map((b: any) => b.id);

      if (existingStaffIds.length > 0) {
        const deleteRes = await fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff`, {
          method: "DELETE",
          headers: directusHeaders(),
          body: JSON.stringify(existingStaffIds),
        });
        if (!deleteRes.ok) throw new Error("Failed to clear existing staff");
      }

      // 3. Insert new staff
      const staffPayloads = [
        {
          post_dispatch_plan_id: Number(planId),
          user_id: body.driver_id,
          role: "Driver",
          is_present: false,
        },
        ...(body.helpers ?? []).map((h: { user_id: number }) => ({
          post_dispatch_plan_id: Number(planId),
          user_id: h.user_id,
          role: "Helper",
          is_present: false,
        })),
      ];

      const staffResults = await Promise.all(
        staffPayloads.map((sp) =>
          fetch(`${DIRECTUS_BASE}/items/post_dispatch_plan_staff`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify(sp),
          }),
        ),
      );

      for (const res of staffResults) {
        if (!res.ok) throw new Error("Failed to reassign staff");
      }

      return NextResponse.json({ success: true });
    }

    // Default: Budget Update (if no action, or action='budget')
    const { budgets } = await req.json();

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
