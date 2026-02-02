// src/app/settings/settings-appearance.tsx
"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { ACCENTS, DEFAULT_THEME_SETTINGS, clamp } from "@/components/theme/theme-settings";
import { useThemeSettings } from "@/components/theme/useThemeSettings";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

function AccentSwatch({ hsl }: { hsl: string }) {
    return (
        <span
            className="inline-flex h-4 w-4 rounded-full border"
            style={{ backgroundColor: `hsl(${hsl})` }}
            aria-hidden="true"
        />
    );
}

export function SettingsAppearance() {
    const { theme, setTheme } = useTheme();
    const { settings, updateSettings, resetSettings } = useThemeSettings();

    // For preview swatches we want a light-mode triplet; good enough for settings UI.
    const previewTripletByAccent = React.useMemo(() => {
        return new Map(
            ACCENTS.map((a) => [a.key, `${a.hue} ${a.sat}% 48%`])
        );
    }, []);

    const radiusPx = Math.round(settings.radiusRem * 16);

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
            <div className="mb-4">
                <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">Personalize your appearance and UI density.</p>
            </div>

            <div className="grid gap-4">
                {/* Theme mode */}
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>Choose theme mode, accent color, radius, and density.</CardDescription>
                    </CardHeader>

                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label>Theme mode</Label>
                            <ToggleGroup
                                type="single"
                                value={theme ?? "system"}
                                onValueChange={(v) => {
                                    if (!v) return;
                                    setTheme(v);
                                }}
                                className="justify-start"
                            >
                                <ToggleGroupItem value="light" className="gap-2">
                                    <Sun className="h-4 w-4" /> Light
                                </ToggleGroupItem>
                                <ToggleGroupItem value="dark" className="gap-2">
                                    <Moon className="h-4 w-4" /> Dark
                                </ToggleGroupItem>
                                <ToggleGroupItem value="system" className="gap-2">
                                    <Monitor className="h-4 w-4" /> System
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        <Separator />

                        {/* Accent */}
                        <div className="grid gap-3">
                            <Label>Accent color (Primary)</Label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {ACCENTS.map((a) => {
                                    const triplet = previewTripletByAccent.get(a.key) ?? "224 76% 48%";
                                    const active = settings.accent === a.key;

                                    return (
                                        <button
                                            key={a.key}
                                            type="button"
                                            onClick={() => updateSettings({ accent: a.key })}
                                            className={cn(
                                                "flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-left text-sm transition",
                                                "hover:bg-accent/60",
                                                active && "ring-2 ring-ring"
                                            )}
                                        >
                      <span className="inline-flex items-center gap-2">
                        <AccentSwatch hsl={triplet} />
                          {a.name}
                      </span>
                                            {active ? <Check className="h-4 w-4 text-primary" /> : null}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This controls Primary buttons, focus rings, and sidebar primary accents.
                            </p>
                        </div>

                        <Separator />

                        {/* Radius */}
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between gap-4">
                                <Label>Corner radius</Label>
                                <span className="text-xs text-muted-foreground">{radiusPx}px</span>
                            </div>

                            <Slider
                                value={[settings.radiusRem]}
                                min={0.4}
                                max={1.25}
                                step={0.05}
                                onValueChange={(v) => {
                                    const next = clamp(v?.[0] ?? DEFAULT_THEME_SETTINGS.radiusRem, 0.4, 1.25);
                                    updateSettings({ radiusRem: next });
                                }}
                            />

                            <p className="text-xs text-muted-foreground">
                                Affects cards, buttons, inputs, and dialogs (via global <code>--radius</code>).
                            </p>
                        </div>

                        <Separator />

                        {/* Density */}
                        <div className="grid gap-2">
                            <Label>Density</Label>
                            <ToggleGroup
                                type="single"
                                value={settings.density}
                                onValueChange={(v) => {
                                    if (!v) return;
                                    updateSettings({ density: v as any });
                                }}
                                className="justify-start"
                            >
                                <ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
                                <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
                            </ToggleGroup>

                            <p className="text-xs text-muted-foreground">
                                Compact reduces paddings for data tables using <code>.data-grid</code>.
                            </p>
                        </div>

                        <Separator />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button
                                variant="outline"
                                onClick={() => resetSettings()}
                            >
                                Reset to defaults
                            </Button>

                            <div className="text-xs text-muted-foreground">
                                Saved locally per browser.
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>See how your choices affect UI components.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="flex flex-wrap gap-2">
                            <Button>Primary</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="destructive">Destructive</Button>
                        </div>

                        <div className="grid gap-2">
                            <Label>Example table</Label>
                            <div className="overflow-hidden rounded-lg border bg-card">
                                <table className="data-grid">
                                    <thead>
                                    <tr>
                                        <th>Doc No</th>
                                        <th>Status</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="font-mono text-sm">DSB-000123</td>
                                        <td>
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs badge-neutral">
                          Unposted
                        </span>
                                        </td>
                                        <td className="td-num">₱ 12,340.00</td>
                                    </tr>
                                    <tr>
                                        <td className="font-mono text-sm">DSB-000124</td>
                                        <td>
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs badge-success">
                          Posted
                        </span>
                                        </td>
                                        <td className="td-num">₱ 8,100.00</td>
                                    </tr>
                                    <tr>
                                        <td className="font-mono text-sm">DSB-000125</td>
                                        <td>
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs badge-warning">
                          Pending
                        </span>
                                        </td>
                                        <td className="td-num">₱ 2,450.00</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Rows hover, header tint, numeric alignment, and density apply automatically.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
