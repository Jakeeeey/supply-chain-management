import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { cookies } from "next/headers";

import { ReceivingProductsManualModule } from "@/modules/supply-chain-management/supplier-management/purchase-order-receiving-manual";
import type { Metadata } from "next";
import NavUser from "@/components/shared/app-sidebar/nav-user";

export const metadata: Metadata = {
    title: "Receiving Products (Manual)",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return null;

        const p = parts[1];
        const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);

        const json = Buffer.from(padded, "base64").toString("utf8");
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function pickString(obj: Record<string, unknown> | null, keys: string[]): string {
    for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function buildHeaderUserFromToken(token: string | null | undefined) {
    const payload = token ? decodeJwtPayload(token) : null;

    const first = pickString(payload, [
        "Firstname",
        "FirstName",
        "firstName",
        "firstname",
        "first_name",
    ]);
    const last = pickString(payload, [
        "LastName",
        "Lastname",
        "lastName",
        "lastname",
        "last_name",
    ]);
    const email = pickString(payload, ["email", "Email"]);

    const name = [first, last].filter(Boolean).join(" ") || email || "User";

    return {
        name,
        email: email || "",
        avatar: "/avatars/shadcn.jpg",
    };
}

export default async function ReceivingProductsManualPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
    const payload = token ? decodeJwtPayload(token) : null;
    const receiverId = Number(payload?.sub) || undefined;

    const headerUser = buildHeaderUserFromToken(token);

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* ===== Header ===== */}
            <header
                className="
                    sticky top-2 z-50 relative
                    flex h-16 shrink-0 items-center justify-between
                    border-b bg-background shadow-sm
                    before:content-[''] before:absolute before:inset-x-0
                    before:-top-2 before:h-2 before:bg-background
                "
            >
                <div className="flex h-full items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />

                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">
                                    Supplier Management
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>
                                    Receiving Products (Manual)
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex h-full items-center px-4">
                    <NavUser user={headerUser} />
                </div>
            </header>

            {/* ===== Content ===== */}
            <ScrollArea className="min-h-0 flex-1">
                <div className="p-4">
                    <ReceivingProductsManualModule receiverId={receiverId} />
                </div>
            </ScrollArea>
        </div>
    );
}
