// src/app/dashboard/page.tsx
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
import { NavUser } from "../../_components/nav-user"
import ComingSoon from "@/app/(supply-chain-management)/scm/_components/ComingSoon";

const headerUser = {
    name: "Jake Dave M. De Guzman",
    email: "jakedavedeguzman@vertex.com",
    avatar: "/avatars/shadcn.jpg",
}

export default function Page() {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 bg-background">
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
                            <BreadcrumbItem>
                                <BreadcrumbPage>Consolidation</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="ml-auto px-4">
                    <NavUser user={headerUser} />
                </div>
            </header>

            <ScrollArea className="min-h-0 flex-1">
                <ComingSoon />
            </ScrollArea>
        </div>
    )
}
