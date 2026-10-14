import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { 
    DealerListItem, 
    DealerSalesmanItem, 
    DealerSalesInvoiceItem, 
    SalesmanRankingEntry, 
    RankingsApiResponse 
} from "@/types/dealerover-salesman-rankings";

const COOKIE_NAME = "vos_access_token";

/**
 * Helper to get default 1-month date range in Asia/Manila (PHT)
 */
function getDefaultDateRange() {
    const now = new Date();
    
    // Manila formatter
    const getPhtDateStr = (d: Date) => {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(d);
        const year = parts.find(p => p.type === "year")?.value;
        const month = parts.find(p => p.type === "month")?.value;
        const day = parts.find(p => p.type === "day")?.value;
        return `${year}-${month}-${day}`;
    };

    const toStr = getPhtDateStr(now);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const fromStr = getPhtDateStr(oneMonthAgo);

    return { from: fromStr, to: toStr };
}

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const defaultRange = getDefaultDateRange();
        const from = searchParams.get("from") || defaultRange.from;
        const to = searchParams.get("to") || defaultRange.to;

        const mainDirectusBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";
        const mainToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        // 1. Fetch dealer_list from main database
        const dealerRes = await fetch(
            `${mainDirectusBase}/items/dealer_list?limit=-1&fields=dealer_id,dealer_name,dealer_code,directus,directus_token,status,is_default`,
            {
                headers: {
                    Authorization: `Bearer ${mainToken}`
                },
                next: { revalidate: 60 }
            }
        );

        if (!dealerRes.ok) {
            console.error("[Dealerover Rankings] Failed to fetch dealer_list:", dealerRes.status, await dealerRes.text().catch(() => ""));
            return NextResponse.json({
                success: false,
                from,
                to,
                totalDealersCount: 0,
                totalSalesmenCount: 0,
                totalRevenue: 0,
                rankings: [],
                error: "Failed to retrieve dealer list"
            }, { status: 500 });
        }

        const dealerJson = await dealerRes.json();
        const allDealers: DealerListItem[] = dealerJson.data || [];

        // 1. Deduplicate dealers by dealer_code / directus host to avoid duplicate queries and inflated sales
        const seenDealers = new Set<string>();
        const validDealers: DealerListItem[] = [];

        for (const d of allDealers) {
            if (!d.directus || !d.directus_token) continue;
            const uniqueKey = `${d.dealer_code || ""}-${d.directus.trim().toLowerCase()}`;
            if (!seenDealers.has(uniqueKey)) {
                seenDealers.add(uniqueKey);
                validDealers.push(d);
            }
        }

        // 2. Query each dealer's directus concurrently with 3.5s timeout and literal timestamps (matching raw DB dates)
        // Literal timestamps without timezone offset so it matches the exact raw date in DB
        const filterFromIso = `${from}T00:00:00`;
        const filterToIso = `${to}T23:59:59`;

        interface DealerResult {
            dealer_id: number;
            dealer_name: string;
            dealer_code: string;
            is_online: boolean;
            is_default: boolean;
            error_message?: string;
            entries: Omit<SalesmanRankingEntry, "rank">[];
        }

        // Helper to safely fetch from a dealer's directus with a short 3.5-second timeout
        const safeDealerFetch = async (url: string, token: string) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3500);
            try {
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                    cache: "no-store",
                });
                return res;
            } finally {
                clearTimeout(timer);
            }
        };

        const dealerPromises = validDealers.map(async (dealer): Promise<DealerResult> => {
            const dealerBase = dealer.directus?.replace(/\/+$/, "");
            const dealerToken = dealer.directus_token;
            const dealerName = dealer.dealer_name || dealer.dealer_code;
            const dealerCode = dealer.dealer_code;
            const isDefault = Number(dealer.is_default) === 1 || dealer.is_default === true;

            if (!dealerBase || !dealerToken) {
                return {
                    dealer_id: dealer.dealer_id,
                    dealer_name: dealerName,
                    dealer_code: dealerCode,
                    is_online: false,
                    is_default: isDefault,
                    error_message: "Missing directus credentials",
                    entries: []
                };
            }

            try {
                // Fetch salesman list and sales_invoices with safe isolated fetch & 3.5s timeout
                const salesmanPromise = safeDealerFetch(
                    `${dealerBase}/items/salesman?limit=-1&fields=id,salesman_code,salesman_name`,
                    dealerToken
                );

                const invoiceFilter = JSON.stringify({
                    _and: [
                        { invoice_date: { _gte: filterFromIso } },
                        { invoice_date: { _lte: filterToIso } },
                        { transaction_status: { _neq: "Cancelled" } }
                    ]
                });
                const invoicePromise = safeDealerFetch(
                    `${dealerBase}/items/sales_invoice?limit=-1&fields=invoice_id,net_amount,salesman_id,invoice_date,transaction_status&filter=${encodeURIComponent(invoiceFilter)}`,
                    dealerToken
                );

                const [salesmanResResult, invoiceResResult] = await Promise.allSettled([salesmanPromise, invoicePromise]);

                if (salesmanResResult.status !== "fulfilled" || invoiceResResult.status !== "fulfilled") {
                    const failureReason = salesmanResResult.status !== "fulfilled" 
                        ? (salesmanResResult.reason?.message || "Salesman endpoint unreachable")
                        : (invoiceResResult.status !== "fulfilled" ? (invoiceResResult.reason?.message || "Invoice endpoint unreachable") : "Unreachable");
                    return {
                        dealer_id: dealer.dealer_id,
                        dealer_name: dealerName,
                        dealer_code: dealerCode,
                        is_online: false,
                        is_default: isDefault,
                        error_message: failureReason,
                        entries: []
                    };
                }

                const salesmanRes = salesmanResResult.value;
                const invoiceRes = invoiceResResult.value;

                if (!salesmanRes.ok || !invoiceRes.ok) {
                    return {
                        dealer_id: dealer.dealer_id,
                        dealer_name: dealerName,
                        dealer_code: dealerCode,
                        is_online: false,
                        is_default: isDefault,
                        error_message: `HTTP Error ${salesmanRes.status || invoiceRes.status}`,
                        entries: []
                    };
                }

                const salesmanJson = await salesmanRes.json().catch(() => ({ data: [] }));
                const invoiceJson = await invoiceRes.json().catch(() => ({ data: [] }));

                const salesmen: DealerSalesmanItem[] = salesmanJson.data || [];
                const invoices: DealerSalesInvoiceItem[] = invoiceJson.data || [];

                // Aggregate sales by salesman
                const statsBySalesman = new Map<number, { totalAmount: number; invoiceCount: number }>();
                invoices.forEach(inv => {
                    if (inv.salesman_id) {
                        const current = statsBySalesman.get(inv.salesman_id) || { totalAmount: 0, invoiceCount: 0 };
                        current.totalAmount += Number(inv.net_amount || 0);
                        current.invoiceCount += 1;
                        statsBySalesman.set(inv.salesman_id, current);
                    }
                });

                // Generate entries for salesmen
                const entries: Omit<SalesmanRankingEntry, "rank">[] = salesmen.map(sm => {
                    const stats = statsBySalesman.get(sm.id) || { totalAmount: 0, invoiceCount: 0 };
                    return {
                        salesman_id: sm.id,
                        salesman_code: sm.salesman_code || "N/A",
                        salesman_name: sm.salesman_name || "Unknown Salesman",
                        dealer_id: dealer.dealer_id,
                        dealer_name: dealerName,
                        dealer_code: dealerCode,
                        total_net_amount: stats.totalAmount,
                        total_invoices: stats.invoiceCount
                    };
                });

                return {
                    dealer_id: dealer.dealer_id,
                    dealer_name: dealerName,
                    dealer_code: dealerCode,
                    is_online: true,
                    is_default: isDefault,
                    entries
                };
            } catch (dealerErr: unknown) {
                const errMsg = dealerErr instanceof Error ? dealerErr.message : "Connection timeout";
                return {
                    dealer_id: dealer.dealer_id,
                    dealer_name: dealerName,
                    dealer_code: dealerCode,
                    is_online: false,
                    is_default: isDefault,
                    error_message: errMsg,
                    entries: []
                };
            }
        });

        const results = await Promise.allSettled(dealerPromises);
        const allEntries: Omit<SalesmanRankingEntry, "rank">[] = [];
        const dealerStatuses: { dealer_id: number; dealer_name: string; dealer_code: string; is_online: boolean; is_default: boolean; error_message?: string }[] = [];

        results.forEach((res, index) => {
            if (res.status === "fulfilled") {
                const item = res.value;
                dealerStatuses.push({
                    dealer_id: item.dealer_id,
                    dealer_name: item.dealer_name,
                    dealer_code: item.dealer_code,
                    is_online: item.is_online,
                    is_default: item.is_default,
                    error_message: item.error_message
                });
                if (item.entries) {
                    allEntries.push(...item.entries);
                }
            } else {
                const fallbackDealer = validDealers[index];
                const isDefault = Number(fallbackDealer?.is_default) === 1 || fallbackDealer?.is_default === true;
                dealerStatuses.push({
                    dealer_id: fallbackDealer?.dealer_id || index,
                    dealer_name: fallbackDealer?.dealer_name || fallbackDealer?.dealer_code || "Unknown",
                    dealer_code: fallbackDealer?.dealer_code || "N/A",
                    is_online: false,
                    is_default: isDefault,
                    error_message: "Request failed"
                });
            }
        });

        // 3. Sort overall by total_net_amount descending
        allEntries.sort((a, b) => b.total_net_amount - a.total_net_amount);

        // 4. Assign ranks with tied ranking support (Dense/Standard competition ranking)
        let currentRank = 1;
        const rankedEntries: SalesmanRankingEntry[] = allEntries.map((entry, index) => {
            if (index > 0 && entry.total_net_amount < allEntries[index - 1].total_net_amount) {
                currentRank = index + 1;
            }
            return {
                ...entry,
                rank: currentRank
            };
        });

        const totalRevenue = rankedEntries.reduce((acc, curr) => acc + curr.total_net_amount, 0);
        const onlineDealersCount = dealerStatuses.filter(d => d.is_online).length;

        const responseData: RankingsApiResponse = {
            success: true,
            from,
            to,
            totalDealersCount: validDealers.length,
            onlineDealersCount,
            totalSalesmenCount: rankedEntries.length,
            totalRevenue,
            dealerStatuses,
            rankings: rankedEntries
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("[Dealerover Rankings API] Unexpected error:", error);
        return NextResponse.json({
            success: false,
            from: "",
            to: "",
            totalDealersCount: 0,
            onlineDealersCount: 0,
            totalSalesmenCount: 0,
            totalRevenue: 0,
            dealerStatuses: [],
            rankings: [],
            error: String(error)
        }, { status: 500 });
    }
}
