import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

interface RawVehicle {
  vehicle_id: number;
  vehicle_plate?: string;
  name?: string;
  make?: string;
  model?: string;
  year_model?: number;
  status?: string;
  fuel_type?: number | { id: number; name: string };
  vehicle_type?: number | { id: number; type_name: string };
  maximum_weight?: number | string;
  max_liters?: number | string;
  current_mileage?: number;
  branch_id?: number;
}

interface RawDriver {
  id: number;
  user_id: number;
  branch_id: number;
  license_no?: string;
  license_classification?: string;
  license_expiry_date?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface RawUser {
  user_id: number;
  user_fname?: string;
  user_lname?: string;
  user_email?: string;
  user_contact?: string;
}

interface RawBranch {
  id: number;
  branch_name?: string;
}

interface RawJobOrder {
  id: number;
  jo_no?: string;
  vehicle_id?: number | { vehicle_plate?: string; plate_number?: string; name?: string; make?: string; model?: string };
  jo_type?: string;
  priority?: string;
  status?: string;
  target_start_date?: string;
  created_at?: string;
  target_end_date?: string;
  total_parts_cost?: number | string;
}

interface RawDispatchPlan {
  id: string | number;
  doc_no?: string;
  driver_id?: number;
  vehicle_id?: number;
  status?: string;
  time_of_dispatch?: string;
  estimated_time_of_arrival?: string;
  remarks?: string;
}

interface RawFuelType {
  id: number;
  name?: string;
}

interface RawVehicleType {
  id: number;
  type_name?: string;
}

function json(res: unknown, status = 200) {
  return NextResponse.json(res, { status });
}

function directusHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

export async function GET() {
  try {
    if (!DIRECTUS_URL) {
      return json({ error: "NEXT_PUBLIC_API_BASE_URL is not configured" }, 500);
    }

    // Parallel fetch from all respective database collections
    const [vehiclesRes, driversRes, usersRes, branchesRes, joRes, dispatchPlansRes, fuelTypesRes, vehicleTypesRes] =
      await Promise.all([
        fetch(
          `${DIRECTUS_URL}/items/vehicles?limit=-1&fields=vehicle_id,vehicle_plate,name,make,model,year_model,status,fuel_type,vehicle_type,maximum_weight,max_liters,current_mileage,branch_id`,
          {
            cache: "no-store",
            headers: directusHeaders(),
          }
        ).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),

        fetch(`${DIRECTUS_URL}/items/driver?limit=-1&fields=id,user_id,branch_id,license_no,license_classification,license_expiry_date,contact_phone,contact_email`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),

        fetch(`${DIRECTUS_URL}/items/user?limit=-1&fields=user_id,user_fname,user_lname,user_email,user_contact`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),

        fetch(`${DIRECTUS_URL}/items/branches?limit=-1&fields=id,branch_name`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),

        fetch(`${DIRECTUS_URL}/items/vehicle_job_orders?limit=-1&fields=*,vehicle_id.*`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),

        fetch(`${DIRECTUS_URL}/items/post_dispatch_plan?limit=-1&fields=id,doc_no,driver_id,vehicle_id,status,time_of_dispatch,estimated_time_of_arrival,remarks`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),

        fetch(`${DIRECTUS_URL}/items/fuel_type?limit=-1&fields=id,name`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),

        fetch(`${DIRECTUS_URL}/items/vehicle_type?limit=-1&fields=id,type_name`, {
          cache: "no-store",
          headers: directusHeaders(),
        }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      ]);

    const rawVehicles: RawVehicle[] = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [];
    const rawDrivers: RawDriver[] = Array.isArray(driversRes.data) ? driversRes.data : [];
    const rawUsers: RawUser[] = Array.isArray(usersRes.data) ? usersRes.data : [];
    const rawBranches: RawBranch[] = Array.isArray(branchesRes.data) ? branchesRes.data : [];
    const rawJobOrders: RawJobOrder[] = Array.isArray(joRes.data) ? joRes.data : [];
    const rawDispatchPlans: RawDispatchPlan[] = Array.isArray(dispatchPlansRes.data) ? dispatchPlansRes.data : [];
    const rawFuelTypes: RawFuelType[] = Array.isArray(fuelTypesRes.data) ? fuelTypesRes.data : [];
    const rawVehicleTypes: RawVehicleType[] = Array.isArray(vehicleTypesRes.data) ? vehicleTypesRes.data : [];

    // Map fuel types & vehicle types
    const fuelTypeMap = new Map<number | string, string>();
    for (const ft of rawFuelTypes) {
      fuelTypeMap.set(ft.id, ft.name || "");
      fuelTypeMap.set(String(ft.id), ft.name || "");
    }

    const vehicleTypeMap = new Map<number | string, string>();
    for (const vt of rawVehicleTypes) {
      vehicleTypeMap.set(vt.id, vt.type_name || "");
      vehicleTypeMap.set(String(vt.id), vt.type_name || "");
    }

    // Map users for quick driver & dispatch lookup
    const userMap = new Map<number | string, { name: string; email?: string; contact?: string }>();
    for (const u of rawUsers) {
      const uId = u.user_id;
      const fname = u.user_fname ?? "";
      const lname = u.user_lname ?? "";
      const fullName = `${fname} ${lname}`.trim() || `User #${uId}`;
      userMap.set(Number(uId), {
        name: fullName,
        email: u.user_email || "",
        contact: u.user_contact || "",
      });
      userMap.set(String(uId), {
        name: fullName,
        email: u.user_email || "",
        contact: u.user_contact || "",
      });
    }

    // Map branches
    const branchMap = new Map<number | string, string>();
    for (const b of rawBranches) {
      branchMap.set(b.id, b.branch_name || "");
      branchMap.set(String(b.id), b.branch_name || "");
    }

    // Format Vehicles
    const vehicles = rawVehicles.map((v) => {
      const vId = v.vehicle_id;
      const fuelName = typeof v.fuel_type === "object" && v.fuel_type !== null
        ? v.fuel_type.name
        : fuelTypeMap.get(v.fuel_type as number) || "";
      const typeName = typeof v.vehicle_type === "object" && v.vehicle_type !== null
        ? v.vehicle_type.type_name
        : vehicleTypeMap.get(v.vehicle_type as number) || "";

      const makeModel = [v.make, v.model].filter(Boolean).join(" ");
      const displayName = v.name || makeModel || `Vehicle #${vId}`;

      return {
        id: vId,
        plate_number: v.vehicle_plate || "—",
        name: displayName,
        status: v.status || "Active",
        brand: v.make || "",
        model: v.model || "",
        fuel_type: fuelName,
        vehicle_type: typeName,
        capacity: v.maximum_weight ? `${v.maximum_weight} kg` : v.max_liters ? `${v.max_liters} L` : "—",
      };
    });

    const vehiclePlateMap = new Map<number | string, string>();
    for (const v of vehicles) {
      vehiclePlateMap.set(v.id, v.plate_number);
      vehiclePlateMap.set(String(v.id), v.plate_number);
    }

    // Format Drivers (using `driver` + `user` table definitions)
    const drivers = rawDrivers.map((d) => {
      const uInfo = userMap.get(d.user_id);
      return {
        id: d.id,
        user_id: d.user_id,
        name: uInfo?.name || `Driver #${d.id}`,
        email: d.contact_email || uInfo?.email || "—",
        contact: d.contact_phone || uInfo?.contact || "—",
        branch_name: branchMap.get(d.branch_id) || "—",
        license_no: d.license_no || "—",
        license_classification: d.license_classification || "—",
        license_expiry_date: d.license_expiry_date || "",
      };
    });

    // Format Job Orders (Pendings / Active)
    const pendingStatuses = ["requested", "pending", "approved", "in progress", "in-progress"];
    const joPendings = rawJobOrders
      .filter((jo) => {
        const s = String(jo.status || "").toLowerCase().trim();
        return pendingStatuses.includes(s) || (s !== "completed" && s !== "cancelled" && s !== "rejected");
      })
      .map((jo) => {
        const vPlate =
          typeof jo.vehicle_id === "object" && jo.vehicle_id !== null
            ? jo.vehicle_id.vehicle_plate || jo.vehicle_id.plate_number
            : vehiclePlateMap.get(jo.vehicle_id as number) || "—";
        const vName =
          typeof jo.vehicle_id === "object" && jo.vehicle_id !== null
            ? jo.vehicle_id.name || `${jo.vehicle_id.make || ""} ${jo.vehicle_id.model || ""}`.trim()
            : "";

        return {
          id: jo.id,
          jo_no: jo.jo_no || `JO #${jo.id}`,
          vehicle_plate: vPlate || "—",
          vehicle_name: vName,
          jo_type: jo.jo_type || "Repair",
          priority: jo.priority || "Normal",
          status: jo.status || "Requested",
          target_start_date: jo.target_start_date || jo.created_at || "",
          target_end_date: jo.target_end_date || "",
          total_parts_cost: Number(jo.total_parts_cost || 0),
        };
      });

    // Format Outside Vehicles (Dispatched / On Trip / For Inbound)
    const outsideStatuses = ["for inbound", "on trip", "dispatched", "in transit", "for dispatch"];
    const outsideList = rawDispatchPlans
      .filter((dp) => {
        const s = String(dp.status || "").toLowerCase().trim();
        return outsideStatuses.includes(s);
      })
      .map((dp) => {
        const vPlate = dp.vehicle_id ? vehiclePlateMap.get(dp.vehicle_id) || `Vehicle #${dp.vehicle_id}` : "—";
        const driver = dp.driver_id ? userMap.get(dp.driver_id)?.name || `Driver #${dp.driver_id}` : "Unassigned";
        return {
          id: dp.id,
          doc_no: dp.doc_no || `DP-${dp.id}`,
          vehicle_id: dp.vehicle_id,
          vehicle_plate: vPlate,
          driver_name: driver,
          status: dp.status || "On Trip",
          dispatch_time: dp.time_of_dispatch || "",
          estimated_arrival: dp.estimated_time_of_arrival || "",
          remarks: dp.remarks || "",
        };
      });

    // Aggregated Summary
    const summary = {
      totalVehicles: vehicles.length,
      totalDrivers: drivers.length,
      joPendings: joPendings.length,
      vehiclesOutside: outsideList.length,
    };

    return json({
      summary,
      lists: {
        vehicles,
        drivers,
        jo_pendings: joPendings,
        outside: outsideList,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return json({ error: err.message || "Failed to fetch dashboard data" }, 500);
  }
}
