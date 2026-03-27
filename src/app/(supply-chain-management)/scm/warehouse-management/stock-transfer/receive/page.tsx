// src/app/(supply-chain-management)/scm/warehouse-management/stock-transfer/receive/page.tsx
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cookies } from "next/headers"
import { getHeaderUserFromToken } from "@/lib/auth-utils"
import { NavUser } from "../../../_components/nav-user"
import StockTransferReceiveModule from "@/modules/supply-chain-management/warehouse-management/stock-transfer/receive/StockTransferReceiveModule"

export default async function Page() {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;
    const headerUser = getHeaderUserFromToken(token);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 bg-background print:hidden">
                <div className="flex items-center gap-2 px-4">
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
                                <BreadcrumbLink href="#">Stock Transfer</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Receive</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="ml-auto px-4">
                    <NavUser user={headerUser} />
                </div>
            </header>

            <ScrollArea className="min-h-0 flex-1">
                <StockTransferReceiveModule />
            </ScrollArea>
        </div>
    )
}
