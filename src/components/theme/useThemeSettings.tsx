// src/components/theme/useThemeSettings.ts
"use client";

import * as React from "react";
import type { ThemeSettings } from "./theme-settings";

type Ctx = {
    settings: ThemeSettings;
    setSettings: (next: ThemeSettings) => void;
    updateSettings: (patch: Partial<ThemeSettings>) => void;
    resetSettings: () => void;
};

const ThemeSettingsContext = React.createContext<Ctx | null>(null);

export function ThemeSettingsProviderContext({
                                                 value,
                                                 children,
                                             }: {
    value: Ctx;
    children: React.ReactNode;
}) {
    return <ThemeSettingsContext.Provider value={value}>{children}</ThemeSettingsContext.Provider>;
}

export function useThemeSettings() {
    const ctx = React.useContext(ThemeSettingsContext);
    if (!ctx) throw new Error("useThemeSettings must be used within ThemeSettingsProvider");
    return ctx;
}
