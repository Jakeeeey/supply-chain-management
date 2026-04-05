import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

export async function GET() {
    try {
        const [driversRes, usersRes, branchesRes] = await Promise.all([
            fetch(`${DIRECTUS_BASE}/items/driver?limit=-1`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/user?limit=-1`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1`, {
                cache: "no-store",
                headers: directusHeaders(),
            })
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
            body: JSON.stringify({
                user_id,
                branch_id,
                bad_branch_id: bad_branch_id || null,
            }),
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
            fetch(`${DIRECTUS_BASE}/items/user?filter[user_id][_eq]=${user_id}`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1`, {
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
        const body = await request.json();
        const { id, user_id, branch_id, bad_branch_id } = body;

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
            body: JSON.stringify({
                user_id,
                branch_id,
                bad_branch_id: bad_branch_id || null,
            }),
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
            fetch(`${DIRECTUS_BASE}/items/user?filter[user_id][_eq]=${updatedDriver.user_id}`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1`, {
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
