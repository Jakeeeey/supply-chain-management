import { NextRequest, NextResponse } from 'next/server';
import { GlobalFilterSchema } from '@/modules/supply-chain-management/business-analytics/inventory-performance-dashboard/types';
import { getInventoryPerformanceData } from '@/modules/supply-chain-management/business-analytics/inventory-performance-dashboard/services/inventory-performance';

const COOKIE_NAME = 'vos_access_token';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Extract JWT token from cookie for Spring Boot auth
        const token = req.cookies.get(COOKIE_NAME)?.value;
        console.log(`[IPD Route] Token present: ${!!token}`);

        const filters = {
            dateRange: {
                from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
                to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
            },
            branchId: searchParams.get('branchId') || 'all',
            supplierId: searchParams.get('supplierId') || 'all',
        };

        const validation = GlobalFilterSchema.safeParse(filters);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid filters', details: validation.error.format() },
                { status: 400 },
            );
        }

        const data = await getInventoryPerformanceData(validation.data, token);

        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('[BIA_INVENTORY_PERFORMANCE_ERROR]:', error);
        const err = error as Error;
        // Include more detail in the response for debugging if possible
        return NextResponse.json(
            {
                error: err.message || 'Internal Server Error',
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            },
            { status: 500 },
        );
    }
}
