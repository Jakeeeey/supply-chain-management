import { NextRequest, NextResponse } from 'next/server';

const SPRING_API = process.env.SPRING_API_BASE_URL?.replace(/\/$/, '');
const COOKIE_NAME = 'vos_access_token';

function springHeaders(token?: string): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function GET(req: NextRequest) {
    try {
        if (!SPRING_API) {
            return NextResponse.json(
                { error: 'SPRING_API_BASE_URL is not configured' },
                { status: 500 },
            );
        }

        // Extract JWT token from cookie for Spring Boot auth
        const token = req.cookies.get(COOKIE_NAME)?.value;

        // Fetch branches and suppliers in parallel from Spring Boot
        const [branchRes, supplierRes] = await Promise.all([
            fetch(`${SPRING_API}/api/view-branches/all`, {
                headers: springHeaders(token),
                cache: 'no-store',
            }),
            fetch(`${SPRING_API}/api/view-suppliers/all`, {
                headers: springHeaders(token),
                cache: 'no-store',
            }),
        ]);

        if (!branchRes.ok) {
            const errorText = await branchRes.text().catch(() => 'No body');
            console.error(`[BIA Lookups] Branch fetch failed (${branchRes.status}):`, errorText);
        }
        if (!supplierRes.ok) {
            const errorText = await supplierRes.text().catch(() => 'No body');
            console.error(`[BIA Lookups] Supplier fetch failed (${supplierRes.status}):`, errorText);
        }

        const branchJson = branchRes.ok ? await branchRes.json().catch(() => []) : [];
        const supplierJson = supplierRes.ok ? await supplierRes.json().catch(() => []) : [];

        // Normalize Spring Boot response (assuming they have id/name or branch_id/branch_name)
        // Based on typical patterns in this codebase:
        const branches = (Array.isArray(branchJson) ? branchJson : branchJson.data ?? []).map((b: any) => ({
            id: String(b.branch_id || b.id),
            name: String(b.branch_name || b.name),
        }));

        const suppliers = (Array.isArray(supplierJson) ? supplierJson : supplierJson.data ?? []).map((s: any) => ({
            id: String(s.supplier_id || s.id),
            name: String(s.supplier_name || s.name),
        }));

        return NextResponse.json({ branches, suppliers });
    } catch (error: any) {
        console.error('[BIA_LOOKUPS_ERROR]:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 },
        );
    }
}
