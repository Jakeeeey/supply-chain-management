import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { CompanyMemo, CompanyMemoAttachment, Announcement } from "@/types/announcement";

const COOKIE_NAME = "vos_access_token";

const JwtPayloadSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    user_id: z.union([z.number(), z.string()]).optional(),
    sub: z.union([z.number(), z.string()]).optional(),
    role: z.string().optional(),
    subsystems: z.array(z.string()).optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    email: z.string().optional(),
}).passthrough();

type JwtPayload = z.infer<typeof JwtPayloadSchema>;

function decodeJwt(token: string): JwtPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        let s = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        const json = Buffer.from(s, "base64").toString("utf8");
        return JwtPayloadSchema.parse(JSON.parse(json));
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const includeAcknowledged = searchParams.get("includeAcknowledged") === "true";

        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ announcements: [] }, { status: 401 });
        }

        const payload = decodeJwt(token);
        if (!payload) {
            return NextResponse.json({ announcements: [] }, { status: 401 });
        }

        const user_id = payload.id || payload.user_id || payload.sub;
        if (!user_id) {
            return NextResponse.json({ announcements: [] }, { status: 400 });
        }

        const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";
        const targetToken = process.env.DIRECTUS_STATIC_TOKEN || "";
        let announcementsData: Announcement[] = [];

        // Fetch user's acknowledged memo IDs if we want to exclude them
        let acknowledgedMemoIds: number[] = [];
        if (!includeAcknowledged) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const ackFilter = JSON.stringify({
                _and: [
                    { user_id: { _eq: user_id } },
                    { acknowledged_at: { _gte: thirtyDaysAgo.toISOString() } }
                ]
            });
            const ackRes = await fetch(`${directusBase}/items/company_memo_user_acknowledge?filter=${encodeURIComponent(ackFilter)}`, {
                headers: { "Authorization": `Bearer ${targetToken}` },
                next: { revalidate: 0 }
            });
            if (ackRes.ok) {
                const ackJson = await ackRes.json();
                acknowledgedMemoIds = (ackJson.data || []).map((item: { company_memo_id: number }) => item.company_memo_id);
            }
        }

        if (process.env.NODE_ENV === 'development') console.log("[Announcement API Debug] Starting direct fetch process from directusBase:", directusBase);

        // Step 1: Resolve the default company (is_default = 1)
        const defaultCompanyRes = await fetch(
            `${directusBase}/items/company_list?filter=${encodeURIComponent(JSON.stringify({ is_default: { _eq: 1 } }))}&fields=company_id&limit=1`,
            { headers: { "Authorization": `Bearer ${targetToken}` }, next: { revalidate: 0 } }
        );
        let defaultCompanyId: number | null = null;
        if (defaultCompanyRes.ok) {
            const defaultCompanyJson = await defaultCompanyRes.json();
            const firstCompany = (defaultCompanyJson.data || [])[0];
            if (firstCompany?.company_id) {
                defaultCompanyId = Number(firstCompany.company_id);
            }
        }
        if (process.env.NODE_ENV === 'development') console.log(`[Announcement API Debug] Default company_id: ${defaultCompanyId}`);

        // If no default company is configured, show nothing
        if (!defaultCompanyId) {
            if (process.env.NODE_ENV === 'development') console.log("[Announcement API Debug] No default company found — skipping memo fetch.");
        } else {
            // Resolve memo IDs linked to this default company
            const linkedMemosRes = await fetch(
                `${directusBase}/items/company_memo_per_companies?filter=${encodeURIComponent(JSON.stringify({ company_id: { _eq: defaultCompanyId } }))}&fields=company_memo_id&limit=-1`,
                { headers: { "Authorization": `Bearer ${targetToken}` }, next: { revalidate: 0 } }
            );

            let linkedMemoIds: number[] = [];
            if (linkedMemosRes.ok) {
                const linkedMemosJson = await linkedMemosRes.json();
                linkedMemoIds = (linkedMemosJson.data || [])
                    .map((item: { company_memo_id: number }) => Number(item.company_memo_id))
                    .filter(Boolean);
            }
            if (process.env.NODE_ENV === 'development') console.log(`[Announcement API Debug] Linked memo IDs for default company:`, linkedMemoIds);

            // If no memos are linked to the default company, don't fetch any
            if (linkedMemoIds.length === 0) {
                if (process.env.NODE_ENV === 'development') console.log("[Announcement API Debug] No memos linked to default company — skipping memo fetch.");
            } else {
                const memoFilter = JSON.stringify({
                    _and: [
                        { status: { _eq: "Released" } },
                        { id: { _in: linkedMemoIds } },
                        acknowledgedMemoIds.length > 0 ? { id: { _nin: acknowledgedMemoIds } } : {}
                    ]
                });

                const memoUrl = `${directusBase}/items/company_memo?filter=${encodeURIComponent(memoFilter)}&sort=-id,-created_at&fields=*,from.company_id,from.company_name,from.company_code`;
                if (process.env.NODE_ENV === 'development') console.log(`[Announcement API Debug] Fetching memos from URL: ${memoUrl}`);
                const memoRes = await fetch(memoUrl, {
                    headers: { "Authorization": `Bearer ${targetToken}` },
                    next: { revalidate: 0 }
                });

            if (memoRes.ok) {
                const memoJson = await memoRes.json();
                const memos = memoJson.data || [];
                if (process.env.NODE_ENV === 'development') console.log(`[Announcement API Debug] Fetched ${memos.length} memos`);

                const parts = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Manila",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).formatToParts(new Date());

                const year = parts.find(p => p.type === 'year')?.value;
                const month = parts.find(p => p.type === 'month')?.value;
                const day = parts.find(p => p.type === 'day')?.value;
                const currentDateStr = `${year}-${month}-${day}`;
                if (process.env.NODE_ENV === 'development') console.log(`[Announcement API Debug] Current PHT Date: ${currentDateStr}`);

                const matchingMemos = memos.filter((memo: CompanyMemo) => {
                    const start = memo.start_date?.split("T")[0];
                    const end = memo.end_date?.split("T")[0];
                    const isMatch = !!(start && end && currentDateStr >= start && currentDateStr <= end);
                    if (process.env.NODE_ENV === 'development') console.log(`[Announcement API Debug] Comparing memo ID ${memo.id} (Subject: ${memo.subject}): start=${start}, end=${end}, match=${isMatch}`);
                    return isMatch;
                });

                if (matchingMemos.length > 0) {
                    if (process.env.NODE_ENV === 'development') console.log(`[Announcement API Debug] Matching memos found count: ${matchingMemos.length}`);

                    const matchingMemoIds = matchingMemos.map((m: CompanyMemo) => m.id);
                    const attachmentFilter = JSON.stringify({
                        company_memo_id: { _in: matchingMemoIds }
                    });
                    const attachmentUrl = `${directusBase}/items/company_memo_attachments?filter=${encodeURIComponent(attachmentFilter)}`;
                    const attachmentRes = await fetch(attachmentUrl, {
                        headers: { "Authorization": `Bearer ${targetToken}` },
                        next: { revalidate: 0 }
                    });

                    let attachments = [];
                    if (attachmentRes.ok) {
                        const attachmentJson = await attachmentRes.json();
                        attachments = attachmentJson.data || [];
                    }
                    if (process.env.NODE_ENV === 'development') console.log(`[Announcement API Debug] Fetched ${attachments.length} total attachments for matching memos`);

                    announcementsData = matchingMemos.map((memo: CompanyMemo & { from?: { company_id: number; company_name?: string; company_code?: string } | number }) => {
                        // Resolve from (FK to company_list) into a readable company code
                        let issued_by_code: string | undefined;
                        if (memo.from && typeof memo.from === "object") {
                            issued_by_code = memo.from.company_code ?? undefined;
                        }
                        const { from: _from, ...memoRest } = memo;
                        void _from;
                        return {
                            memo: { ...memoRest, issued_by_code } as CompanyMemo,
                            attachments: attachments.filter((att: CompanyMemoAttachment) => att.company_memo_id === memo.id),
                            directusBaseUrl: directusBase
                        };
                    });
                } else {
                    if (process.env.NODE_ENV === 'development') console.log("[Announcement API Debug] No matching memos for current date range");
                }
            } else {
                if (process.env.NODE_ENV === 'development') console.error("[Announcement API Debug] Memo fetch failed with status:", memoRes.status, await memoRes.text().catch(() => ""));
            }
        }
    }

        return NextResponse.json({ announcements: announcementsData });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error("[Announcement API Debug] Caught exception in fetch process:", err);
        return NextResponse.json({ announcements: [], error: String(err) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = decodeJwt(token);
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user_id = payload.id || payload.user_id || payload.sub;
        if (!user_id) {
            return NextResponse.json({ error: "User ID not found in token" }, { status: 400 });
        }

        const body = await req.json();
        const { memoIds } = body;

        if (!Array.isArray(memoIds) || memoIds.length === 0) {
            return NextResponse.json({ error: "Invalid memo IDs" }, { status: 400 });
        }

        const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";
        const targetToken = process.env.DIRECTUS_STATIC_TOKEN || "";

        // Calculate direct PHT local time (YYYY-MM-DD HH:mm:ss) with no Z or offset suffixes
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }).formatToParts(new Date());

        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        const hour = parts.find(p => p.type === 'hour')?.value;
        const minute = parts.find(p => p.type === 'minute')?.value;
        const second = parts.find(p => p.type === 'second')?.value;
        const phtDateTimeStr = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
        const userIdNum = Number(user_id);

        const promises = memoIds.map(async (memoId: number) => {
            const memoIdNum = Number(memoId);

            // First check if already exists to avoid unique constraint violations
            const checkUrl = `${directusBase}/items/company_memo_user_acknowledge?filter=${encodeURIComponent(
                JSON.stringify({
                    _and: [
                        { company_memo_id: { _eq: memoIdNum } },
                        { user_id: { _eq: userIdNum } }
                    ]
                })
            )}`;
            const checkRes = await fetch(checkUrl, {
                headers: { "Authorization": `Bearer ${targetToken}` },
                next: { revalidate: 0 }
            });
            if (checkRes.ok) {
                const checkJson = await checkRes.json();
                if (checkJson.data && checkJson.data.length > 0) {
                    return; // Already acknowledged
                }
            }

            await fetch(`${directusBase}/items/company_memo_user_acknowledge`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${targetToken}`
                },
                body: JSON.stringify({
                    company_memo_id: memoIdNum,
                    user_id: userIdNum,
                    acknowledged_at: phtDateTimeStr
                })
            });
        });

        await Promise.all(promises);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Announcement API POST Error]:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
