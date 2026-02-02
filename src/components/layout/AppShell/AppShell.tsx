// src/components/layout/AppShell/AppShell.tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import type { AppShellProps, BreadcrumbCrumb, AppNavItem } from "./types";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";

/** Find the best-matching (deepest) nav item for the current path. */
function findActiveNav(pathname: string, items: AppNavItem[]): AppNavItem | null {
    let best: AppNavItem | null = null;

    const walk = (list: AppNavItem[]) => {
        for (const item of list) {
            if (item.href && (pathname === item.href || pathname.startsWith(item.href + "/"))) {
                if (!best || (best.href?.length ?? 0) < item.href.length) best = item;
            }
            if (item.items?.length) walk(item.items);
        }
    };

    walk(items);
    return best;
}

function buildBreadcrumb(systemName: string, pathname: string, navItems: AppNavItem[]): BreadcrumbCrumb[] {
    const crumbs: BreadcrumbCrumb[] = [{ title: systemName, href: undefined }];

    const active = findActiveNav(pathname, navItems);
    if (active?.title) {
        crumbs.push({ title: active.title, href: active.href });
    } else {
        const seg = pathname.split("/").filter(Boolean).pop() ?? "Page";
        crumbs.push({ title: seg.replace(/-/g, " ") });
    }

    return crumbs;
}

export default function AppShell(props: AppShellProps) {
    const { appName, systemName, headerSubtitle, navItems, user, onLogout, children, showFooter = false } = props;
    const pathname = usePathname() || "/";

    const breadcrumbs = React.useMemo(
        () => buildBreadcrumb(systemName, pathname, navItems),
        [systemName, pathname, navItems]
    );

    return (
        <SidebarProvider>
            <AppSidebar
                appName={appName}
                systemName={systemName}
                subtitle={headerSubtitle}
                pathname={pathname}
                navItems={navItems}
                user={user}
                onLogout={onLogout}
            />

            {/* ✅ Desktop fix: bind the shell to viewport height and prevent document scrolling */}
            <SidebarInset className="h-svh overflow-hidden">
                <AppHeader breadcrumbs={breadcrumbs} />

                {/* ✅ Allow the MAIN content area to scroll (not the whole page) */}
                <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pt-0 overflow-auto">
                    {children}
                    {showFooter ? <AppFooter appName={appName} systemName={systemName} /> : null}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
