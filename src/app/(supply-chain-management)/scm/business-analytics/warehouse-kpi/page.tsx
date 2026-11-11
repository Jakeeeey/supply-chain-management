import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "@/components/shared/app-sidebar/nav-user";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { cookies } from "next/headers";
import { COOKIE_NAME, decodeJwtPayload } from "@/lib/auth-utils";
import { WarehouseDashboard } from "@/modules/supply-chain-management/business-analytics/warehouse-kpi";

export default async function Page() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const pick = (keys: string[]) => keys.map(key => payload?.[key]).find(value => typeof value === "string" && value.trim()) as string | undefined;
  const email = pick(["email", "Email"]) || "";
  const name = [pick(["FirstName", "Firstname", "firstName", "firstname", "first_name"]), pick(["LastName", "Lastname", "lastName", "lastname", "last_name"])].filter(Boolean).join(" ") || email || "User";
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background shadow-sm sm:h-16">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden px-3 sm:px-4"><SidebarTrigger className="-ml-1 shrink-0" /><Separator orientation="vertical" className="mr-2 hidden data-[orientation=vertical]:h-4 sm:block" /><Breadcrumb className="min-w-0"><BreadcrumbList className="flex-nowrap"><BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/scm">SCM</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator className="hidden md:block" /><BreadcrumbItem className="hidden md:block">Business Analytics</BreadcrumbItem><BreadcrumbSeparator className="hidden md:block" /><BreadcrumbItem className="min-w-0"><BreadcrumbPage className="truncate">Warehouse KPI</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb></div>
      <div className="max-w-[48vw] shrink-0 overflow-hidden px-2 sm:max-w-none sm:px-4"><NavUser user={{ name, email, avatar: "/avatars/shadcn.jpg" }} /></div>
    </header>
    <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6"><WarehouseDashboard /></main>
  </div>;
}
