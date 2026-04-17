"use client";

import * as React from "react";
import { type ComponentProps } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Icons from "lucide-react";
import { type LucideIcon } from "lucide-react";

import { NavMain } from "./nav-main";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { NavItem } from "@/types/navigation";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { APP_SIDEBAR_REFRESH_EVENT } from "./app-sidebar-events";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

// Dynamic Icon Resolver moved to client side to handle string-to-component mapping
const getIcon = (name?: string | null): LucideIcon => {
    if (!name) return Icons.Box;
    return (Icons as unknown as Record<string, LucideIcon>)[name] || Icons.Box;
};

interface AppSidebarClientProps extends ComponentProps<typeof Sidebar> {
    initialItems: NavItem[]; // Data from Spring Boot via Server Component
    subsystemTitle?: string; // e.g., "Human Resource Management"
}

export function AppSidebarClient({
    initialItems,
    subsystemTitle = "System Module",
    className,
    ...props
}: AppSidebarClientProps) {
    const [searchTerm, setSearchTerm] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Live Sync: Listen for structure changes and refresh the sidebar
    React.useEffect(() => {
        const handleRefresh = () => {
            router.refresh(); // Tells Next.js to re-fetch the server component
        };
        window.addEventListener(APP_SIDEBAR_REFRESH_EVENT, handleRefresh);
        return () => window.removeEventListener(APP_SIDEBAR_REFRESH_EVENT, handleRefresh);
    }, [router]);

    // Keyboard shortcut for search
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Local Search & Icon Resolution
    const filteredNavMain = React.useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();

        // 1. Map raw server data to NavItem with component icons
        function resolveIcons(items: NavItem[]): NavItem[] {
            return items.map(item => ({
                ...item,
                icon: getIcon(item.iconName),
                items: item.items ? resolveIcons(item.items) : undefined
            }));
        }

        const baseNav = resolveIcons(initialItems);

        if (!searchTerm) return baseNav;

        // 2. Client-side filtering
        function filterTree(items: NavItem[]): NavItem[] {
            return items
                .map((item) => {
                    const titleMatch = item.title.toLowerCase().includes(lowerTerm);
                    const filteredChildren = item.items ? filterTree(item.items) : undefined;
                    const hasChildMatch = !!filteredChildren?.length;

                    if (titleMatch || hasChildMatch) {
                        return { ...item, items: filteredChildren } as NavItem;
                    }
                    return null;
                })
                .filter((item): item is NavItem => item !== null);
        }

        return filterTree(baseNav);
    }, [initialItems, searchTerm]);

    return (
        <Sidebar
            {...props}
            className={cn(
                "border-r border-sidebar-border/60 dark:border-white/20",
                className
            )}
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/main-dashboard">
                                <div className="flex aspect-square size-10 items-center justify-center overflow-hidden">
                                    <Image
                                        src="/vertex_logo_black.png"
                                        alt="VOS Logo"
                                        width={40}
                                        height={40}
                                        className="h-9 w-10 object-contain"
                                        priority
                                    />
                                </div>

                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">VOS Web</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {subsystemTitle}
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <Separator />

            <SidebarContent className="flex flex-col h-full overflow-hidden">
                <div className="sticky top-0 bg-sidebar/95 backdrop-blur-sm z-20 px-4 py-3 pb-2 border-b border-sidebar-border/30">
                    <div className="relative group/search">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 group-focus-within/search:text-primary transition-colors" />
                        <Input
                            ref={inputRef}
                            placeholder="Quick search modules..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={cn(
                                "pl-9 pr-12 h-9 bg-sidebar-accent/50 border-sidebar-border/50 rounded-full transition-all text-sm",
                                "focus-visible:bg-sidebar-accent/80 focus-visible:ring-1 focus-visible:ring-sidebar-ring focus-visible:border-sidebar-border",
                                "placeholder:text-muted-foreground/50 font-medium"
                            )}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {searchTerm ? (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="size-4 text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                                >
                                    <X className="size-full" />
                                </button>
                            ) : (
                                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-sidebar-border bg-sidebar-accent/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                    <span className="text-[12px]">/</span>
                                </kbd>
                            )}
                        </div>
                    </div>
                </div>

                <ScrollArea
                    className={cn(
                        "min-h-0 flex-1",
                        "[&_[data-radix-scroll-area-viewport]>div]:block",
                        "[&_[data-radix-scroll-area-viewport]>div]:w-full",
                        "[&_[data-radix-scroll-area-viewport]>div]:min-w-0"
                    )}
                >
                    <div className="w-full min-w-0 px-2 py-2">
                        <NavMain items={filteredNavMain} searchTerm={searchTerm} />
                    </div>
                </ScrollArea>
            </SidebarContent>

            <SidebarFooter className="p-0">
                <Separator />
                <div className="py-3 text-center text-[10px] font-bold tracking-tighter text-muted-foreground/40">
                    VOS WEB V2.0
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
