import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
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

    // Mode: options - fetch vehicles, users, and parts catalogue with stock
    if (mode === "options") {
      const branchId = url.searchParams.get("branch_id");

      const [vRes, uRes, pRes, sRes] = await Promise.all([
        fetch(`${DIRECTUS_URL}/items/vehicles?limit=-1`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).catch(() => null),
        fetch(`${DIRECTUS_URL}/users?limit=-1&fields=id,first_name,last_name,email,role`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).catch(() => null),
        fetch(`${DIRECTUS_URL}/items/vehicle_parts?filter[is_active][_eq]=true&limit=-1&fields=id,part_code,part_name,category,unit,unit_cost,barcode`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).catch(() => null),
        fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?limit=-1&fields=id,part_id,branch_id,on_hand,reserved`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).catch(() => null),
      ]);

      const vehicles = vRes ? (await vRes.json().catch(() => ({})))?.data || [] : [];
      const users = uRes ? (await uRes.json().catch(() => ({})))?.data || [] : [];
      const parts = pRes ? (await pRes.json().catch(() => ({})))?.data || [] : [];
      const stocks = sRes ? (await sRes.json().catch(() => ({})))?.data || [] : [];

      // Map stock to parts
      const partsWithStock = parts.map((part: { id: number }) => {
        const branchStock = stocks.filter((s: { part_id: number; branch_id?: number }) => 
          Number(s.part_id) === Number(part.id) && (!branchId || Number(s.branch_id) === Number(branchId))
        );
        const on_hand = branchStock.reduce((acc: number, curr: { on_hand?: number }) => acc + (Number(curr.on_hand) || 0), 0);
        const reserved = branchStock.reduce((acc: number, curr: { reserved?: number }) => acc + (Number(curr.reserved) || 0), 0);
        return {
          ...part,
          on_hand,
          reserved,
        };
      });

      return json({
        data: {
          vehicles,
          users,
          parts: partsWithStock,
        },
      });
    }

    // Default: fetch job orders list
    const params = new URLSearchParams();
    params.set("limit", "-1");
    params.set("sort", "-id");
    params.set("fields", "*,vehicle_id.*,requested_by.*,approved_by.*,mechanic_id.*");

    const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders?${params.toString()}`, {
      cache: "no-store",
      headers: directusHeaders(),
    });

    const body = await upstream.json().catch(() => ({ data: [] }));
    const jobOrders = body?.data || [];

    // Also get parts requested/issued for all job orders
    const joPartsRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts?limit=-1&fields=*,part_id.*`, {
      cache: "no-store",
      headers: directusHeaders(),
    }).catch(() => null);

    const joParts = joPartsRes ? (await joPartsRes.json().catch(() => ({})))?.data || [] : [];

    // Attach parts to corresponding job orders
    const enriched = jobOrders.map((jo: { id: number }) => {
      const partsForJo = joParts
        .filter((jp: { job_order_id: number | { id: number } }) => {
          const jpJoId = typeof jp.job_order_id === "object" && jp.job_order_id !== null ? jp.job_order_id.id : jp.job_order_id;
          return Number(jpJoId) === Number(jo.id);
        })
        .map((jp: { id: number; part_id: { id: number; part_name?: string; part_code?: string; unit_cost?: number } | number; quantity_requested: number; quantity_issued?: number; unit_cost?: number; remarks?: string }) => {
          const partObj = typeof jp.part_id === "object" && jp.part_id !== null ? jp.part_id : null;
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

export async function POST(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { action } = payload;

    if (action === "create_request") {
      const { vehicle_id, branch_id, jo_type, priority, description, odometer_reading, requested_by, parts } = payload;

      if (!vehicle_id || !jo_type || !description) {
        return json({ error: "Vehicle, JO type, and description are required." }, 400);
      }

      // Generate a unique jo_no: JO-YYYYMMDD-XXXX
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const jo_no = `JO-${datePart}-${randPart}`;

      // Check if branch_id is provided or can be resolved
      let resolvedBranchId = branch_id ? Number(branch_id) : null;
      if (!resolvedBranchId && vehicle_id) {
        try {
          const vehRes = await fetch(`${DIRECTUS_URL}/items/vehicles/${vehicle_id}?fields=branch_id`, {
            cache: "no-store",
            headers: directusHeaders(),
          });
          const vehData = await vehRes.json().catch(() => ({}));
          const vBranch = vehData?.data?.branch_id;
          if (vBranch) {
            resolvedBranchId = typeof vBranch === "object" ? Number(vBranch.id) : Number(vBranch);
          }
        } catch {
          // ignore
        }
      }

      // Verify that resolvedBranchId actually exists in Directus "branches" to prevent invalid foreign key errors
      let validBranchId: number | null = null;
      if (resolvedBranchId) {
        try {
          const bCheck = await fetch(`${DIRECTUS_URL}/items/branches/${resolvedBranchId}?fields=id`, {
            cache: "no-store",
            headers: directusHeaders(),
          });
          if (bCheck.ok) {
            validBranchId = resolvedBranchId;
          }
        } catch {
          // ignore
        }
      }

      const joPayload: Record<string, unknown> = {
        jo_no,
        vehicle_id: Number(vehicle_id),
        jo_type,
        priority: priority || "Normal",
        description,
        odometer_reading: odometer_reading ? Number(odometer_reading) : null,
        status: "Requested",
        requested_by: requested_by ? Number(requested_by) : null,
        requested_at: new Date().toISOString(),
      };

      if (validBranchId) {
        joPayload.branch_id = validBranchId;
      }

      const upstream = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders`, {
        method: "POST",
        headers: directusHeaders(),
        body: JSON.stringify(joPayload),
      });

      const resData = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return json({ error: resData?.errors?.[0]?.message || "Failed to create Job Order" }, upstream.status);
      }

      const createdJo = resData.data;

      // If parts were requested, insert them into vehicle_job_order_parts and reserve stock in vehicle_part_stock
      if (Array.isArray(parts) && parts.length > 0) {
        for (const p of parts) {
          if (!p.part_id || !p.quantity_requested) continue;
          const partId = Number(p.part_id);
          const qty = Number(p.quantity_requested);
          const cost = Number(p.unit_cost) || 0;

          await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify({
              job_order_id: createdJo.id,
              part_id: partId,
              quantity_requested: qty,
              quantity_issued: 0,
              unit_cost: cost,
              remarks: p.remarks || "",
            }),
          }).catch(() => null);

          // Reserve stock in vehicle_part_stock
          try {
            const stockFilter = resolvedBranchId
              ? `filter[part_id][_eq]=${partId}&filter[branch_id][_eq]=${resolvedBranchId}&limit=1`
              : `filter[part_id][_eq]=${partId}&limit=1`;
            const sRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?${stockFilter}`, {
              cache: "no-store",
              headers: directusHeaders(),
            });
            const sData = await sRes.json().catch(() => ({ data: [] }));
            let existingStock = sData.data?.[0];

            if (!existingStock) {
              const fbRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&limit=1`, {
                cache: "no-store",
                headers: directusHeaders(),
              });
              const fbData = await fbRes.json().catch(() => ({ data: [] }));
              existingStock = fbData.data?.[0];
            }

            if (existingStock) {
              const currentReserved = Number(existingStock.reserved) || 0;
              await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${existingStock.id}`, {
                method: "PATCH",
                headers: directusHeaders(),
                body: JSON.stringify({
                  reserved: currentReserved + qty,
                }),
              });
            }
          } catch {
            // non-blocking
          }
        }
      }

      return json({ success: true, data: createdJo }, 201);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!DIRECTUS_URL) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");

    const payload = await req.json();
    const { action, job_order_id } = payload;

    if (!job_order_id) {
      return json({ error: "job_order_id is required." }, 400);
    }

    // 1. Approve or Reject & Assign Mechanic
    if (action === "approve_assign") {
      const { decision, mechanic_id, approved_by, decision_remarks } = payload;
      const status = decision === "Approved" ? "Approved" : "Rejected";

      const updatePayload: Record<string, unknown> = {
        status,
        approved_by: approved_by ? Number(approved_by) : null,
        approved_at: new Date().toISOString(),
        decision_remarks: decision_remarks || "",
      };

      if (status === "Approved" && mechanic_id) {
        updatePayload.mechanic_id = Number(mechanic_id);
      }

      const patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify(updatePayload),
      });

      // If rejected, unreserve/release the reserved parts
      if (status === "Rejected") {
        try {
          const partsRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts?filter[job_order_id][_eq]=${job_order_id}&limit=-1`, {
            cache: "no-store",
            headers: directusHeaders(),
          });
          const partsData = await partsRes.json().catch(() => ({ data: [] }));
          const joParts = partsData.data || [];

          for (const jp of joParts) {
            const partId = Number(typeof jp.part_id === "object" && jp.part_id !== null ? jp.part_id.id : jp.part_id);
            const requestedQty = Number(jp.quantity_requested) || 0;
            const issuedQty = Number(jp.quantity_issued) || 0;
            const unissuedQty = Math.max(0, requestedQty - issuedQty);

            if (!partId || unissuedQty <= 0) continue;

            const stockRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&limit=1`, {
              cache: "no-store",
              headers: directusHeaders(),
            });
            const stockData = await stockRes.json().catch(() => ({ data: [] }));
            const existingStock = stockData.data?.[0];

            if (existingStock) {
              const currentReserved = Number(existingStock.reserved) || 0;
              await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${existingStock.id}`, {
                method: "PATCH",
                headers: directusHeaders(),
                body: JSON.stringify({
                  reserved: Math.max(0, currentReserved - unissuedQty),
                }),
              });
            }
          }
        } catch {
          // non-blocking
        }
      }

      const patchData = await patchRes.json().catch(() => ({}));
      return json(patchData, patchRes.status);
    }

    // 2. Start Maintenance (Perform): Mark In Progress and auto-issue/deduct requested parts
    if (action === "start_maintenance") {
      // Fetch JO and vehicle details
      const joRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}?fields=*,vehicle_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const joData = await joRes.json().catch(() => ({}));
      const jo = joData?.data;
      const joNo = jo?.jo_no || `JO-#${job_order_id}`;
      const branchIdNum = Number(jo?.branch_id || 1);
      const vehicleId =
        typeof jo?.vehicle_id === "object" && jo?.vehicle_id !== null
          ? jo.vehicle_id.id || jo.vehicle_id.vehicle_id
          : jo?.vehicle_id || null;

      // Update JO status to In Progress
      const patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({
          status: "In Progress",
          started_at: new Date().toISOString(),
        }),
      });

      // Deduct unissued requested parts
      const partsRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts?filter[job_order_id][_eq]=${job_order_id}&limit=-1`, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const partsData = await partsRes.json().catch(() => ({ data: [] }));
      const joParts = partsData.data || [];

      for (const jp of joParts) {
        const partId = Number(typeof jp.part_id === "object" && jp.part_id !== null ? jp.part_id.id : jp.part_id);
        const requestedQty = Number(jp.quantity_requested) || 0;
        const issuedQty = Number(jp.quantity_issued) || 0;
        const qtyToIssue = Math.max(0, requestedQty - issuedQty);

        if (!partId || qtyToIssue <= 0) continue;

        const cost = Number(jp.unit_cost) || 0;

        // a. Record Movement: Issue
        await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            part_id: partId,
            branch_id: branchIdNum,
            movement_type: "Issue",
            quantity: qtyToIssue,
            unit_cost: cost,
            job_order_id: Number(job_order_id),
            vehicle_id: vehicleId ? Number(vehicleId) : null,
            reference_no: joNo,
            remarks: jp.remarks || `Auto-issued upon Start Maintenance (${joNo})`,
            created_at: new Date().toISOString(),
          }),
        }).catch(() => null);

        // b. Deduct stock on_hand & reserved
        const stockUrl = branchIdNum
          ? `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&filter[branch_id][_eq]=${branchIdNum}&limit=1`
          : `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&limit=1`;
        const stockRes = await fetch(stockUrl, {
          cache: "no-store",
          headers: directusHeaders(),
        });
        const stockData = await stockRes.json().catch(() => ({ data: [] }));
        let currentStock = stockData.data?.[0];

        // Fallback: if not found for that branch, find any stock entry for this part
        if (!currentStock) {
          const fallbackRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&limit=1`, {
            cache: "no-store",
            headers: directusHeaders(),
          });
          const fbData = await fallbackRes.json().catch(() => ({ data: [] }));
          currentStock = fbData.data?.[0];
        }

        if (currentStock) {
          const currentOnHand = Number(currentStock.on_hand) || 0;
          const currentReserved = Number(currentStock.reserved) || 0;
          await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${currentStock.id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              on_hand: Math.max(0, currentOnHand - qtyToIssue),
              reserved: Math.max(0, currentReserved - qtyToIssue),
            }),
          });
        }

        // c. Update quantity_issued in vehicle_job_order_parts
        await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts/${jp.id}`, {
          method: "PATCH",
          headers: directusHeaders(),
          body: JSON.stringify({
            quantity_issued: issuedQty + qtyToIssue,
            issued_at: new Date().toISOString(),
          }),
        }).catch(() => null);

        // d. Register to vehicle_installed_parts
        if (vehicleId) {
          await fetch(`${DIRECTUS_URL}/items/vehicle_installed_parts`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify({
              vehicle_id: Number(vehicleId),
              part_id: partId,
              quantity: qtyToIssue,
              installed_at: new Date().toISOString(),
              job_order_id: Number(job_order_id),
              notes: `Installed via Job Order ${joNo}`,
            }),
          }).catch(() => null);
        }
      }

      const patchData = await patchRes.json().catch(() => ({}));
      return json(patchData, patchRes.status);
    }

    // 3. Issue Parts from Inventory (Manual modal)
    if (action === "issue_parts") {
      const { branch_id, items, issued_by } = payload as {
        branch_id: number;
        items: Array<{ part_id: number; quantity: number; unit_cost: number; remarks?: string }>;
        issued_by?: number;
      };

      if (!items || !Array.isArray(items) || items.length === 0) {
        return json({ error: "Items to issue are required." }, 400);
      }

      // Fetch JO details
      const joRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}?fields=*,vehicle_id.*`, {
        cache: "no-store",
        headers: directusHeaders(),
      });
      const joData = await joRes.json().catch(() => ({}));
      const jo = joData?.data;

      const joNo = jo?.jo_no || `JO-#${job_order_id}`;
      const branchIdNum = Number(branch_id || jo?.branch_id || 1);
      const vehicleId =
        typeof jo?.vehicle_id === "object" && jo?.vehicle_id !== null
          ? jo.vehicle_id.id || jo.vehicle_id.vehicle_id
          : jo?.vehicle_id || null;

      for (const item of items) {
        const partId = Number(item.part_id);
        const qty = Number(item.quantity) || 0;
        const cost = Number(item.unit_cost) || 0;
        const itemRemarks = item.remarks || `Issued for ${joNo}`;

        if (!partId || qty <= 0) continue;

        // a. Record Movement: Issue
        await fetch(`${DIRECTUS_URL}/items/vehicle_part_movements`, {
          method: "POST",
          headers: directusHeaders(),
          body: JSON.stringify({
            part_id: partId,
            branch_id: branchIdNum,
            movement_type: "Issue",
            quantity: qty,
            unit_cost: cost,
            job_order_id: Number(job_order_id),
            vehicle_id: vehicleId ? Number(vehicleId) : null,
            reference_no: joNo,
            remarks: itemRemarks,
            created_by: issued_by ? Number(issued_by) : null,
            created_at: new Date().toISOString(),
          }),
        });

        // b. Deduct Stock on_hand & reserved
        const stockUrl = `${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&filter[branch_id][_eq]=${branchIdNum}&limit=1`;
        const stockRes = await fetch(stockUrl, {
          cache: "no-store",
          headers: directusHeaders(),
        });
        const stockData = await stockRes.json().catch(() => ({ data: [] }));
        let currentStock = stockData.data?.[0];

        // Fallback: check without branch filter if not found
        if (!currentStock) {
          const fbRes = await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock?filter[part_id][_eq]=${partId}&limit=1`, {
            cache: "no-store",
            headers: directusHeaders(),
          });
          const fbData = await fbRes.json().catch(() => ({ data: [] }));
          currentStock = fbData.data?.[0];
        }

        if (currentStock) {
          const currentOnHand = Number(currentStock.on_hand) || 0;
          const currentReserved = Number(currentStock.reserved) || 0;
          await fetch(`${DIRECTUS_URL}/items/vehicle_part_stock/${currentStock.id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              on_hand: Math.max(0, currentOnHand - qty),
              reserved: Math.max(0, currentReserved - qty),
            }),
          });
        }

        // c. Check if already exists in vehicle_job_order_parts, else create
        const jopCheckUrl = `${DIRECTUS_URL}/items/vehicle_job_order_parts?filter[job_order_id][_eq]=${job_order_id}&filter[part_id][_eq]=${partId}&limit=1`;
        const jopCheckRes = await fetch(jopCheckUrl, {
          cache: "no-store",
          headers: directusHeaders(),
        });
        const jopCheckData = await jopCheckRes.json().catch(() => ({ data: [] }));
        const existingJop = jopCheckData.data?.[0];

        if (existingJop) {
          await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts/${existingJop.id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              quantity_issued: (Number(existingJop.quantity_issued) || 0) + qty,
              issued_by: issued_by ? Number(issued_by) : null,
              issued_at: new Date().toISOString(),
            }),
          });
        } else {
          await fetch(`${DIRECTUS_URL}/items/vehicle_job_order_parts`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify({
              job_order_id: Number(job_order_id),
              part_id: partId,
              quantity_requested: qty,
              quantity_issued: qty,
              unit_cost: cost,
              issued_by: issued_by ? Number(issued_by) : null,
              issued_at: new Date().toISOString(),
              remarks: itemRemarks,
            }),
          });
        }

        // d. Register to vehicle_installed_parts
        if (vehicleId) {
          await fetch(`${DIRECTUS_URL}/items/vehicle_installed_parts`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify({
              vehicle_id: Number(vehicleId),
              part_id: partId,
              quantity: qty,
              job_order_id: Number(job_order_id),
              installed_at: new Date().toISOString(),
              remarks: itemRemarks,
            }),
          }).catch(() => null);
        }
      }

      return json({ success: true, message: "Parts successfully issued and stock updated." });
    }

    // 4. Complete JO
    if (action === "complete_jo") {
      const { completion_remarks, labor_cost, final_odometer } = payload;

      // Update Job Order status
      const patchRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}`, {
        method: "PATCH",
        headers: directusHeaders(),
        body: JSON.stringify({
          status: "Completed",
          completed_at: new Date().toISOString(),
          completion_remarks: completion_remarks || "",
          labor_cost: labor_cost ? Number(labor_cost) : 0,
        }),
      });

      const patchData = await patchRes.json().catch(() => ({}));

      // Update vehicle odometer if provided
      if (final_odometer) {
        const joRes = await fetch(`${DIRECTUS_URL}/items/vehicle_job_orders/${job_order_id}?fields=vehicle_id`, {
          cache: "no-store",
          headers: directusHeaders(),
        });
        const joData = await joRes.json().catch(() => ({}));
        const vehicleId =
          typeof joData?.data?.vehicle_id === "object" && joData?.data?.vehicle_id !== null
            ? joData.data.vehicle_id.id
            : joData?.data?.vehicle_id;

        if (vehicleId) {
          await fetch(`${DIRECTUS_URL}/items/vehicles/${vehicleId}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify({
              odometer: Number(final_odometer),
              status: "Active",
            }),
          }).catch(() => null);
        }
      }

      return json({ success: true, data: patchData?.data });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e: unknown) {
    const err = e as Error;
    return json({ error: String(err?.message || err) }, 500);
  }
}
