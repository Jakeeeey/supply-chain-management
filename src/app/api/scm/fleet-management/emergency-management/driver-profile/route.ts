import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";
import { directusError, directusFetch, fieldsParam } from "../_directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DirectusList<T> = { data?: T[] };
type DirectusSingle<T> = { data?: T };

type UserRow = {
  user_id: number;
  user_fname?: string | null;
  user_mname?: string | null;
  user_lname?: string | null;
  user_contact?: string | null;
  user_email?: string | null;
};

type DriverRow = {
  id: number;
  user_id: number;
  branch_id?: number | null;
  bad_branch_id?: number | null;
};

type DispatchPlanRow = {
  id: number;
  doc_no?: string | null;
  vehicle_id?: number | null;
  driver_id?: number | null;
  status?: string | null;
};

type VehicleRow = {
  vehicle_id: number;
  vehicle_plate?: string | null;
  status?: string | null;
};

async function readJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) throw new Error(`${label}: ${await directusError(res)}`);
  return res.json();
}

function userName(user: UserRow) {
  return [user.user_fname, user.user_mname, user.user_lname]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ");
}

function getCurrentUserId(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  const raw = payload?.sub ?? payload?.user_id ?? payload?.id;
  const userId = Number(raw);
  return Number.isFinite(userId) ? userId : null;
}

export async function GET(request: NextRequest) {
  try {
    let userId = getCurrentUserId(request);

    // Mocking for local development if auth is disabled
    if (!userId && process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
      const driversRes = await directusFetch(`/items/driver?limit=1&fields=user_id`);
      if (driversRes.ok) {
        const driversData = await driversRes.json().catch(() => ({}));
        const firstDriver = driversData?.data?.[0];
        if (firstDriver?.user_id) {
          userId = Number(firstDriver.user_id);
        }
      }
      // If still no driver user ID found, default to a fallback dummy user ID (e.g. 1)
      if (!userId) {
        userId = 1;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user profile
    const userRes = await directusFetch(
      `/items/user/${userId}?fields=${fieldsParam([
        "user_id",
        "user_fname",
        "user_mname",
        "user_lname",
        "user_contact",
        "user_email",
      ])}`
    );

    let user: UserRow | null = null;
    if (userRes.ok) {
      const userData = await readJson<DirectusSingle<UserRow>>(userRes, "Failed to fetch user");
      user = userData.data || null;
    }

    // 2. Fetch driver record
    const driverRes = await directusFetch(
      `/items/driver?filter=${encodeURIComponent(
        JSON.stringify({ user_id: { _eq: userId } })
      )}&limit=1&fields=${fieldsParam(["id", "user_id", "branch_id", "bad_branch_id"])}`
    );

    let driver: DriverRow | null = null;
    if (driverRes.ok) {
      const driverData = await readJson<DirectusList<DriverRow>>(driverRes, "Failed to fetch driver");
      driver = driverData.data?.[0] || null;
    }

    if (!driver) {
      // User is not a driver
      return NextResponse.json({
        isDriver: false,
        user: user ? { ...user, name: userName(user) } : null,
        driver: null,
        activeTrip: null,
      });
    }

    // 3. Find active trip (post_dispatch_plan with status = Dispatched)
    let tripRes = await directusFetch(
      `/items/post_dispatch_plan?filter=${encodeURIComponent(
        JSON.stringify({
          driver_id: { _eq: userId },
          status: { _eq: "Dispatched" },
        })
      )}&sort=-date_encoded&limit=1&fields=${fieldsParam(["id", "doc_no", "vehicle_id", "driver_id", "status"])}`
    );

    let tripData = tripRes.ok ? await readJson<DirectusList<DispatchPlanRow>>(tripRes, "Failed to fetch trip") : { data: [] };
    let trip = tripData.data?.[0] || null;

    // 4. If no Dispatched trip, fall back to their latest trip plan of any status
    if (!trip) {
      tripRes = await directusFetch(
        `/items/post_dispatch_plan?filter=${encodeURIComponent(
          JSON.stringify({
            driver_id: { _eq: userId },
          })
        )}&sort=-date_encoded&limit=1&fields=${fieldsParam(["id", "doc_no", "vehicle_id", "driver_id", "status"])}`
      );
      tripData = tripRes.ok ? await readJson<DirectusList<DispatchPlanRow>>(tripRes, "Failed to fetch backup trip") : { data: [] };
      trip = tripData.data?.[0] || null;
    }

    // 5. If trip has vehicle, fetch vehicle details
    let vehicle: VehicleRow | null = null;
    if (trip && trip.vehicle_id) {
      const vehicleRes = await directusFetch(
        `/items/vehicles/${trip.vehicle_id}?fields=${fieldsParam(["vehicle_id", "vehicle_plate", "status"])}`
      );
      if (vehicleRes.ok) {
        const vehicleData = await readJson<DirectusSingle<VehicleRow>>(vehicleRes, "Failed to fetch vehicle");
        vehicle = vehicleData.data || null;
      }
    }

    return NextResponse.json({
      isDriver: true,
      user: user ? { ...user, name: userName(user) } : null,
      driver,
      activeTrip: trip
        ? {
            id: trip.id,
            doc_no: trip.doc_no || `Dispatch ${trip.id}`,
            status: trip.status || null,
            vehicle_id: trip.vehicle_id ?? null,
            vehicle_plate: vehicle?.vehicle_plate || null,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load driver profile details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
