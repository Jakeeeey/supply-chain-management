"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"
import vosLogo from "@/components/command-center/assets/vos.png"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ModeToggle } from "@/components/theme/ModeToggle"
import { cn } from "@/lib/utils"

const NAV = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/services", label: "Services" },
    { href: "/contact", label: "Contact" },
]

const MOBILE_NAV = [...NAV, { href: "/login", label: "Login" }]

export function Header() {
    const pathname = usePathname()
    const [scrolled, setScrolled] = React.useState(false)

    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <header
            className={cn(
                "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl transition-all duration-500 rounded-[2rem]",
                scrolled
                    ? "bg-white/85 dark:bg-slate-950/70 backdrop-blur-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)] py-2"
                    : "bg-white/20 dark:bg-transparent backdrop-blur-sm dark:backdrop-blur-none border border-slate-200/20 dark:border-transparent py-4"
            )}
        >
            <div className="mx-auto flex items-center gap-4 px-6 md:px-8">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.02] border border-slate-900/5 dark:border-white/5 shadow-xs transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:border-cyan-500/50 overflow-hidden">
                        <Image src={vosLogo} alt="VOS" fill sizes="40px" className="object-contain p-2 dark:invert-0 invert" />
                    </div>
                    <div className="leading-none flex flex-col justify-center">
                        <div className="text-sm font-black tracking-tighter italic uppercase transition-colors text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400">VOS-<span className="text-cyan-600 dark:text-cyan-500">WEB</span></div>
                    </div>
                </Link>

                <div className="flex-1" />

                {/* Desktop nav */}
                <div className="hidden items-center gap-6 md:flex">
                    <NavigationMenu>
                        <NavigationMenuList className="gap-2">
                            {NAV.map((item) => {
                                const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href)

                                return (
                                    <NavigationMenuItem key={item.label} className="relative">
                                        <NavigationMenuLink asChild>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "relative rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all duration-500",
                                                    "hover:text-cyan-600 dark:hover:text-cyan-400 hover:scale-105 active:scale-95",
                                                    active ? "text-cyan-600 dark:text-cyan-400" : "text-slate-500 dark:text-white/60"
                                                )}
                                            >
                                                {item.label}
                                                {active && (
                                                    <motion.div
                                                        layoutId="nav-active"
                                                        className="absolute inset-0 bg-cyan-500/10 rounded-full -z-10"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ duration: 0.5 }}
                                                    />
                                                )}
                                            </Link>
                                        </NavigationMenuLink>
                                    </NavigationMenuItem>
                                )
                            })}
                        </NavigationMenuList>
                    </NavigationMenu>

                    <div className="flex items-center gap-2">
                        <Button asChild className="rounded-full cursor-pointer font-black uppercase tracking-widest text-[10px] px-8 h-10 bg-cyan-500 hover:bg-cyan-400 text-slate-50 dark:text-slate-950 shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 active:scale-95">
                            <Link href="/login">
                                Login
                                <ChevronRight className="ml-1 h-3 w-3 opacity-50" />
                            </Link>
                        </Button>
                        <Separator orientation="vertical" className="h-6 mx-2 bg-slate-900/10 dark:bg-white/10" />
                        <ModeToggle />
                    </div>
                </div>

                {/* Mobile nav */}
                <div className="md:hidden flex items-center gap-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-2xl cursor-pointer h-10 w-10 border-slate-900/10 dark:border-white/10 bg-slate-900/[0.02] dark:bg-white/[0.02]">
                                <Menu className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] rounded-l-[2rem] p-8 border-l-slate-900/10 dark:border-l-white/10 shadow-2xl bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl">
                            <SheetHeader className="text-left mb-8">
                                <SheetTitle className="flex items-center gap-4">
                                    <div className="relative h-10 w-10 rounded-xl bg-slate-900/[0.02] dark:bg-white/[0.02] border border-slate-900/5 dark:border-white/5 flex items-center justify-center p-2">
                                        <Image src={vosLogo} alt="VOS" fill sizes="40px" className="object-contain p-2 dark:invert-0 invert" />
                                    </div>
                                    <span className="font-black tracking-tighter italic uppercase text-lg text-slate-900 dark:text-white">OMNI-<span className="text-cyan-600 dark:text-cyan-500">VOS</span></span>
                                </SheetTitle>
                            </SheetHeader>

                            <div className="flex flex-col gap-3">
                                {MOBILE_NAV.map((item, idx) => {
                                    const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href)

                                    return (
                                        <motion.div
                                            key={item.label}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <Button
                                                asChild
                                                variant={active ? "default" : "ghost"}
                                                className={cn(
                                                    "w-full justify-between rounded-xl h-14 px-6 cursor-pointer font-black uppercase tracking-widest text-[11px]",
                                                    active ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
                                                )}
                                            >
                                                <Link href={item.href}>
                                                    {item.label}
                                                    {active && <ChevronRight className="h-4 w-4 opacity-50" />}
                                                </Link>
                                            </Button>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </SheetContent>
                    </Sheet>
                    <ModeToggle />
                </div>
            </div>
        </header>
    )
}
