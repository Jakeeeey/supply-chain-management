import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubscriptionLimitRecord {
    module_name?: string;
    limit_value?: string | number;
}

interface BranchRecord {
    isBadStock?: number | string | boolean | null;
}

const DIRECTUS_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

function directusHeaders() {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

async function getSubscriptionLimit(): Promise<number> {
    try {
        const companyRes = await fetch(`${DIRECTUS_BASE}/items/company?filter[company_id][_eq]=1`, {
            cache: "no-store",
            headers: directusHeaders(),
        });
        if (!companyRes.ok) {
            console.error("Failed to fetch company subscription", await companyRes.text());
            return -1;
        }
        const companyData = await companyRes.json();
        const company = companyData.data?.[0];
        const subscriptionId = company?.company_subscription;
        if (!subscriptionId) {
            return -1;
        }

        const limitRes = await fetch(
            `${DIRECTUS_BASE}/items/subscription_limits?filter[subscription_id][_eq]=${subscriptionId}`,
            {
                cache: "no-store",
                headers: directusHeaders(),
            }
        );
        if (!limitRes.ok) {
            console.error("Failed to fetch subscription limits", await limitRes.text());
            return -1;
        }
        const limitData = await limitRes.json();
        const limits: SubscriptionLimitRecord[] = limitData.data || [];
        const limitRecord = limits.find(
            (item: SubscriptionLimitRecord) => item.module_name === "branch" || item.module_name === "branch-management"
        );
        if (limitRecord) {
            const val = typeof limitRecord.limit_value === "number"
                ? limitRecord.limit_value
                : parseInt(String(limitRecord.limit_value || ""));
            return isNaN(val) ? -1 : val;
        }
        return -1;
    } catch (err) {
        console.error("Error fetching subscription limit:", err);
        return -1;
    }
}

export async function GET() {
    try {
        const [branchesRes, usersRes, limitValue] = await Promise.all([
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            fetch(`${DIRECTUS_BASE}/items/user?limit=-1`, {
                cache: "no-store",
                headers: directusHeaders(),
            }),
            getSubscriptionLimit()
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
        const branchesList: BranchRecord[] = branchesData.data || [];

        const currentCount = branchesList.filter(
            (b: BranchRecord) => b.isBadStock === 0 || b.isBadStock === "0" || b.isBadStock === false || !b.isBadStock
        ).length;

        const isReached = limitValue !== -1 && currentCount >= limitValue;

        return NextResponse.json({
            branches: branchesList,
            users: usersData.data || [],
            subscriptionLimit: {
                limitValue,
                currentCount,
                isReached
            }
        });
    } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Check subscription limit first
        const [limitValue, branchesRes] = await Promise.all([
            getSubscriptionLimit(),
            fetch(`${DIRECTUS_BASE}/items/branches?limit=-1`, {
                cache: "no-store",
                headers: directusHeaders(),
            })
        ]);

        if (!branchesRes.ok) {
            const errorText = await branchesRes.text();
            return NextResponse.json({ error: "Failed to verify branch limits", details: errorText }, { status: branchesRes.status });
        }

        const branchesData = await branchesRes.json();
        const branchesList: BranchRecord[] = branchesData.data || [];
        const currentCount = branchesList.filter(
            (b: BranchRecord) => b.isBadStock === 0 || b.isBadStock === "0" || b.isBadStock === false || !b.isBadStock
        ).length;

        if (limitValue !== -1 && currentCount >= limitValue) {
            return NextResponse.json(
                {
                    error: "Subscription Limit Reached",
                    details: `You have reached the maximum limit of ${limitValue} registered branches for your company subscription tier.`
                },
                { status: 403 }
            );
        }

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
    } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
        }

        // 1. Fetch current branch to check if it's a "Normal" branch
        const currentRes = await fetch(`${DIRECTUS_BASE}/items/branches/${id}`, {
            headers: directusHeaders(),
        });

        if (!currentRes.ok) {
            const err = await currentRes.text();
            return NextResponse.json({ error: "Failed to fetch current branch", details: err }, { status: currentRes.status });
        }

        const currentData = await currentRes.json();
        const currentBranch = currentData.data;

        // Convert boolean to number for Directus
        if (updateData.isMoving !== undefined) updateData.isMoving = updateData.isMoving ? 1 : 0;
        if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive ? 1 : 0;

        // 2. Update the target branch
        const res = await fetch(`${DIRECTUS_BASE}/items/branches/${id}`, {
            method: "PATCH",
            headers: directusHeaders(),
            body: JSON.stringify(updateData),
        });

        if (!res.ok) {
            const err = await res.text();
            return NextResponse.json({ error: "Failed to update branch", details: err }, { status: res.status });
        }

        // 3. Sync with Bad Stock branch if this is a "Normal" branch
        if (currentBranch.isBadStock == 0) {
            const oldCode = currentBranch.branch_code;
            const badStockCode = `${oldCode}-BS`;

            // Find the Bad Stock branch
            const findBSRes = await fetch(`${DIRECTUS_BASE}/items/branches?filter[branch_code][_eq]=${badStockCode}`, {
                headers: directusHeaders(),
            });

            if (findBSRes.ok) {
                const bsData = await findBSRes.json();
                if (bsData.data && bsData.data.length > 0) {
                    const badStockId = bsData.data[0].id;

                    const bsUpdate: Record<string, unknown> = { ...updateData };
                    if (updateData.branch_name) bsUpdate.branch_name = `${updateData.branch_name} - Bad Stock`;
                    if (updateData.branch_code) bsUpdate.branch_code = `${updateData.branch_code}-BS`;
                    if (updateData.branch_description) bsUpdate.branch_description = `Bad Stock for ${updateData.branch_description}`;

                    await fetch(`${DIRECTUS_BASE}/items/branches/${badStockId}`, {
                        method: "PATCH",
                        headers: directusHeaders(),
                        body: JSON.stringify(bsUpdate),
                    });
                }
            }
        }

        const data = await res.json();
        return NextResponse.json({ success: true, data: data.data });
    } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
        }

        // 1. Fetch current branch to check if it's a "Normal" branch
        const currentRes = await fetch(`${DIRECTUS_BASE}/items/branches/${id}`, {
            headers: directusHeaders(),
        });

        if (!currentRes.ok) {
            const err = await currentRes.text();
            return NextResponse.json({ error: "Failed to fetch current branch", details: err }, { status: currentRes.status });
        }

        const currentData = await currentRes.json();
        const currentBranch = currentData.data;

        // 2. Identify paired Bad Stock branch if deleting a "Normal" branch
        const idsToDelete = [id];
        if (currentBranch.isBadStock == 0) {
            const badStockCode = `${currentBranch.branch_code}-BS`;
            const findBSRes = await fetch(`${DIRECTUS_BASE}/items/branches?filter[branch_code][_eq]=${badStockCode}`, {
                headers: directusHeaders(),
            });
            if (findBSRes.ok) {
                const bsData = await findBSRes.json();
                if (bsData.data && bsData.data.length > 0) {
                    idsToDelete.push(bsData.data[0].id);
                }
            }
        }

        // 3. Delete identified records
        const deleteRes = await fetch(`${DIRECTUS_BASE}/items/branches`, {
            method: "DELETE",
            headers: directusHeaders(),
            body: JSON.stringify(idsToDelete),
        });

        if (!deleteRes.ok) {
            const err = await deleteRes.text();
            return NextResponse.json({ error: "Failed to delete branch(es)", details: err }, { status: deleteRes.status });
        }

        return NextResponse.json({ success: true, message: "Branch(es) deleted successfully" });
    } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
