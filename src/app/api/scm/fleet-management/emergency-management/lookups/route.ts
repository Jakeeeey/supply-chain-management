import { NextResponse } from "next/server";
import { directusError, directusFetch, fieldsParam } from "../_directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DirectusList<T> = { data?: T[] };

type VehicleRow = {
  vehicle_id: number;
  vehicle_plate?: string | null;
  status?: string | null;
};

type DriverRow = {
  id: number;
  user_id: number;
};

type UserRow = {
  user_id: number;
  user_fname?: string | null;
  user_mname?: string | null;
  user_lname?: string | null;
  user_contact?: string | null;
};

type DispatchPlanRow = {
  id: number;
  doc_no?: string | null;
  vehicle_id?: number | null;
  driver_id?: number | null;
  status?: string | null;
};

function userName(user: UserRow) {
  return [user.user_fname, user.user_mname, user.user_lname]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ");
}

async function readJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${label}: ${await directusError(res)}`);
  }
  return res.json();
}

export async function GET() {
  try {
    const [vehiclesRes, driversRes, usersRes, dispatchPlansRes] = await Promise.all([
      directusFetch(
        `/items/vehicles?limit=-1&sort=vehicle_plate&fields=${fieldsParam(["vehicle_id", "vehicle_plate", "status"])}`
      ),
      directusFetch(`/items/driver?limit=-1&fields=${fieldsParam(["id", "user_id"])}`),
      directusFetch(
        `/items/user?limit=-1&fields=${fieldsParam([
          "user_id",
          "user_fname",
          "user_mname",
          "user_lname",
          "user_contact",
        ])}`
      ),
      directusFetch(
        `/items/post_dispatch_plan?limit=100&sort=-date_encoded&fields=${fieldsParam([
          "id",
          "doc_no",
          "vehicle_id",
          "driver_id",
          "status",
        ])}`
      ),
    ]);

    const [vehiclesData, driversData, usersData, dispatchPlansData] = await Promise.all([
      readJson<DirectusList<VehicleRow>>(vehiclesRes, "Failed to fetch vehicles"),
      readJson<DirectusList<DriverRow>>(driversRes, "Failed to fetch drivers"),
      readJson<DirectusList<UserRow>>(usersRes, "Failed to fetch users"),
      readJson<DirectusList<DispatchPlanRow>>(dispatchPlansRes, "Failed to fetch dispatch plans"),
    ]);

    const usersById = new Map((usersData.data || []).map((user) => [String(user.user_id), user]));
    const drivers = (driversData.data || [])
      .map((driver) => {
        const user = usersById.get(String(driver.user_id));
        if (!user) return null;
        return {
          user_id: driver.user_id,
          name: userName(user) || `User ${driver.user_id}`,
          user_contact: user.user_contact || null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      vehicles: (vehiclesData.data || []).map((vehicle) => ({
        vehicle_id: vehicle.vehicle_id,
        vehicle_plate: vehicle.vehicle_plate || `Vehicle ${vehicle.vehicle_id}`,
        status: vehicle.status || null,
      })),
      drivers,
      dispatchPlans: (dispatchPlansData.data || []).map((plan) => ({
        id: plan.id,
        doc_no: plan.doc_no || `Dispatch ${plan.id}`,
        vehicle_id: plan.vehicle_id ?? null,
        driver_id: plan.driver_id ?? null,
        status: plan.status || null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load emergency lookups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
