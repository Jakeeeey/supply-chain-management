import { cookies } from "next/headers";
import { decodeJwtPayload, COOKIE_NAME } from "@/lib/auth-utils";
import { NavItem } from "@/types/navigation";
import { z } from "zod";

/**
 * Zod Schemas derived from SQL DDL
 * Ensures strict contract between Backend and Frontend
 */

const StatusSchema = z.enum(["active", "comingSoon"]);

const DirectusModuleSchema = z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    base_path: z.string().nullable(),
    icon_name: z.string().nullable().default("Folder"),
    status: StatusSchema.nullable().default("active"),
    sort: z.number().nullable(),
    parent_module_id: z.number().nullable(),
    subsystem_id: z.number().nullish(),
});

const SpringModuleSchema = z.object({
    userId: z.number(),
    moduleId: z.number(),
    title: z.string(),
    slug: z.string(),
    iconName: z.string().nullable().optional(),
    basePath: z.string().nullable().optional(),
    parentModuleId: z.number().nullable().optional(),
    sort: z.number().nullable().optional(),
    status: z.string().optional().default("active"), 
    subsystemSlug: z.string(),
});

type DirectusModule = z.infer<typeof DirectusModuleSchema>;
type SpringModule = z.infer<typeof SpringModuleSchema>;

interface TempNavItem extends NavItem {
    moduleId: number;
    parentModuleId: number | null;
    sort?: number | null;
    iconName?: string | null;
    items: TempNavItem[];
}

/**
 * Fetches the sidebar navigation tree for a specific subsystem.
 * Uses a hybrid approach:
 * - Admin: Master List from Directus
 * - User: Authorized List from Spring Boot SQL View
 */
export async function getSidebarNavigation(subsystemSlug: string): Promise<NavItem[]> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;

        if (!token) return [];

        const payload = decodeJwtPayload(token);
        const userId = payload?.id || payload?.user_id || payload?.sub;
        const role = payload?.role; 

        if (!userId) return [];

        let modulesToProcess: TempNavItem[] = [];

        if (role === "ADMIN") {
            const directusBase = process.env.NEXT_PUBLIC_API_BASE_URL;
            const filter = encodeURIComponent(JSON.stringify({ 
                subsystem_id: { slug: { _eq: subsystemSlug } } 
            }));
            const url = `${directusBase?.replace(/\/+$/, "")}/items/modules?filter=${filter}&sort=sort&limit=-1`;
            
            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}` },
                next: { revalidate: 0 } 
            });

            if (res.ok) {
                const jsonResponse = await res.json();
                const validatedData = z.array(DirectusModuleSchema).parse(jsonResponse.data || []);
                
                modulesToProcess = validatedData.map((m: DirectusModule) => ({
                    moduleId: m.id,
                    title: m.title,
                    url: m.base_path || "#",
                    slug: m.slug,
                    status: m.status || "active",
                    iconName: m.icon_name,
                    sort: m.sort,
                    parentModuleId: m.parent_module_id,
                    items: []
                }));
            } else {
                console.error(`[Sidebar] Directus failure: ${res.status}`);
            }
        } else {
            const springBase = process.env.SPRING_API_BASE_URL;
            if (!springBase) return [];
            
            const url = `${springBase.replace(/\/+$/, "")}/api/view-user-authorized-module/all?subsystem_slug=${subsystemSlug}`;
            
            const res = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                next: { revalidate: 0 } 
            });

            if (res.ok) {
                const jsonResponse = await res.json();
                const validatedData = z.array(SpringModuleSchema).parse(jsonResponse || []);
                
                modulesToProcess = validatedData
                    .filter((m: SpringModule) => m.userId === Number(userId) && m.subsystemSlug === subsystemSlug)
                    .map((m: SpringModule) => ({
                        moduleId: m.moduleId,
                        title: m.title,
                        url: m.basePath || "#",
                        slug: m.slug,
                        status: m.status,
                        iconName: m.iconName ?? null,
                        sort: m.sort ?? null,
                        parentModuleId: m.parentModuleId ?? null,
                        items: []
                    }));
            } else {
                console.error(`[Sidebar] Spring Boot failure: ${res.status}`);
            }
        }

        if (modulesToProcess.length === 0) return [];

        const modulesById: Record<number, TempNavItem> = {};
        const roots: TempNavItem[] = [];

        modulesToProcess.forEach((m) => {
            modulesById[m.moduleId] = m;
        });

        modulesToProcess.forEach((m) => {
            if (m.parentModuleId && modulesById[m.parentModuleId]) {
                modulesById[m.parentModuleId].items.push(m);
            } else {
                roots.push(m);
            }
        });

        const sortTree = (items: TempNavItem[]): NavItem[] => {
            return items
                .sort((a, b) => (a.sort || 0) - (b.sort || 0))
                .map((item) => ({
                    title: item.title,
                    url: item.url,
                    slug: item.slug,
                    status: item.status,
                    iconName: item.iconName ?? "Folder", 
                    items: item.items && item.items.length > 0 ? sortTree(item.items) : undefined
                }));
        };

        return sortTree(roots);
    } catch (err) {
        console.error("[Sidebar] Fatal Error:", err);
        return [];
    }
}
