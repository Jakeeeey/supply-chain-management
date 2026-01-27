"use client";

import * as React from "react";
import Link from "next/link";
import {
    ChevronsUpDown,
    LogOut,
    Settings,
    User,
    KeyRound,
    ShieldCheck,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";

type NavUserProps = {
    user: {
        name: string;
        email: string;
        avatar?: string;
    };
    onLogout?: () => void;
};

export function NavUser({ user, onLogout }: NavUserProps) {
    const { isMobile } = useSidebar();

    const initials =
        user?.name
            ?.split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("") || "U";

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* ✅ Cursor hand on hover for the whole trigger row */}
                        <SidebarMenuButton size="lg" className="w-full cursor-pointer">
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user.avatar || ""} alt={user.name} />
                                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                            </Avatar>

                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
                            </div>

                            <ChevronsUpDown className="ml-auto size-4 opacity-70" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "bottom"}
                        align="start"
                        sideOffset={8}
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="/profile" className="cursor-pointer">
                                    <User className="mr-2 size-4" />
                                    My Profile
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                                <Link href="/change-password" className="cursor-pointer">
                                    <KeyRound className="mr-2 size-4" />
                                    Change Password
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                                <Link href="/login-activity" className="cursor-pointer">
                                    <ShieldCheck className="mr-2 size-4" />
                                    Login Activity
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                                <Link href="/settings" className="cursor-pointer">
                                    <Settings className="mr-2 size-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                            <button
                                type="button"
                                className="w-full cursor-pointer text-left text-destructive focus:text-destructive"
                                onClick={onLogout}
                            >
                <span className="inline-flex items-center">
                  <LogOut className="mr-2 size-4" />
                  Log out
                </span>
                            </button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

export default NavUser;
