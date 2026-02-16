"use client";

import dynamic from "next/dynamic";

// IMPORTANT: gamitin mo yung EXACT import path na ginagamit ng layout mo ngayon
// Halimbawa common sa shadcn: "./app-sidebar"
const AppSidebar = dynamic(
    () => import("./app-sidebar").then((m: any) => m.AppSidebar ?? m.default),
    { ssr: false }
);

export default function AppSidebarNoSSR() {
    return <AppSidebar />;
}
