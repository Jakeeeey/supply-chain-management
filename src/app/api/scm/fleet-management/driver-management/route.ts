import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";
const DRIVER_MANAGEMENT_PATH = "/scm/fleet-management/driver-management";
const DRIVER_CONTACT_FIELDS = [
    "contact_phone",
    "contact_email",
    "contact_address",
    "emergency_contact_name",
    "emergency_contact_relationship",
    "emergency_contact_phone",
    "emergency_contact_address",
] as const;
const DRIVER_CONTACT_FIELD_CACHE_TTL_MS = 5 * 60 * 1000;
const DRIVER_BASE_FIELDS = [
    "id",
    "user_id",
    "branch_id",
    "bad_branch_id",
    "created_at",
    "updated_at",
] as const;
const USER_FIELDS = [
    "user_id",
    "user_fname",
    "user_mname",
    "user_lname",
    "user_email",
    "user_contact",
    "user_position",
    "user_department",
] as const;
const BRANCH_FIELDS = [
    "id",
    "branch_name",
    "branch_code",
    "branch_description",
    "branch_head",
    "state_province",
    "city",
    "brgy",
    "phone_number",
    "postal_code",
    "date_added",
    "isMoving",
    "isReturn",
    "isBadStock",
    "isActive",
] as const;

type DriverContactFieldStatus = "supported" | "unsupported" | "unknown";
type AuthResult = { ok: true } | { ok: false; response: NextResponse };

let driverContactFieldsCache: { value: DriverContactFieldStatus; expiresAt: number } | null = null;

class DriverContactFieldError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = "DriverContactFieldError";
    }
}

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

function fieldsParam(fields: readonly string[]) {
    return encodeURIComponent(fields.join(","));
}

function isAdminValue(value: unknown) {
    return value === "ADMIN" || value === true || value === 1 || value === "1";
}

function isTokenExpired(exp: unknown) {
    if (typeof exp !== "number") return false;
    return exp <= Math.floor(Date.now() / 1000);
}

function hasModulePathAccess(rows: unknown) {
    if (!Array.isArray(rows)) return false;

    return rows.some((row) => {
        const moduleRef = (row as { module_id?: { base_path?: unknown } }).module_id;
        const basePath = typeof moduleRef?.base_path === "string" ? moduleRef.base_path.trim().replace(/\/$/, "") : "";
        return basePath === DRIVER_MANAGEMENT_PATH;
    });
}

async function requireDriverManagementAccess(request: NextRequest): Promise<AuthResult> {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
        return { ok: true };
    }

    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const payload = decodeJwtPayload(token);
    if (!payload || isTokenExpired(payload.exp)) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const userId = payload.sub;
    if (!userId) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    if (isAdminValue(payload.role) || isAdminValue(payload.isAdmin)) {
        return { ok: true };
    }

    try {
        const [userRes, modulesRes] = await Promise.all([
            fetch(`${DIRECTUS_BASE}/items/user/${encodeURIComponent(userId)}?fields=role,isAdmin`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(
                `${DIRECTUS_BASE}/items/user_access_modules?filter=${encodeURIComponent(JSON.stringify({ user_id: { _eq: userId } }))}&limit=-1&fields=module_id.base_path`,
                {
                    cache: "no-store",
                    headers: directusHeaders(),
                }
            ),
        ]);

        if (!userRes.ok || !modulesRes.ok) {
            return {
                ok: false,
                response: NextResponse.json({ error: "Unable to verify driver management access" }, { status: 503 }),
            };
        }

        const [userData, modulesData] = await Promise.all([userRes.json(), modulesRes.json()]);
        const directusUser = userData.data || {};
        if (isAdminValue(directusUser.role) || isAdminValue(directusUser.isAdmin)) {
            return { ok: true };
        }

        if (hasModulePathAccess(modulesData.data)) {
            return { ok: true };
        }
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unable to verify driver management access" }, { status: 503 }),
        };
    }

    return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
}

function isInvalidFieldResponse(status: number, text: string) {
    if (status === 400 || status === 422) {
        return /invalid.*field|field.*invalid|unknown.*field|field.*not.*found|field.*does.*not.*exist/i.test(text);
    }

    return false;
}

function nullableString(value: unknown) {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function contactPayload(body: Record<string, unknown>) {
    return {
        contact_phone: nullableString(body.contact_phone),
        contact_email: nullableString(body.contact_email),
        contact_address: nullableString(body.contact_address),
        emergency_contact_name: nullableString(body.emergency_contact_name),
        emergency_contact_relationship: nullableString(body.emergency_contact_relationship),
        emergency_contact_phone: nullableString(body.emergency_contact_phone),
        emergency_contact_address: nullableString(body.emergency_contact_address),
    };
}

async function getDriverContactFieldStatus(): Promise<DriverContactFieldStatus> {
    const now = Date.now();
    if (driverContactFieldsCache && driverContactFieldsCache.expiresAt > now) {
        return driverContactFieldsCache.value;
    }

    let status: DriverContactFieldStatus = "unknown";
    try {
        const fieldsRes = await fetch(`${DIRECTUS_BASE}/fields/driver`, {
            cache: "no-store",
            headers: directusHeaders(),
        });

        if (fieldsRes.ok) {
            const fieldsData = await fieldsRes.json();
            if (Array.isArray(fieldsData.data)) {
                const fields = new Set(
                    fieldsData.data
                        .map((field: { field?: unknown }) => field.field)
                        .filter((field: unknown): field is string => typeof field === "string")
                );
                status = DRIVER_CONTACT_FIELDS.every((field) => fields.has(field)) ? "supported" : "unsupported";
            }
        }
    } catch {
        status = "unknown";
    }

    if (status === "unknown") {
        status = await probeDriverContactFieldsByItemSelect();
    }

    driverContactFieldsCache = {
        value: status,
        expiresAt: now + DRIVER_CONTACT_FIELD_CACHE_TTL_MS,
    };
    return status;
}

async function probeDriverContactFieldsByItemSelect(): Promise<DriverContactFieldStatus> {
    try {
        const probeFields = ["id", ...DRIVER_CONTACT_FIELDS].join(",");
        const probeRes = await fetch(
            `${DIRECTUS_BASE}/items/driver?limit=1&fields=${encodeURIComponent(probeFields)}`,
            {
                cache: "no-store",
                headers: directusHeaders(),
            }
        );

        if (probeRes.ok) {
            return "supported";
        }

        const errorText = await probeRes.text();
        if (isInvalidFieldResponse(probeRes.status, errorText)) {
            return "unsupported";
        }
    } catch {
        return "unknown";
    }

    return "unknown";
}

function hasContactFieldIntent(body: Record<string, unknown>) {
    return DRIVER_CONTACT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(body, field));
}

async function driverPayload(body: Record<string, unknown>) {
    const payload = {
        user_id: body.user_id,
        branch_id: body.branch_id,
        bad_branch_id: body.bad_branch_id || null,
    };

    if (!hasContactFieldIntent(body)) {
        return payload;
    }

    const contactFieldStatus = await getDriverContactFieldStatus();
    if (contactFieldStatus === "supported") {
        return {
            ...payload,
            ...contactPayload(body),
        };
    }

    if (contactFieldStatus === "unsupported") {
        throw new DriverContactFieldError("Driver contact fields are not available in this Directus schema or role yet.", 409);
    }

    throw new DriverContactFieldError("Unable to verify driver contact field support. Please retry.", 503);
}

export async function GET(request: NextRequest) {
    try {
        const auth = await requireDriverManagementAccess(request);
        if (!auth.ok) return auth.response;

        const driverContactFieldStatus = await getDriverContactFieldStatus();
        const driverFields = driverContactFieldStatus === "supported"
            ? [...DRIVER_BASE_FIELDS, ...DRIVER_CONTACT_FIELDS]
            : [...DRIVER_BASE_FIELDS];

        const [driversRes, usersRes, branchesRes] = await Promise.all([
            fetch(`${DIRECTUS_BASE}/items/driver?limit=-1&fields=${fieldsParam(driverFields)}`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/user?limit=-1&fields=${fieldsParam(USER_FIELDS)}`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1&fields=${fieldsParam(BRANCH_FIELDS)}`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
        ]);

        if (!driversRes.ok) {
            const errorText = await driversRes.text();
            return NextResponse.json({ error: "Failed to fetch drivers", details: errorText }, { status: driversRes.status });
        }
        if (!usersRes.ok) {
            const errorText = await usersRes.text();
            return NextResponse.json({ error: "Failed to fetch users", details: errorText }, { status: usersRes.status });
        }
        if (!branchesRes.ok) {
            const errorText = await branchesRes.text();
            return NextResponse.json({ error: "Failed to fetch branches", details: errorText }, { status: branchesRes.status });
        }

        const driversData = await driversRes.json();
        const usersData = await usersRes.json();
        const branchesData = await branchesRes.json();

        const drivers = driversData.data || [];
        const users = usersData.data || [];
        const branches = branchesData.data || [];

        // Map drivers with their related data
        interface DriverRaw {
            user_id: string | number;
            branch_id: string | number;
            bad_branch_id?: string | number;
            [key: string]: unknown;
        }

        const driversWithDetails = (drivers as DriverRaw[]).map((driver) => {
            const user = users.find((u: { user_id: string | number }) => u.user_id === driver.user_id);
            const goodBranch = branches.find((b: { id: string | number }) => b.id === driver.branch_id);
            const badBranch = driver.bad_branch_id
                ? branches.find((b: { id: string | number }) => b.id === driver.bad_branch_id)
                : undefined;

            return {
                ...driver,
                user,
                good_branch: goodBranch,
                bad_branch: badBranch,
            };
        });

        return NextResponse.json({
            drivers: driversWithDetails,
            users,
            branches,
            capabilities: {
                driverContactFields: driverContactFieldStatus === "supported",
            },
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message || "Failed to fetch data" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireDriverManagementAccess(request);
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const { user_id, branch_id, bad_branch_id } = body;

        // Validation
        if (!user_id || !branch_id) {
            return NextResponse.json(
                { error: "user_id and branch_id are required" },
                { status: 400 }
            );
        }

        // Create new driver record
        const createRes = await fetch(`${DIRECTUS_BASE}/items/driver`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify(await driverPayload(body)),
        });

        if (!createRes.ok) {
            const errorText = await createRes.text();
            return NextResponse.json(
                { error: "Failed to create driver", details: errorText },
                { status: createRes.status }
            );
        }

        const createdData = await createRes.json();
        const newDriver = createdData.data;

        // Fetch related data
        const [usersRes, branchesRes] = await Promise.all([
            fetch(`${DIRECTUS_BASE}/items/user?filter[user_id][_eq]=${encodeURIComponent(String(user_id))}&fields=${fieldsParam(USER_FIELDS)}`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1&fields=${fieldsParam(BRANCH_FIELDS)}`, {
                cache: "no-store",
                headers: directusHeaders(),
            })
        ]);

        const usersData = await usersRes.json();
        const branchesData = await branchesRes.json();

        const user = usersData.data?.[0];
        const goodBranch = (branchesData.data as { id: string | number }[])?.find((b) => b.id === branch_id);
        const badBranch = bad_branch_id
            ? (branchesData.data as { id: string | number }[])?.find((b) => b.id === bad_branch_id)
            : null;

        return NextResponse.json({
            ...newDriver,
            user,
            good_branch: goodBranch,
            bad_branch: badBranch,
        });
    } catch (error) {
        if (error instanceof DriverContactFieldError) {
            return NextResponse.json(
                { error: error.message, details: error.message },
                { status: error.status }
            );
        }

        console.error("Error creating driver:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const auth = await requireDriverManagementAccess(request);
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: "id is required" },
                { status: 400 }
            );
        }

        // Update driver
        const updateRes = await fetch(`${DIRECTUS_BASE}/items/driver/${id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify(await driverPayload(body)),
        });

        if (!updateRes.ok) {
            const errorText = await updateRes.text();
            return NextResponse.json(
                { error: "Failed to update driver", details: errorText },
                { status: updateRes.status }
            );
        }

        const updatedData = await updateRes.json();
        const updatedDriver = updatedData.data;

        // Fetch related data
        const [usersRes, branchesRes] = await Promise.all([
            fetch(`${DIRECTUS_BASE}/items/user?filter[user_id][_eq]=${encodeURIComponent(String(updatedDriver.user_id))}&fields=${fieldsParam(USER_FIELDS)}`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1&fields=${fieldsParam(BRANCH_FIELDS)}`, {
                cache: "no-store",
                headers: directusHeaders(),
            })
        ]);

        const usersData = await usersRes.json();
        const branchesData = await branchesRes.json();

        const user = usersData.data?.[0];
        const goodBranch = (branchesData.data as { id: string | number }[])?.find((b) => b.id === updatedDriver.branch_id);
        const badBranch = updatedDriver.bad_branch_id
            ? (branchesData.data as { id: string | number }[])?.find((b) => b.id === updatedDriver.bad_branch_id)
            : null;

        return NextResponse.json({
            ...updatedDriver,
            user,
            good_branch: goodBranch,
            bad_branch: badBranch,
        });
    } catch (error) {
        if (error instanceof DriverContactFieldError) {
            return NextResponse.json(
                { error: error.message, details: error.message },
                { status: error.status }
            );
        }

        console.error("Error updating driver:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const auth = await requireDriverManagementAccess(request);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "id is required" },
                { status: 400 }
            );
        }

        // Delete driver
        const deleteRes = await fetch(`${DIRECTUS_BASE}/items/driver/${id}`, {
            method: "DELETE",
            headers: directusHeaders(),
        });

        if (!deleteRes.ok) {
            const errorText = await deleteRes.text();
            return NextResponse.json(
                { error: "Failed to delete driver", details: errorText },
                { status: deleteRes.status }
            );
        }

        return NextResponse.json({
            message: "Driver deleted successfully",
            id: parseInt(id),
        });
    } catch (error) {
        console.error("Error deleting driver:", error);
        const err = error as Error;
        return NextResponse.json(
            { error: "Internal Server Error", details: err.message },
            { status: 500 }
        );
    }
}
