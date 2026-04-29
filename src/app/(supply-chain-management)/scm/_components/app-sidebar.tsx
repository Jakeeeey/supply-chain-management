import * as React from "react";
import { type ComponentProps } from "react";
import { AppSidebarClient } from "@/components/shared/app-sidebar/app-sidebar-client";
import { getSidebarNavigation } from "@/actions/app-sidebar";
import { Sidebar } from "@/components/ui/sidebar";

export async function AppSidebar(props: ComponentProps<typeof Sidebar>) {
    // 1. Fetch data on the server using the shared action
    const items = await getSidebarNavigation("scm");

    return (
        <AppSidebarClient 
            {...props} 
            initialItems={items} 
            subsystemTitle="Supply Chain Management"
        />
    );
}
