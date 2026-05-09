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
import { useThemeTransition } from "@/components/theme/ThemeTransitionOverlay";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface UserMenuProps {
    fullName: string;
    email: string;
}

export function UserMenu({ fullName, email }: UserMenuProps) {
    const router = useRouter();
    const { theme } = useTheme();
    const { triggerTransition } = useThemeTransition();

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
                <button className={cn(
                    "flex items-center gap-3 rounded-2xl border transition-all duration-300",
                    "bg-slate-900/5 dark:bg-white/5",
                    "border-slate-900/10 dark:border-white/10",
                    "pl-2.5 pr-4 py-1.5 hover:bg-slate-900/10 dark:hover:bg-white/10",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50 shadow-sm"
                )}>
                    <div className="relative">
                        <Avatar className="h-8 w-8 rounded-full border border-slate-900/10 dark:border-white/10 shadow-sm">
                            <AvatarImage src="" alt={fullName} />
                            <AvatarFallback className="bg-slate-900/5 dark:bg-white/10 text-slate-900 dark:text-white text-[10px] font-black">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        {/* Status Glow Indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="hidden flex-col items-start leading-none sm:flex">
                        <span className="text-[11px] font-black tracking-tight uppercase italic">{fullName}</span>
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 opacity-60 mt-0.5 uppercase tracking-wider">{email.split('@')[0]}</span>
                    </div>

                    <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
                className={cn(
                    "w-60 rounded-2xl border p-1 shadow-2xl backdrop-blur-3xl transition-all",
                    "bg-white/80 dark:bg-slate-950/80",
                    "border-slate-900/10 dark:border-white/10"
                )} 
                align="end" 
                forceMount
            >
                {/* Account Context Header */}
                <div className="px-2 py-2.5 mb-0.5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-9 w-9 shrink-0 rounded-full bg-slate-900/5 dark:bg-white/10 border border-slate-900/10 dark:border-white/10 text-sm font-black italic">
                            {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-black uppercase tracking-tight truncate leading-tight">{fullName}</span>
                            <span className="text-[9px] font-bold text-slate-500 truncate leading-tight">{email}</span>
                            <div className="mt-1 inline-flex items-center gap-1 self-start rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-black text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 uppercase tracking-widest">
                                <div className="h-0.5 w-0.5 rounded-full bg-emerald-500" />
                                Secure Session
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-900/5 dark:bg-white/5 mx-1.5 mb-1" />

                <DropdownMenuGroup>
                    {/* Dark Mode Switch */}
                    <DropdownMenuItem 
                        className="group flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer transition-all hover:bg-slate-900/5 dark:hover:bg-white/5 focus:bg-slate-900/5 dark:focus:bg-white/5"
                        onSelect={(e) => {
                            e.preventDefault();
                            triggerTransition(isDark ? "light" : "dark");
                        }}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-900/5 dark:border-white/10 group-hover:border-cyan-500/30 transition-colors">
                                <Moon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wide">Interface Mode</span>
                        </div>
                        <Switch 
                            checked={isDark} 
                            onCheckedChange={(checked) => triggerTransition(checked ? "dark" : "light")}
                            className="scale-[0.6] data-[state=checked]:bg-cyan-500"
                        />
                    </DropdownMenuItem>
                    
                    {[
                        { icon: User, label: "Profile Blueprint", sub: "Settings" },
                        { icon: Key, label: "Security Access", sub: "Auth" },
                        { icon: Activity, label: "Ops Activity", sub: "Log" },
                        { icon: Settings, label: "System Config", sub: "Prefs" },
                    ].map((item, i) => (
                        <DropdownMenuItem 
                            key={i}
                            className="group flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 cursor-pointer transition-all hover:bg-slate-900/5 dark:hover:bg-white/5 mt-0.5 focus:bg-slate-900/5 dark:focus:bg-white/5"
                        >
                            <div className="p-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-900/5 dark:border-white/10 group-hover:border-slate-900/20 dark:group-hover:border-white/20 transition-colors">
                                <item.icon className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
                                <span className="text-[8px] font-bold text-slate-400 opacity-70 mt-0.5 uppercase tracking-[0.05em]">{item.sub}</span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>

                <div className="h-px bg-slate-900/5 dark:bg-white/5 mx-1.5 my-1" />

                <DropdownMenuItem 
                    onClick={handleLogout}
                    className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 cursor-pointer text-rose-500 transition-all hover:bg-rose-500/5 focus:bg-rose-500/5"
                >
                    <div className="p-1 rounded-lg bg-rose-500/10 border border-rose-500/20 group-hover:border-rose-500/40 transition-colors">
                        <LogOut className="h-3 w-3" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Terminate Session</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
