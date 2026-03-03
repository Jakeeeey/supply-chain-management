// src/components/layout/AppShell/types.ts
import type * as React from "react";

export type AppShellUser = {
    name: string;
    email?: string;
    avatarUrl?: string | null;
};

export type AppNavItem = {
    title: string;
    href?: string;
    iconKey?: string; // serialization-safe
    icon?: never; // guard against passing components
    items?: AppNavItem[];
    badge?: string | number;
    disabled?: boolean;
    external?: boolean;
};

export type BreadcrumbCrumb = {
    title: string;
    href?: string;
};

export type AppShellProps = {
    appName: string;
    systemName: string;
    headerSubtitle?: string; // optional small subtitle under appName, if desired

    navItems: AppNavItem[];

    user?: AppShellUser;
    onLogout?: () => void;

    children: React.ReactNode;

    /**
     * Keep footer optional to preserve "exact reference" UI (reference has no app footer in content area).
     */
    showFooter?: boolean;
};
export type AppFooterProps = {
    appName: string;
    systemName: string;
    versionText?: string;
    leftSlot?: React.ReactNode;
    rightSlot?: React.ReactNode;
    showVersion?: boolean;
};
