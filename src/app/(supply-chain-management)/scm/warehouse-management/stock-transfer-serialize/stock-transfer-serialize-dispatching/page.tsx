import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cookies } from "next/headers"
import { NavUser } from "@/components/shared/app-sidebar/nav-user"
import { decodeJwtPayload } from "@/lib/auth-utils"
import DispatchingPage from "@/modules/supply-chain-management/warehouse-management/stock-transfer-serialize/dispatching/DispatchingPage"

export default async function Page() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    const payload = token ? decodeJwtPayload(token) : null;
    
    const headerUser = {
        name: payload ? `${payload.FirstName} ${payload.LastName}`.trim() : "System User",
        email: payload?.email || "user@vos.com",
        avatar: "",
    };

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4 print:hidden">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">Warehouse Management</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="/scm/warehouse-management/stock-transfers/request">Stock Transfer (Serialized)</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Dispatch</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="ml-auto">
                     <NavUser user={headerUser} />
                </div>
            </header>

            <main className="flex-1 min-h-0 w-full overflow-hidden">
                <DispatchingPage />
            </main>
        </div>
    )
}
