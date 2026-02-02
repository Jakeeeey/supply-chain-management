// src/components/layout/AppShell/AppHeader.tsx
"use client";

import * as React from "react";
import Link from "next/link";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import type { BreadcrumbCrumb } from "./types";

export default function AppHeader({ breadcrumbs }: { breadcrumbs: BreadcrumbCrumb[] }) {
    // Breadcrumb visual exactly like reference:
    // Trigger, vertical separator, then breadcrumb list
    const lastIndex = breadcrumbs.length - 1;

    return (
        <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />

                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((c, idx) => {
                            const isLast = idx === lastIndex;

                            return (
                                <React.Fragment key={`${c.title}-${idx}`}>
                                    <BreadcrumbItem className={idx === 0 ? "hidden md:block" : undefined}>
                                        {isLast ? (
                                            <BreadcrumbPage>{c.title}</BreadcrumbPage>
                                        ) : c.href ? (
                                            <BreadcrumbLink asChild>
                                                <Link href={c.href}>{c.title}</Link>
                                            </BreadcrumbLink>
                                        ) : (
                                            <BreadcrumbLink href="#">{c.title}</BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>

                                    {!isLast ? <BreadcrumbSeparator className="hidden md:block" /> : null}
                                </React.Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </header>
    );
}
