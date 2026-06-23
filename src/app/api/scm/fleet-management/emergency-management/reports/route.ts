import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";
import {
  asNullableNumber,
  asNullableString,
  asRequiredString,
  directusError,
  directusFetch,
  fieldsParam,
} from "../_directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_FIELDS = [
  "id",
  "report_no",
  "incident_type",
  "severity",
  "status",
  "vehicle_id",
  "driver_user_id",
  "dispatch_plan_id",
  "reported_by",
  "assigned_to",
  "occurred_at",
  "reported_at",
  "location_name",
  "latitude",
  "longitude",
  "description",
  "immediate_action_taken",
  "contact_name",
  "contact_phone",
  "resolution_notes",
  "resolved_at",
  "cancelled_reason",
  "created_at",
  "updated_at",
] as const;

type DirectusList<T> = { data?: T[] };

type ReportRow = Record<string, unknown> & {
  id: number;
  report_no?: string;
  description?: string | null;
  location_name?: string | null;
  contact_name?: string | null;
  vehicle_id?: number | null;
  driver_user_id?: number | null;
  dispatch_plan_id?: number | null;
};

type VehicleRow = { vehicle_id: number; vehicle_plate?: string | null; status?: string | null };
type UserRow = {
  user_id: number;
  user_fname?: string | null;
  user_mname?: string | null;
  user_lname?: string | null;
  user_contact?: string | null;
};
type DriverRow = { id: number; user_id: number };
type DispatchPlanRow = {
  id: number;
  doc_no?: string | null;
  vehicle_id?: number | null;
  driver_id?: number | null;
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

function reportNo() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  return `ER-${date}-${time}`;
}

async function loadLookupMaps() {
  const [vehiclesRes, driversRes, usersRes, dispatchPlansRes] = await Promise.all([
    directusFetch(`/items/vehicles?limit=-1&fields=${fieldsParam(["vehicle_id", "vehicle_plate", "status"])}`),
    directusFetch(`/items/driver?limit=-1&fields=${fieldsParam(["id", "user_id"])}`),
    directusFetch(
      `/items/user?limit=-1&fields=${fieldsParam(["user_id", "user_fname", "user_mname", "user_lname", "user_contact"])}`
    ),
    directusFetch(
      `/items/post_dispatch_plan?limit=-1&fields=${fieldsParam(["id", "doc_no", "vehicle_id", "driver_id", "status"])}`
    ),
  ]);

  const [vehiclesData, driversData, usersData, dispatchPlansData] = await Promise.all([
    readJson<DirectusList<VehicleRow>>(vehiclesRes, "Failed to fetch vehicles"),
    readJson<DirectusList<DriverRow>>(driversRes, "Failed to fetch drivers"),
    readJson<DirectusList<UserRow>>(usersRes, "Failed to fetch users"),
    readJson<DirectusList<DispatchPlanRow>>(dispatchPlansRes, "Failed to fetch dispatch plans"),
  ]);

  const usersById = new Map((usersData.data || []).map((user) => [String(user.user_id), user]));
  const vehiclesById = new Map(
    (vehiclesData.data || []).map((vehicle) => [
      String(vehicle.vehicle_id),
      {
        vehicle_id: vehicle.vehicle_id,
        vehicle_plate: vehicle.vehicle_plate || `Vehicle ${vehicle.vehicle_id}`,
        status: vehicle.status || null,
      },
    ])
  );
  const driversByUserId = new Map(
    (driversData.data || [])
      .map((driver) => {
        const user = usersById.get(String(driver.user_id));
        if (!user) return null;
        return [
          String(driver.user_id),
          {
            user_id: driver.user_id,
            name: userName(user) || `User ${driver.user_id}`,
            user_contact: user.user_contact || null,
          },
        ] as const;
      })
      .filter((entry): entry is readonly [string, { user_id: number; name: string; user_contact: string | null }] =>
        Boolean(entry)
      )
  );
  const dispatchPlansById = new Map(
    (dispatchPlansData.data || []).map((plan) => [
      String(plan.id),
      {
        id: plan.id,
        doc_no: plan.doc_no || `Dispatch ${plan.id}`,
        vehicle_id: plan.vehicle_id ?? null,
        driver_id: plan.driver_id ?? null,
        status: plan.status || null,
      },
    ])
  );

  return { vehiclesById, driversByUserId, dispatchPlansById };
}

function enrichReport(row: ReportRow, lookups: Awaited<ReturnType<typeof loadLookupMaps>>) {
  return {
    ...row,
    vehicle: row.vehicle_id ? lookups.vehiclesById.get(String(row.vehicle_id)) || null : null,
    driver: row.driver_user_id ? lookups.driversByUserId.get(String(row.driver_user_id)) || null : null,
    dispatchPlan: row.dispatch_plan_id ? lookups.dispatchPlansById.get(String(row.dispatch_plan_id)) || null : null,
  };
}

function matchesSearch(report: ReturnType<typeof enrichReport>, search: string) {
  const haystack = [
    report.report_no,
    report.description,
    report.location_name,
    report.contact_name,
    report.vehicle?.vehicle_plate,
    report.driver?.name,
    report.dispatchPlan?.doc_no,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter: Record<string, unknown> = {};
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const incidentType = searchParams.get("incident_type");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    if (status) filter.status = { _eq: status };
    if (severity) filter.severity = { _eq: severity };
    if (incidentType) filter.incident_type = { _eq: incidentType };
    if (dateFrom || dateTo) {
      filter.occurred_at = {
        ...(dateFrom ? { _gte: dateFrom } : {}),
        ...(dateTo ? { _lte: `${dateTo}T23:59:59` } : {}),
      };
    }

    const query = new URLSearchParams({
      limit: "-1",
      sort: "-reported_at",
      fields: REPORT_FIELDS.join(","),
    });
    if (Object.keys(filter).length) query.set("filter", JSON.stringify(filter));

    const [reportsRes, lookups] = await Promise.all([
      directusFetch(`/items/fleet_emergency_reports?${query.toString()}`),
      loadLookupMaps(),
    ]);
    const reportsData = await readJson<DirectusList<ReportRow>>(reportsRes, "Failed to fetch emergency reports");
    let reports = (reportsData.data || []).map((row) => enrichReport(row, lookups));

    const search = searchParams.get("search")?.trim();
    if (search) reports = reports.filter((report) => matchesSearch(report, search));

    return NextResponse.json({ reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load emergency reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const incidentType = asRequiredString(body.incident_type);
    const severity = asRequiredString(body.severity);
    const occurredAt = asRequiredString(body.occurred_at);
    const description = asRequiredString(body.description);

    if (!incidentType || !severity || !occurredAt || !description) {
      return NextResponse.json(
        { error: "incident_type, severity, occurred_at, and description are required" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const payload = {
      report_no: reportNo(),
      incident_type: incidentType,
      severity,
      status: "reported",
      vehicle_id: asNullableNumber(body.vehicle_id),
      driver_user_id: asNullableNumber(body.driver_user_id),
      dispatch_plan_id: asNullableNumber(body.dispatch_plan_id),
      reported_by: getCurrentUserId(request),
      assigned_to: null,
      occurred_at: occurredAt,
      reported_at: now,
      location_name: asNullableString(body.location_name),
      latitude: asNullableNumber(body.latitude),
      longitude: asNullableNumber(body.longitude),
      description,
      immediate_action_taken: asNullableString(body.immediate_action_taken),
      contact_name: asNullableString(body.contact_name),
      contact_phone: asNullableString(body.contact_phone),
      resolution_notes: null,
      resolved_at: null,
      cancelled_reason: null,
      created_at: now,
      updated_at: now,
    };

    const createRes = await directusFetch(`/items/fleet_emergency_reports`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!createRes.ok) {
      return NextResponse.json(
        { error: "Failed to create emergency report", details: await directusError(createRes) },
        { status: createRes.status }
      );
    }

    const createdData = await createRes.json();
    const lookups = await loadLookupMaps();
    return NextResponse.json({ report: enrichReport(createdData.data, lookups) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create emergency report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
