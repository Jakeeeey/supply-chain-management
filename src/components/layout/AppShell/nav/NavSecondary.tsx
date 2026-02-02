"use client";

import * as React from "react";
import Link from "next/link";

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function NavSecondary({
                                         items,
                                         iconRegistry,
                                         ...props
                                     }: {
    items: { title: string; href: string; iconKey?: string }[];
    iconRegistry: Record<string, React.ComponentType<{ className?: string }>>;
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => {
                        const Icon = item.iconKey ? iconRegistry[item.iconKey] : undefined;

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild size="sm">
                                    <Link href={item.href}>
                                        {Icon ? <Icon className="size-4" /> : null}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
