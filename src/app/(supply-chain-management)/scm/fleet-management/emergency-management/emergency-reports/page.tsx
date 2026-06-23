import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "@/components/shared/app-sidebar/nav-user";
import EmergencyReportsModule from "@/modules/supply-chain-management/fleet-management/emergency-management/emergency-reports";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickString(obj: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function buildHeaderUserFromToken(token: string | null | undefined) {
  const payload = token ? decodeJwtPayload(token) : null;
  const first = pickString(payload, ["Firstname", "FirstName", "firstName", "firstname", "first_name"]);
  const last = pickString(payload, ["LastName", "Lastname", "lastName", "lastname", "last_name"]);
  const email = pickString(payload, ["email", "Email"]);

  return {
    name: [first, last].filter(Boolean).join(" ") || email || "User",
    email: email || "",
    avatar: "/avatars/shadcn.jpg",
  };
}

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
  const headerUser = buildHeaderUserFromToken(token);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between overflow-hidden border-b bg-background shadow-sm sm:h-16">
        <div className="flex h-full min-w-0 items-center gap-2 overflow-hidden px-3 sm:px-4">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mr-2 hidden shrink-0 sm:block data-[orientation=vertical]:h-4" />
          <div className="min-w-0 overflow-hidden">
            <Breadcrumb>
              <BreadcrumbList className="min-w-0 overflow-hidden">
                <BreadcrumbItem className="hidden shrink-0 md:block">
                  <BreadcrumbLink href="#">Fleet Management</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden shrink-0 md:block" />
                <BreadcrumbItem className="hidden shrink-0 md:block">
                  <BreadcrumbLink href="#">Emergency Management</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden shrink-0 md:block" />
                <BreadcrumbItem className="min-w-0 overflow-hidden">
                  <BreadcrumbPage className="max-w-[56vw] truncate sm:max-w-[60vw] md:max-w-none">
                    Emergency Reports
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        <div className="flex h-full max-w-[48vw] shrink-0 items-center overflow-hidden px-2 sm:max-w-none sm:px-4">
          <NavUser user={headerUser} />
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4">
        <EmergencyReportsModule />
      </main>
    </div>
  );
}
