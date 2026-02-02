"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"

function navLinkClass(active: boolean) {
    return [
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
    ].join(" ")
}

// Desktop nav (no duplicate Login link)
const NAV = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/services", label: "Services" },
    { href: "/contact", label: "Contact" },
]

// Mobile menu still includes Login
const MOBILE_NAV = [...NAV, { href: "/login", label: "Login" }]

export function Header() {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card shadow-sm">
                        <span className="text-sm font-semibold">V</span>
                    </div>
                    <div className="leading-tight">
                        <div className="text-sm font-semibold">VOS-WEB</div>
                        <div className="text-xs text-muted-foreground">Corporate Site</div>
                    </div>
                </Link>

                <div className="flex-1" />

                {/* Desktop nav */}
                <div className="hidden items-center gap-3 md:flex">
                    <NavigationMenu>
                        <NavigationMenuList className="gap-1">
                            {NAV.map((item) => {
                                const active =
                                    item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href)

                                return (
                                    <NavigationMenuItem key={item.href}>
                                        <NavigationMenuLink asChild>
                                            <Link href={item.href} className={navLinkClass(!!active)}>
                                                {item.label}
                                            </Link>
                                        </NavigationMenuLink>
                                    </NavigationMenuItem>
                                )
                            })}
                        </NavigationMenuList>
                    </NavigationMenu>

                    <Separator orientation="vertical" className="h-6" />

                    {/* Single desktop login entry */}
                    <Button asChild className="cursor-pointer">
                        <Link href="/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Login
                        </Link>
                    </Button>
                </div>

                {/* Mobile nav */}
                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="cursor-pointer">
                                <Menu className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[320px]">
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <span>Menu</span>
                                    <Badge variant="secondary">VOS</Badge>
                                </SheetTitle>
                            </SheetHeader>

                            <div className="mt-6 flex flex-col gap-2">
                                {MOBILE_NAV.map((item) => {
                                    const active =
                                        item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href)

                                    return (
                                        <Button
                                            key={item.href}
                                            asChild
                                            variant={active ? "default" : "ghost"}
                                            className="w-full justify-start cursor-pointer"
                                        >
                                            <Link href={item.href}>{item.label}</Link>
                                        </Button>
                                    )
                                })}
                            </div>

                            <Separator className="my-6" />

                            <div className="text-xs text-muted-foreground">Built with shadcn/ui • Next.js</div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    )
}
