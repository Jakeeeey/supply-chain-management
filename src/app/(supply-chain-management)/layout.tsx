// src/app/(supply-chain-management)/layout.tsx
import * as React from "react"

import { AppSidebar } from "@/app/(supply-chain-management)/scm/_components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
    )
}
