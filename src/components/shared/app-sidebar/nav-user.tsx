"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
    ChevronsUpDown,
    LogOut,
    Settings,
    User,
    KeyRound,
    ShieldCheck,
    Moon,
    Sun,
} from "lucide-react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

type NavUserProps = {
    user: {
        name: string
        email: string
        avatar?: string
    }
    /**
     * Optional subsystem slug (e.g., "hrm", "scm"). 
     * If not provided, it will be automatically detected from the URL.
     */
    subsystemSlug?: string
    onLogout?: () => void
}

export function NavUser({ user, onLogout, subsystemSlug }: NavUserProps) {
    const { isMobile } = useSidebar()
    const router = useRouter()
    const pathname = usePathname()
    const [loggingOut, setLoggingOut] = React.useState(false)

    const currentSlug = subsystemSlug || pathname.split("/")[1] || "hrm"

    // ✅ theme toggle support
    const { theme, setTheme, systemTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])

    const currentTheme = theme === "system" ? systemTheme : theme
    const isDark = currentTheme === "dark"

    const toggleTheme = React.useCallback(() => {
        // If theme is not resolved yet, default to toggling from light -> dark
        const next = isDark ? "light" : "dark"
        setTheme(next)
    }, [isDark, setTheme])

    const initials =
        user?.name
            ?.split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("") || "U"

    const handleLogout = React.useCallback(async () => {
        if (loggingOut) return
        setLoggingOut(true)

        try {
            // If a parent provided a handler, use it.
            if (onLogout) {
                await Promise.resolve(onLogout())
                return
            }

            // Default wiring: clear HttpOnly cookie via Next route
            await fetch("/api/auth/logout", { method: "POST" })
        } finally {
            // Always redirect to login + refresh UI
            router.replace("/login")
            router.refresh()
            setLoggingOut(false)
        }
    }, [loggingOut, onLogout, router])

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* Cursor pointer for whole trigger row */}
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
                            {/* ✅ NEW: Theme toggle above My Profile */}
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onSelect={(e) => {
                                    // prevent dropdown from closing on click (optional; remove if you want it to close)
                                    e.preventDefault()
                                    toggleTheme()
                                }}
                                disabled={!mounted}
                            >
                                {isDark ? (
                                    <Sun className="mr-2 size-4" />
                                ) : (
                                    <Moon className="mr-2 size-4" />
                                )}
                                {isDark ? "Light mode" : "Dark mode"}
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                                <Link href={`/${currentSlug}/my-profile`} className="cursor-pointer">
                                    <User className="mr-2 size-4" />
                                    My Profile
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                                <Link href={`/${currentSlug}/change-password`} className="cursor-pointer">
                                    <KeyRound className="mr-2 size-4" />
                                    Change Password
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                                <Link href={`/${currentSlug}/login-activity`} className="cursor-pointer">
                                    <ShieldCheck className="mr-2 size-4" />
                                    Login Activity
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                                <Link href={`/${currentSlug}/settings`} className="cursor-pointer">
                                    <Settings className="mr-2 size-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                            <button
                                type="button"
                                className="w-full cursor-pointer text-left text-destructive focus:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={handleLogout}
                                disabled={loggingOut}
                            >
                <span className="inline-flex items-center">
                  <LogOut className="mr-2 size-4" />
                    {loggingOut ? "Logging out..." : "Log out"}
                </span>
                            </button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

export default NavUser
