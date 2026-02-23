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

export async function GET(req: NextRequest) {
    try {
        const [branchesRes, usersRes] = await Promise.all([
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/user?limit=-1`, {
                cache: "no-store",
                headers: directusHeaders(),
            })
        ]);

        if (!branchesRes.ok) {
            const errorText = await branchesRes.text();
            return NextResponse.json({ error: "Failed to fetch branches", details: errorText }, { status: branchesRes.status });
        }
        if (!usersRes.ok) {
            const errorText = await usersRes.text();
            return NextResponse.json({ error: "Failed to fetch users", details: errorText }, { status: usersRes.status });
        }

        const branchesData = await branchesRes.json();
        const usersData = await usersRes.json();

        return NextResponse.json({
            branches: branchesData.data || [],
            users: usersData.data || []
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            branch_name,
            branch_code,
            branch_description,
            branch_head,
            state_province,
            city,
            brgy,
            phone_number,
            postal_code,
            isMoving,
            isActive,
        } = body;

        const date_added = new Date().toISOString().split("T")[0];

        // First Save: Normal Branch
        const branch1 = {
            branch_name,
            branch_code,
            branch_description,
            branch_head,
            state_province,
            city,
            brgy,
            phone_number,
            postal_code,
            date_added,
            isMoving: isMoving ? 1 : 0,
            isReturn: 0,
            isBadStock: 0,
            isActive: isActive ? 1 : 0,
        };

        // Second Save: Bad Stock Branch
        const branch2 = {
            branch_name: `${branch_name} - Bad Stock`,
            branch_code: `${branch_code}-BS`,
            branch_description: `Bad Stock for ${branch_description}`,
            branch_head,
            state_province,
            city,
            brgy,
            phone_number,
            postal_code,
            date_added,
            isMoving: isMoving ? 1 : 0,
            isReturn: 1,
            isBadStock: 1,
            isActive: isActive ? 1 : 0,
        };

        // Execute saves in sequence (or parallel, but sequence is safer for partial failures)
        const res1 = await fetch(`${DIRECTUS_BASE}/items/branches`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify(branch1),
        });

        if (!res1.ok) {
            const err = await res1.text();
            return NextResponse.json({ error: "Failed to save primary branch", details: err }, { status: 500 });
        }

        const res2 = await fetch(`${DIRECTUS_BASE}/items/branches`, {
            method: "POST",
            headers: directusHeaders(),
            body: JSON.stringify(branch2),
        });

        if (!res2.ok) {
            const err = await res2.text();
            return NextResponse.json({ error: "Failed to save bad stock branch", details: err }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Branch and Bad Stock branch created successfully" });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
}
