import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://goatedcodoer:8056";
const AUTH_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

export async function GET() {
    try {
        // Fetch post_dispatch_plan
        const planRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan?limit=-1&sort=-date_encoded`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const plans = await planRes.json();

        // Fetch post_dispatch_plan_staff
        const staffRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff?limit=-1`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const staff = await staffRes.json();

        // Fetch users to get names and RFID
        const userRes = await fetch(`${DIRECTUS_URL}/items/user?limit=-1`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const users = await userRes.json();

        // Fetch vehicles
        const vehicleRes = await fetch(`${DIRECTUS_URL}/items/vehicles?limit=-1`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const vehicles = await vehicleRes.json();

        const userMap = new Map<number, any>(users.data.map((u: any) => [u.user_id, u]));
        const vehicleMap = new Map<number, any>(vehicles.data.map((v: any) => [v.vehicle_id, v]));

        // staff map: post_dispatch_plan_id -> Array of staff records
        const planStaffMap = new Map<number, any[]>();
        staff.data.forEach((s: any) => {
            if (!s.post_dispatch_plan_id) return;
            if (!planStaffMap.has(s.post_dispatch_plan_id)) {
                planStaffMap.set(s.post_dispatch_plan_id, []);
            }
            planStaffMap.get(s.post_dispatch_plan_id)!.push(s);
        });

        // Join data to create enriched kiosk plans
        const enrichedPlans = plans.data.map((p: any) => {
            const planStatus = (p.status || "").trim().toLowerCase();
            const isInbound = planStatus === "for inbound";

            // Get all staff records for this plan
            let staffRecords = planStaffMap.get(p.id) || [];

            // For Inbound, ONLY show staff who are physically present
            if (isInbound) {
                staffRecords = staffRecords.filter((s: any) => s.is_present === 1 || s.is_present === true);
            }

            const vehicle = vehicleMap.get(p.vehicle_id);
            const formatUser = (user: any) => user ? `${user.user_fname} ${user.user_lname}` : null;

            // Map staff records to user data
            const driverRecord = staffRecords.find((s: any) => s.role === "Driver");
            const helperRecords = staffRecords.filter((s: any) => s.role === "Helper");

            const driverUser = driverRecord ? userMap.get(driverRecord.user_id) : null;
            const helperUsers = helperRecords.map((h: any) => userMap.get(h.user_id)).filter(Boolean);

            return {
                id: p.id,
                doc_no: p.doc_no,
                date_encoded: p.date_encoded,
                estimated_time_of_dispatch: p.estimated_time_of_dispatch,
                estimated_time_of_arrival: p.estimated_time_of_arrival,
                // Driver Details
                driver_id: driverUser?.user_id || 0,
                driver_name: formatUser(driverUser) || (isInbound ? "" : "Unknown Driver"),
                driver_rfid: driverUser?.rf_id || null,
                // Legacy Helper (for backwards/simple compatibility)
                helper_name: formatUser(helperUsers[0]) || null,
                helper_rfid: helperUsers[0]?.rf_id || null,
                // Multi-Helper Support
                helpers: helperUsers.map((h: any) => ({
                    name: formatUser(h),
                    rf_id: h.rf_id || null
                })),
                vehicle_plate: vehicle?.vehicle_plate || "N/A",
                status: p.status,
            };
        });

        return NextResponse.json({ data: enrichedPlans });
    } catch (error) {
        console.error("API Error in inbound-outbound-kiosk:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { plan_id, status, driver_id, driver_verified, helper_verified_rfids, time_of_dispatch, time_of_arrival } = body;

        if (!plan_id || !status) {
            return NextResponse.json({ error: "plan_id and status are required" }, { status: 400 });
        }

        // 1. Update Post Dispatch Plan Status
        const planUpdate = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan/${plan_id}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${AUTH_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status,
                ...(time_of_dispatch && { time_of_dispatch }),
                ...(time_of_arrival && { time_of_arrival }),
                ...(driver_id && { driver_id })
            })
        });

        if (!planUpdate.ok) {
            console.error("Failed to update plan status:", await planUpdate.text());
            return NextResponse.json({ error: "Failed to update plan status" }, { status: 500 });
        }

        // 2. Handle Staff Substitutions and Presence recording

        const staffRes = await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff?filter[post_dispatch_plan_id][_eq]=${plan_id}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const existingStaff = (await staffRes.json()).data || [];

        // Fetch users to map RFIDs to IDs
        const userRes = await fetch(`${DIRECTUS_URL}/items/user?limit=-1`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        const users = (await userRes.json()).data || [];
        const rfidToUserId = new Map<string, number>(
            users.map((u: any) => [u.rf_id?.toLowerCase(), u.user_id]).filter((x: any) => x[0])
        );

        // --- Process Driver ---
        const existingDriver = existingStaff.find((s: any) => s.role === "Driver");
        if (driver_id && (!existingDriver || existingDriver.user_id !== driver_id)) {
            // Substitution: mark old as not present, create new
            if (existingDriver) {
                await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff/${existingDriver.id}`, {
                    method: "PATCH",
                    headers: { "Authorization": `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ is_present: 0 })
                });
            }
            await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ post_dispatch_plan_id: plan_id, user_id: driver_id, role: "Driver", is_present: 1 })
            });
        } else if (existingDriver) {
            await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff/${existingDriver.id}`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ is_present: driver_verified ? 1 : 0 })
            });
        }

        // --- Process Helpers ---
        const helperRfids = (helper_verified_rfids || []).map((r: string) => r.toLowerCase());
        const verifiedUserIds = new Set(helperRfids.map((r: string) => rfidToUserId.get(r)).filter(Boolean));

        // 1. Mark existing helpers as present/absent
        const existingHelpers = existingStaff.filter((s: any) => s.role === "Helper");
        for (const h of existingHelpers) {
            const isVerified = verifiedUserIds.has(h.user_id);
            await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff/${h.id}`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ is_present: isVerified ? 1 : 0 })
            });
            if (isVerified) verifiedUserIds.delete(h.user_id); // Already handled
        }

        // 2. Create records for substituted/extra verified helpers
        for (const uid of Array.from(verifiedUserIds)) {
            await fetch(`${DIRECTUS_URL}/items/post_dispatch_plan_staff`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ post_dispatch_plan_id: plan_id, user_id: uid, role: "Helper", is_present: 1 })
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH Error in inbound-outbound-kiosk:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
