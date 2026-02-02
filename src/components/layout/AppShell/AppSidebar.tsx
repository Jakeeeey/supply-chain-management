// src/components/layout/AppShell/AppSidebar.tsx
"use client";

import * as React from "react";

import {
    Command,
    // add whatever icons you use in iconKey mapping below
    LayoutDashboard,
    Boxes,
    Warehouse,
    Truck,
    ClipboardList,
    Users,
    ShoppingCart,
    PackageSearch,
    Settings,
    Receipt,
    HandCoins,
    Landmark,
    FileText,
    Banknote,
    CalendarDays,
    Timer,
    BadgeDollarSign,
    ClipboardCheck,
    BarChart3,
    LineChart,
    PieChart,
    FileSpreadsheet,
    Filter,
    ShieldCheck,
    AlertTriangle,
    FileSearch,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

import type { AppNavItem, AppShellUser } from "./types";
import NavMain from "./nav/NavMain";
import NavUser from "./nav/NavUser";

/**
 * iconKey registry (client side).
 * Keep this in the sidebar/client layer to avoid Server->Client serialization issues.
 */
export const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    LayoutDashboard,
    Boxes,
    Warehouse,
    Truck,
    ClipboardList,
    Users,
    ShoppingCart,
    PackageSearch,
    Settings,
    Receipt,
    HandCoins,
    Landmark,
    FileText,
    Banknote,
    CalendarDays,
    Timer,
    BadgeDollarSign,
    ClipboardCheck,
    BarChart3,
    LineChart,
    PieChart,
    FileSpreadsheet,
    Filter,
    ShieldCheck,
    AlertTriangle,
    FileSearch,
};

export default function AppSidebar(props: {
    appName: string;
    systemName: string;
    subtitle?: string;
    pathname: string;
    navItems: AppNavItem[];
    user?: AppShellUser;
    onLogout?: () => void;
}) {
    const { appName, systemName, subtitle, pathname, navItems, user, onLogout } = props;

    // ✅ Image 1: change fallback user display
    const safeUser = user ?? {
        name: "Jake",
        email: "jake@vertex.com",
        avatarUrl: null,
    };

    return (
        <Sidebar variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <Command className="size-4" />
                                </div>

                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{appName}</span>
                                    <span className="truncate text-xs">{subtitle ?? systemName}</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Platform (main nav) */}
                <NavMain pathname={pathname} items={navItems} iconRegistry={ICONS} />

                {/* Projects REMOVED (per your earlier request) */}
                {/* Support/Feedback REMOVED (per your request) */}
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={safeUser} onLogout={onLogout} />
            </SidebarFooter>
        </Sidebar>
    );
}
