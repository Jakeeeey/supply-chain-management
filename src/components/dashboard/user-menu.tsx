"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
    LogOut,
    User,
    Settings,
    Moon,
    Key,
    Activity,
    ChevronDown,
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";

interface UserMenuProps {
    fullName: string;
    email: string;
}

export function UserMenu({ fullName, email }: UserMenuProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout failed:", error);
            document.cookie = "vos_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
            router.push("/login");
        }
    };

    const isDark = theme === "dark";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl border bg-background px-3 py-1.5 transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-xs">
                    <Avatar className="h-8 w-8 border border-border shadow-xs">
                        <AvatarImage src="" alt={fullName} />
                        <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="hidden flex-col items-start leading-none sm:flex">
                        <span className="text-xs font-bold tracking-tight">{fullName}</span>
                        <span className="text-[10px] text-muted-foreground opacity-70 mt-0.5">{email}</span>
                    </div>

                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl border bg-background p-1.5 shadow-xl" align="end" forceMount>
                <DropdownMenuGroup>
                    {/* Dark Mode Switch */}
                    <DropdownMenuItem 
                        className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer focus:bg-muted/50"
                        onSelect={(e) => {
                            e.preventDefault();
                            setTheme(isDark ? "light" : "dark");
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Moon className="h-4 w-4 opacity-70" />
                            <span className="text-sm font-medium">Dark mode</span>
                        </div>
                        <Switch 
                            checked={isDark} 
                            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                            className="scale-75"
                        />
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer focus:bg-muted/50 mt-0.5">
                        <User className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">My Profile</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer focus:bg-muted/50 mt-0.5">
                        <Key className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">Change Password</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer focus:bg-muted/50 mt-0.5">
                        <Activity className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">Login Activity</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer focus:bg-muted/50 mt-0.5">
                        <Settings className="h-4 w-4 opacity-70" />
                        <span className="text-sm font-medium">Settings</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="my-1.5 mx-1" />

                <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer text-destructive focus:bg-destructive/5 font-medium"
                >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
