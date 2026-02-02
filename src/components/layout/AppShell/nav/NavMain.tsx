"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import type { AppNavItem } from "../types";

function isActive(pathname: string, href?: string) {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + "/");
}

function hasActiveChild(pathname: string, item: AppNavItem): boolean {
    if (isActive(pathname, item.href)) return true;
    if (!item.items?.length) return false;
    return item.items.some((c) => hasActiveChild(pathname, c));
}

function CollapsibleNavItem({
                                item,
                                pathname,
                                Icon,
                            }: {
    item: AppNavItem;
    pathname: string;
    Icon?: React.ComponentType<{ className?: string }>;
}) {
    const active = isActive(pathname, item.href);
    const openByDefault = hasActiveChild(pathname, item);

    // ✅ Hooks are now in a real component (no hooks inside .map())
    const [open, setOpen] = React.useState<boolean>(openByDefault);

    // ✅ If route changes and a child becomes active, auto-open the group
    React.useEffect(() => {
        const shouldOpen = hasActiveChild(pathname, item);
        setOpen(shouldOpen);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className={cn(active && "font-medium", "min-w-0")}>
                        {Icon ? <Icon className="size-4 shrink-0" /> : null}

                        {/* ✅ Title is the truncating element */}
                        <span className="flex-1 min-w-0 truncate">{item.title}</span>

                        {/* ✅ Use DIV so sidebar.tsx's [&>span:last-child]:truncate does NOT affect chevron */}
                        <div className="ml-auto shrink-0 inline-flex items-center justify-center">
                            {open ? (
                                <ChevronDown className="size-4" />
                            ) : (
                                <ChevronRight className="size-4" />
                            )}
                        </div>
                    </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <SidebarMenuSub>
                        {item.items?.map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton asChild>
                                    {sub.href ? (
                                        <Link
                                            href={sub.href}
                                            className={cn(
                                                "min-w-0",
                                                isActive(pathname, sub.href) && "font-medium"
                                            )}
                                        >
                                            <span className="block min-w-0 truncate">{sub.title}</span>
                                        </Link>
                                    ) : (
                                        <span className="block min-w-0 truncate">{sub.title}</span>
                                    )}
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

function LeafNavItem({
                         item,
                         pathname,
                         Icon,
                     }: {
    item: AppNavItem;
    pathname: string;
    Icon?: React.ComponentType<{ className?: string }>;
}) {
    const active = isActive(pathname, item.href);

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={item.title} className={cn(active && "font-medium", "min-w-0")}>
                {item.href ? (
                    <Link href={item.href} className="flex min-w-0 items-center gap-2">
                        {Icon ? <Icon className="size-4 shrink-0" /> : null}
                        <span className="flex-1 min-w-0 truncate">{item.title}</span>
                    </Link>
                ) : (
                    <span className="flex min-w-0 items-center gap-2">
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
                        <span className="flex-1 min-w-0 truncate">{item.title}</span>
          </span>
                )}
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

export default function NavMain({
                                    items,
                                    pathname,
                                    iconRegistry,
                                }: {
    items: AppNavItem[];
    pathname: string;
    iconRegistry: Record<string, React.ComponentType<{ className?: string }>>;
}) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>

            <SidebarMenu>
                {items.map((item) => {
                    const Icon = item.iconKey ? iconRegistry[item.iconKey] : undefined;

                    // Group item (has children)
                    if (item.items?.length) {
                        return <CollapsibleNavItem key={item.title} item={item} pathname={pathname} Icon={Icon} />;
                    }

                    // Single item (no children)
                    return <LeafNavItem key={item.title} item={item} pathname={pathname} Icon={Icon} />;
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
