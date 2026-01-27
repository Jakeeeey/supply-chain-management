// src/app/(supply-chain-management)/scm/_components/nav-main.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"

function normalizePath(p: string) {
    if (!p) return "/"
    if (p !== "/" && p.endsWith("/")) return p.slice(0, -1)
    return p
}

// ✅ Exact-only match (prevents /scm highlighting on /scm/... pages)
function isRouteActiveExact(currentPath: string, targetUrl: string) {
    if (!targetUrl || targetUrl === "#") return false
    const cur = normalizePath(currentPath)
    const tgt = normalizePath(targetUrl)
    return cur === tgt
}

export function NavMain({
                            items,
                        }: {
    items: {
        title: string
        url: string
        icon: LucideIcon
        isActive?: boolean
        items?: { title: string; url: string }[]
    }[]
}) {
    const pathnameRaw = usePathname() || "/"
    const pathname = normalizePath(pathnameRaw)

    // ✅ Persist open state per parent item (so other menus stay open)
    const [openMap, setOpenMap] = React.useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {}
        for (const item of items) {
            const hasChildren = !!item.items?.length
            if (!hasChildren) continue

            const itemActive = isRouteActiveExact(pathname, item.url)
            const anySubActive =
                item.items?.some((sub) => isRouteActiveExact(pathname, sub.url)) ?? false

            // initial open only (does NOT force-close others later)
            initial[item.title] = anySubActive || itemActive || !!item.isActive
        }
        return initial
    })

    // ✅ On navigation, only ensure the active group is OPEN (do not close others)
    React.useEffect(() => {
        setOpenMap((prev) => {
            let changed = false
            const next = { ...prev }

            for (const item of items) {
                if (!item.items?.length) continue
                const anySubActive =
                    item.items.some((sub) => isRouteActiveExact(pathname, sub.url)) ?? false

                if (anySubActive && !next[item.title]) {
                    next[item.title] = true
                    changed = true
                }
            }

            return changed ? next : prev
        })
    }, [pathname, items])

    return (
        <SidebarGroup>
            <SidebarMenu>
                {items.map((item) => {
                    const hasChildren = !!item.items?.length
                    const isClickableLink = item.url !== "#"

                    const itemActive = isRouteActiveExact(pathname, item.url)

                    // Parent highlight ONLY when its own route is active
                    const parentHighlighted = itemActive

                    const isOpen = hasChildren ? !!openMap[item.title] : false

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            open={hasChildren ? isOpen : undefined}
                            onOpenChange={
                                hasChildren
                                    ? (v) => setOpenMap((prev) => ({ ...prev, [item.title]: v }))
                                    : undefined
                            }
                        >
                            <SidebarMenuItem>
                                {hasChildren ? (
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            className={cn(
                                                "cursor-pointer",
                                                parentHighlighted &&
                                                "bg-sidebar-accent text-sidebar-accent-foreground"
                                            )}
                                        >
                                            <item.icon />
                                            <span className="truncate">{item.title}</span>
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                ) : (
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        className={cn(
                                            "cursor-pointer",
                                            itemActive &&
                                            "bg-sidebar-accent text-sidebar-accent-foreground"
                                        )}
                                    >
                                        {isClickableLink ? (
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span className="truncate">{item.title}</span>
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <item.icon />
                                                <span className="truncate">{item.title}</span>
                                            </div>
                                        )}
                                    </SidebarMenuButton>
                                )}

                                {hasChildren ? (
                                    <>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuAction className="cursor-pointer transition-transform data-[state=open]:rotate-90">
                                                <ChevronRight />
                                                <span className="sr-only">Toggle</span>
                                            </SidebarMenuAction>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <SidebarMenuSub className="ml-6 border-l pl-3">
                                                {item.items!.map((subItem) => {
                                                    const subActive = isRouteActiveExact(pathname, subItem.url)

                                                    return (
                                                        <SidebarMenuSubItem key={subItem.title}>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                className={cn(
                                                                    "cursor-pointer",
                                                                    subActive &&
                                                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                                                )}
                                                            >
                                                                {subItem.url === "#" ? (
                                                                    <div>
                                                                        <span className="truncate">{subItem.title}</span>
                                                                    </div>
                                                                ) : (
                                                                    <Link href={subItem.url}>
                                                                        <span className="truncate">{subItem.title}</span>
                                                                    </Link>
                                                                )}
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    )
                                                })}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </>
                                ) : null}
                            </SidebarMenuItem>
                        </Collapsible>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}
