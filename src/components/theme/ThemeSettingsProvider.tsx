// src/components/theme/ThemeSettingsProvider.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import {
    DEFAULT_THEME_SETTINGS,
    loadSettingsFromStorage,
    saveSettingsToStorage,
    accentTripletsForMode,
    type ThemeSettings,
} from "./theme-settings";
import { ThemeSettingsProviderContext } from "./useThemeSettings";

function applyDensityClass(density: ThemeSettings["density"]) {
    const root = document.documentElement;
    root.classList.remove("density-compact", "density-comfortable");
    root.classList.add(density === "compact" ? "density-compact" : "density-comfortable");
}

function applyRadius(radiusRem: number) {
    const root = document.documentElement;
    root.style.setProperty("--radius", `${radiusRem}rem`);
}

function applyAccent(accent: ThemeSettings["accent"], isDark: boolean) {
    const root = document.documentElement;
    const { primary, ring } = accentTripletsForMode(accent, isDark);

    // Override theme tokens at runtime (safe subset)
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--ring", ring);

    // Ensure primary foreground is readable for blue (white text)
    root.style.setProperty("--primary-foreground", "0 0% 100%");

    // Sidebar should match primary accent for coherence
    root.style.setProperty("--sidebar-primary", primary);
    root.style.setProperty("--sidebar-ring", ring);
    root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
}

export default function ThemeSettingsProvider({ children }: { children: React.ReactNode }) {
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    const [settings, setSettings] = React.useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);

    React.useEffect(() => {
        setMounted(true);
        setSettings(loadSettingsFromStorage());
    }, []);

    const resolvedTheme = theme === "system" ? systemTheme : theme;
    const isDark = resolvedTheme === "dark";

    React.useEffect(() => {
        if (!mounted) return;

        // Apply immediately
        applyDensityClass(settings.density);
        applyRadius(settings.radiusRem);
        applyAccent(settings.accent, isDark);

        // Persist
        saveSettingsToStorage(settings);
    }, [mounted, settings, isDark]);

    const updateSettings = React.useCallback(
        (patch: Partial<ThemeSettings>) => {
            setSettings((prev) => ({ ...prev, ...patch }));
        },
        []
    );

    const resetSettings = React.useCallback(() => {
        setSettings(DEFAULT_THEME_SETTINGS);
    }, []);

    const ctxValue = React.useMemo(
        () => ({
            settings,
            setSettings,
            updateSettings,
            resetSettings,
        }),
        [settings, updateSettings, resetSettings]
    );

    return <ThemeSettingsProviderContext value={ctxValue}>{children}</ThemeSettingsProviderContext>;
}
