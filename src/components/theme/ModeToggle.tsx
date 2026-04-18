"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
// import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useThemeTransition } from "@/components/theme/ThemeTransitionOverlay"

export function ModeToggle() {
    const { triggerTransition } = useThemeTransition()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                <Sun className="h-[1.2rem] w-[1.2rem]" />
            </Button>
        )
    }


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl h-9 w-9 cursor-pointer hover:bg-accent/50"
                >
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl min-w-[120px] p-2">
                <DropdownMenuItem
                    onClick={() => triggerTransition("light")}
                    className="rounded-xl gap-2 cursor-pointer py-2 px-3 focus:bg-accent"
                >
                    <Sun className="h-4 w-4" />
                    <span className="font-medium text-sm">Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => triggerTransition("dark")}
                    className="rounded-xl gap-2 cursor-pointer py-2 px-3 focus:bg-accent"
                >
                    <Moon className="h-4 w-4" />
                    <span className="font-medium text-sm">Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => triggerTransition("system")}
                    className="rounded-xl gap-2 cursor-pointer py-2 px-3 focus:bg-accent"
                >
                    <Monitor className="h-4 w-4" />
                    <span className="font-medium text-sm">System</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
