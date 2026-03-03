// src/components/theme/ThemeToggleButton.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ThemeToggleButton({
                                              variant = "outline",
                                              size = "sm",
                                              className,
                                              transitionMs = 5000,
                                          }: {
    variant?: "default" | "secondary" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    transitionMs?: number;
}) {
    const { theme, setTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    const current = theme === "system" ? systemTheme : theme;
    const isDark = current === "dark";

    const onToggle = () => {
        const root = document.documentElement;

        // add transition class
        root.classList.add("theme-switching");

        // toggle theme
        setTheme(isDark ? "light" : "dark");

        // remove class admitted after transition completes
        window.setTimeout(() => {
            root.classList.remove("theme-switching");
        }, transitionMs);
    };

    if (!mounted) {
        return (
            <Button variant={variant} size={size} className={className} disabled>
                <Sun className="mr-2 h-4 w-4" />
                Theme
            </Button>
        );
    }

    return (
        <Button
            variant={variant}
            size={size}
            className={cn("gap-2", className)}
            onClick={onToggle}
            aria-label="Toggle theme"
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Light mode" : "Dark mode"}
        </Button>
    );
}
