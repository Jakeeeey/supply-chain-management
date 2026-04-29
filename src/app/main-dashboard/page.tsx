import { cookies } from "next/headers";
import { z } from "zod";
import MainDashboardClient from "./_components/main-dashboard-client";

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

    const userFullName = [payload.FirstName, payload.LastName].filter(Boolean).join(" ") || "User";
    const userEmail = payload.email || "";

    return (
        <MainDashboardClient 
            initialSubsystems={subsystems} 
            userFullName={userFullName}
            userEmail={userEmail}
        />
    );
}
