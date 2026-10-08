import { cookies } from "next/headers";
import { z } from "zod";
import MainDashboardClient from "./_components/main-dashboard-client";
import { CompanyMemo, CompanyMemoAttachment, Announcement } from "@/types/announcement";

const COOKIE_NAME = "vos_access_token";

// Strict Payload Schema
const JwtPayloadSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    user_id: z.union([z.number(), z.string() ]).optional(),
    sub: z.union([z.number(), z.string()]).optional(),
    role: z.string().optional(),
    subsystems: z.array(z.string()).optional(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    email: z.string().optional(),
}).passthrough();

type JwtPayload = z.infer<typeof JwtPayloadSchema>;

// Helper to decode JWT without verification
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

// Zod Schemas for Dashboard Registry
const DashboardCategorySchema = z.enum([
    "Operations",
    "Customer & Engagement",
    "Corporate Services",
    "Governance & Assurance",
    "Monitoring & Oversight",
]);
type DashboardCategory = z.infer<typeof DashboardCategorySchema>;

const DashboardStatusSchema = z.enum(["active", "comingSoon"]);
type DashboardStatus = z.infer<typeof DashboardStatusSchema>;

const DashboardSubmoduleSchema = z.object({
    id: z.number(),
    title: z.string(),
    status: DashboardStatusSchema.optional().default("active"),
});

const DashboardModuleSchema = z.object({
    id: z.number(),
    title: z.string(),
    subModules: z.array(DashboardSubmoduleSchema).optional().default([]),
});

const DashboardSubsystemSchema = z.object({
    slug: z.string(),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    base_path: z.string().nullable().optional(),
    status: DashboardStatusSchema,
    category: DashboardCategorySchema.nullable().optional(),
    icon_name: z.string().nullable().optional(),
    tag: z.string().nullable().optional(),
    modules: z.array(DashboardModuleSchema).optional().default([]),
});

// Mapped structure for the client
interface MappedSubsystem {
    id: string;
    title: string;
    subtitle?: string;
    href?: string;
    status: DashboardStatus;
    category: DashboardCategory;
    iconName: string;
    tag?: string;
    accentClass: string;
    submodules: { id: string; title: string; status?: DashboardStatus }[];
}

/**
 * Server Component: Main ERP Dashboard
 */
export default async function ERPMainDashboardPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = decodeJwt(token);
    if (!payload) return null;

    const isAdmin = payload.role === "ADMIN";
    const allowedSubsystems = new Set(payload.subsystems || []);
    const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL;


    let subsystems: MappedSubsystem[] = [];

    try {
        const url = `${directusBase?.replace(/\/+$/, "")}/items/subsystems?fields=*,modules.*,modules.subModules.*&limit=-1`;
        const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}` },
            next: { revalidate: 60 } 
        });

        if (res.ok) {
            const jsonResponse = await res.json();
            const validatedData = z.array(DashboardSubsystemSchema).parse(jsonResponse.data || []);
            
            subsystems = validatedData
                .filter((s) => isAdmin || allowedSubsystems.has(s.slug))
                .map((s): MappedSubsystem => ({
                    id: s.slug,
                    title: s.title,
                    subtitle: s.subtitle || undefined,
                    href: s.base_path || undefined,
                    status: s.status,
                    category: s.category || "Operations",
                    iconName: s.icon_name || "Activity",
                    tag: s.tag || undefined,
                    accentClass: "bg-primary/10 text-primary dark:text-primary-foreground ring-1 ring-primary/20",
                    submodules: s.modules.flatMap((m) => m.subModules.map((sm) => ({
                        id: String(sm.id),
                        title: sm.title,
                        status: sm.status
                    })))
                }));
        }
    } catch (err) {
        console.error("[Dashboard Server] Fetch Error:", err);
    }

    let announcementsData: Announcement[] = [];
    try {
        const directusUrl = directusBase?.replace(/\/+$/, "") || "";
        const targetToken = process.env.DIRECTUS_STATIC_TOKEN || "";
        const user_id = payload?.id || payload?.user_id || payload?.sub;

        let acknowledgedMemoIds: number[] = [];
        if (user_id) {
            const userIdNum = Number(user_id);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const ackFilter = JSON.stringify({
                _and: [
                    { user_id: { _eq: userIdNum } },
                    { acknowledged_at: { _gte: thirtyDaysAgo.toISOString() } }
                ]
            });
            const ackRes = await fetch(`${directusUrl}/items/company_memo_user_acknowledge?filter=${encodeURIComponent(ackFilter)}`, {
                headers: { "Authorization": `Bearer ${targetToken}` },
                next: { revalidate: 0 }
            });
            if (ackRes.ok) {
                const ackJson = await ackRes.json();
                acknowledgedMemoIds = (ackJson.data || []).map((item: { company_memo_id: number }) => item.company_memo_id);
            }
        }

        if (process.env.NODE_ENV === 'development') console.log("[Announcement Debug] Starting direct fetch process from directusBase:", directusUrl);

        // Step 1: Resolve the default company (is_default = 1)
        const defaultCompanyRes = await fetch(
            `${directusUrl}/items/company_list?filter=${encodeURIComponent(JSON.stringify({ is_default: { _eq: 1 } }))}&fields=company_id&limit=1`,
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
        if (process.env.NODE_ENV === 'development') console.log(`[Announcement Debug] Default company_id: ${defaultCompanyId}`);

        // If no default company is configured, show nothing
        if (!defaultCompanyId) {
            if (process.env.NODE_ENV === 'development') console.log("[Announcement Debug] No default company found — skipping memo fetch.");
        } else {
            // Resolve memo IDs linked to this default company
            const linkedMemosRes = await fetch(
                `${directusUrl}/items/company_memo_per_companies?filter=${encodeURIComponent(JSON.stringify({ company_id: { _eq: defaultCompanyId } }))}&fields=company_memo_id&limit=-1`,
                { headers: { "Authorization": `Bearer ${targetToken}` }, next: { revalidate: 0 } }
            );
            
            let linkedMemoIds: number[] = [];
            if (linkedMemosRes.ok) {
                const linkedMemosJson = await linkedMemosRes.json();
                linkedMemoIds = (linkedMemosJson.data || [])
                    .map((item: { company_memo_id: number }) => Number(item.company_memo_id))
                    .filter(Boolean);
            }
            if (process.env.NODE_ENV === 'development') console.log(`[Announcement Debug] Linked memo IDs for default company:`, linkedMemoIds);

            // If no memos are linked to the default company, don't fetch any
            if (linkedMemoIds.length === 0) {
                if (process.env.NODE_ENV === 'development') console.log("[Announcement Debug] No memos linked to default company — skipping memo fetch.");
            } else {
                const memoFilter = JSON.stringify({
                    _and: [
                        { status: { _eq: "Released" } },
                        { id: { _in: linkedMemoIds } },
                        acknowledgedMemoIds.length > 0 ? { id: { _nin: acknowledgedMemoIds } } : {}
                    ]
                });

                const memoUrl = `${directusUrl}/items/company_memo?filter=${encodeURIComponent(memoFilter)}&sort=-id,-created_at&fields=*,from.company_id,from.company_name,from.company_code`;
                if (process.env.NODE_ENV === 'development') console.log(`[Announcement Debug] Fetching memos from URL: ${memoUrl}`);
                const memoRes = await fetch(memoUrl, {
                    headers: { "Authorization": `Bearer ${targetToken}` },
                    next: { revalidate: 0 }
                });

            if (memoRes.ok) {
                const memoJson = await memoRes.json();
                const memos = memoJson.data || [];
                if (process.env.NODE_ENV === 'development') console.log(`[Announcement Debug] Fetched ${memos.length} memos`);

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
                if (process.env.NODE_ENV === 'development') console.log(`[Announcement Debug] Current PHT Date: ${currentDateStr}`);

                const matchingMemos = memos.filter((memo: CompanyMemo) => {
                    const start = memo.start_date?.split("T")[0];
                    const end = memo.end_date?.split("T")[0];
                    const isMatch = !!(start && end && currentDateStr >= start && currentDateStr <= end);
                    if (process.env.NODE_ENV === 'development') console.log(`[Announcement Debug] Comparing memo ID ${memo.id} (Subject: ${memo.subject}): start=${start}, end=${end}, match=${isMatch}`);
                    return isMatch;
                });

                if (matchingMemos.length > 0) {
                    if (process.env.NODE_ENV === 'development') console.log(`[Announcement Debug] Matching memos found count: ${matchingMemos.length}`);

                    const matchingMemoIds = matchingMemos.map((m: CompanyMemo) => m.id);
                    const attachmentFilter = JSON.stringify({
                        company_memo_id: { _in: matchingMemoIds }
                    });
                    const attachmentUrl = `${directusUrl}/items/company_memo_attachments?filter=${encodeURIComponent(attachmentFilter)}`;
                    const attachmentRes = await fetch(attachmentUrl, {
                        headers: { "Authorization": `Bearer ${targetToken}` },
                        next: { revalidate: 0 }
                    });

                    let attachments = [];
                    if (attachmentRes.ok) {
                        const attachmentJson = await attachmentRes.json();
                        attachments = attachmentJson.data || [];
                    }
                    if (process.env.NODE_ENV === 'development') console.log(`[Announcement Debug] Fetched ${attachments.length} total attachments for matching memos`);

                    announcementsData = matchingMemos.map((memo: CompanyMemo & { from?: { company_id: number; company_name?: string; company_code?: string } | number }) => {
                        let issued_by_code: string | undefined;
                        if (memo.from && typeof memo.from === "object") {
                            issued_by_code = memo.from.company_code ?? undefined;
                        }
                        const { from: _from, ...memoRest } = memo;
                        void _from;
                        return {
                            memo: { ...memoRest, issued_by_code } as CompanyMemo,
                            attachments: attachments.filter((att: CompanyMemoAttachment) => att.company_memo_id === memo.id),
                            directusBaseUrl: directusUrl
                        };
                    });
                } else {
                    if (process.env.NODE_ENV === 'development') console.log("[Announcement Debug] No matching memos for current date range");
                }
            } else {
                if (process.env.NODE_ENV === 'development') console.error("[Announcement Debug] Memo fetch failed with status:", memoRes.status, await memoRes.text().catch(() => ""));
            }
        }
    }
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error("[Announcement Debug] Caught exception in fetch process:", err);
    }

    const userFullName = [payload.FirstName, payload.LastName].filter(Boolean).join(" ") || "User";
    const userEmail = payload.email || "";

    return (
        <MainDashboardClient 
            initialSubsystems={subsystems} 
            userFullName={userFullName}
            userEmail={userEmail}
            announcements={announcementsData}
        />
    );
}
