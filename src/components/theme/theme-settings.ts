// src/components/theme/theme-settings.ts
export type DensityMode = "comfortable" | "compact";

export type AccentKey =
    | "blue"
    | "indigo"
    | "cyan"
    | "emerald"
    | "rose"
    | "amber"
    | "violet";

export type ThemeSettings = {
    accent: AccentKey;
    radiusRem: number; // e.g. 0.75
    density: DensityMode;
};

export const THEME_SETTINGS_STORAGE_KEY = "vos_theme_settings_v1";

// ✅ NEW: event name so same-tab UIs can react instantly
export const THEME_SETTINGS_EVENT = "vos_theme_settings_changed";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
    accent: "blue",
    radiusRem: 0.75,
    density: "comfortable",
};

/**
 * Accent palette expressed as hue + saturation.
 * We generate light/dark lightness values at runtime.
 */
export const ACCENTS: Array<{
    key: AccentKey;
    name: string;
    hue: number;
    sat: number; // %
}> = [
    { key: "blue", name: "Blue", hue: 224, sat: 76 },
    { key: "indigo", name: "Indigo", hue: 231, sat: 72 },
    { key: "violet", name: "Violet", hue: 262, sat: 83 },
    { key: "cyan", name: "Cyan", hue: 199, sat: 89 },
    { key: "emerald", name: "Emerald", hue: 142, sat: 71 },
    { key: "rose", name: "Rose", hue: 346, sat: 77 },
    { key: "amber", name: "Amber", hue: 38, sat: 92 },
];

export function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

export function formatHslTriplet(h: number, s: number, l: number) {
    // matches your token format: "224 76% 48%"
    return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

export function accentTripletsForMode(accent: AccentKey, isDark: boolean) {
    const a = ACCENTS.find((x) => x.key === accent) ?? ACCENTS[0];

    // Tuned for enterprise contrast:
    // - light mode primary ~48% lightness
    // - dark mode primary ~56% lightness
    const lightness = isDark ? 56 : 48;

    // ring should match primary for focus consistency
    const primary = formatHslTriplet(a.hue, a.sat, lightness);
    const ring = primary;

    return { primary, ring };
}

export function safeParseSettings(raw: string | null): ThemeSettings | null {
    if (!raw) return null;
    try {
        const obj = JSON.parse(raw) as Partial<ThemeSettings>;
        const accent = (obj.accent ?? DEFAULT_THEME_SETTINGS.accent) as AccentKey;
        const radiusRem = typeof obj.radiusRem === "number" ? obj.radiusRem : DEFAULT_THEME_SETTINGS.radiusRem;
        const density = (obj.density ?? DEFAULT_THEME_SETTINGS.density) as DensityMode;

        const okAccent = ACCENTS.some((a) => a.key === accent);
        const okDensity = density === "comfortable" || density === "compact";

        if (!okAccent || !okDensity) return null;

        return {
            accent,
            radiusRem: clamp(radiusRem, 0.4, 1.25),
            density,
        };
    } catch {
        return null;
    }
}

export function loadSettingsFromStorage(): ThemeSettings {
    if (typeof window === "undefined") return DEFAULT_THEME_SETTINGS;
    const raw = window.localStorage.getItem(THEME_SETTINGS_STORAGE_KEY);
    return safeParseSettings(raw) ?? DEFAULT_THEME_SETTINGS;
}

export function saveSettingsToStorage(settings: ThemeSettings) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    // ✅ NEW: notify same-tab listeners (storage event won't fire same tab)
    window.dispatchEvent(new CustomEvent(THEME_SETTINGS_EVENT, { detail: settings }));
}
