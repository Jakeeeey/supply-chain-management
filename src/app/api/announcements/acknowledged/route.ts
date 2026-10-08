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

export async function GET() {
    try {
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
        const userIdNum = Number(user_id);

        // Fetch user's acknowledgment history, sorted by acknowledged_at DESC
        const ackFilter = JSON.stringify({
            user_id: { _eq: userIdNum }
        });
        const ackUrl = `${directusBase}/items/company_memo_user_acknowledge?filter=${encodeURIComponent(ackFilter)}&sort=-acknowledged_at&fields=*,company_memo_id.*`;
        
        console.log(`[Acknowledged API] Fetching history from URL: ${ackUrl}`);
        const ackRes = await fetch(ackUrl, {
            headers: { "Authorization": `Bearer ${targetToken}` },
            next: { revalidate: 0 }
        });

        if (!ackRes.ok) {
            console.error("[Acknowledged API] Acknowledgment fetch failed:", ackRes.status, await ackRes.text().catch(() => ""));
            return NextResponse.json({ announcements: [] });
        }

        const ackJson = await ackRes.json();
        const ackList = ackJson.data || [];

        if (ackList.length === 0) {
            return NextResponse.json({ announcements: [] });
        }

        interface AckItem {
            company_memo_id: CompanyMemo | null;
            acknowledged_at?: string;
        }

        // Gather all company_memo data and memo IDs
        const memoList: CompanyMemo[] = ackList
            .map((item: AckItem) => item.company_memo_id)
            .filter((memo: CompanyMemo | null): memo is CompanyMemo => memo !== null && typeof memo === "object");

        const memoIds = memoList.map((m) => m.id);

        if (memoIds.length === 0) {
            return NextResponse.json({ announcements: [] });
        }

        // Fetch attachments for these memos
        const attachmentFilter = JSON.stringify({
            company_memo_id: { _in: memoIds }
        });
        const attachmentUrl = `${directusBase}/items/company_memo_attachments?filter=${encodeURIComponent(attachmentFilter)}`;
        const attachmentRes = await fetch(attachmentUrl, {
            headers: { "Authorization": `Bearer ${targetToken}` },
            next: { revalidate: 0 }
        });

        let attachments: CompanyMemoAttachment[] = [];
        if (attachmentRes.ok) {
            const attachmentJson = await attachmentRes.json();
            attachments = attachmentJson.data || [];
        }

        // Construct structured Announcements list mapped to historical records
        const announcementsData: Announcement[] = ackList
            .map((item: AckItem) => {
                const memo = item.company_memo_id;
                if (!memo) return null;

                return {
                    memo,
                    attachments: attachments.filter((att) => att.company_memo_id === memo.id),
                    directusBaseUrl: directusBase,
                    acknowledged_at: item.acknowledged_at
                };
            })
            .filter((ann: Announcement | null): ann is Announcement => ann !== null);

        return NextResponse.json({ announcements: announcementsData });
    } catch (err) {
        console.error("[Acknowledged API Error]:", err);
        return NextResponse.json({ announcements: [], error: String(err) }, { status: 500 });
    }
}
