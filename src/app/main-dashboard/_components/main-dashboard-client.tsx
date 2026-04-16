"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import {
    ArrowUpRight,
    Timer,
} from "lucide-react";
import { motion } from "framer-motion";

import { CommandPalette } from "@/components/dashboard/command-palette";
import { UserMenu } from "@/components/dashboard/user-menu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type Status = "active" | "comingSoon";

export type SubsystemCategory =
    | "Operations"
    | "Customer & Engagement"
    | "Corporate Services"
    | "Governance & Assurance"
    | "Monitoring & Oversight";

export type SubmoduleItem = {
    id: string;
    title: string;
    status?: Status;
};

export type SubsystemItem = {
    id: string;
    title: string;
    subtitle?: string;
    href?: string;
    status: Status;
    category: SubsystemCategory;
    iconName: string; // Passed as string from server
    icon: React.ComponentType<{ className?: string }>; // Resolved on client
    accentClass: string;
    tag?: string;
    submodules: SubmoduleItem[];
};

const CATEGORY_ORDER: SubsystemCategory[] = [
    "Operations",
    "Customer & Engagement",
    "Corporate Services",
    "Governance & Assurance",
    "Monitoring & Oversight",
];

const CATEGORY_META: Record<SubsystemCategory, { title: string; description: string }> =
    {
        Operations: {
            title: "Operations",
            description: "Core execution systems (supply, production, delivery, projects).",
        },
        "Customer & Engagement": {
            title: "Customer & Engagement",
            description: "Customer lifecycle, communications, and engagement touchpoints.",
        },
        "Corporate Services": {
            title: "Corporate Services",
            description: "Back-office functions supporting the organization (Finance, HR).",
        },
        "Governance & Assurance": {
            title: "Governance & Assurance",
            description: "Risk, audit, and compliance governance workflows.",
        },
        "Monitoring & Oversight": {
            title: "Monitoring & Oversight",
            description: "Cross-cutting monitoring, KPIs, and program oversight.",
        },
    };

const HEADER_OFFSET_EXPANDED = 188; // px
const HEADER_OFFSET_COMPACT = 120; // px


function normalize(s: string) {
    return (s || "").toLowerCase().trim();
}

function filterSubsystems(items: SubsystemItem[], q: string): SubsystemItem[] {
    const query = normalize(q);
    if (!query) return items;

    return items.filter((x) => {
        const subHay = x.submodules.map((m) => `${m.title} ${m.status ?? ""}`).join(" ");
        const hay = [x.title, x.subtitle ?? "", x.tag ?? "", x.category, x.status, x.href ?? "", subHay].join(" ");
        return normalize(hay).includes(query);
    });
}

function groupByCategory(items: SubsystemItem[]) {
    const map = new Map<SubsystemCategory, SubsystemItem[]>();
    items.forEach((s) => {
        const list = map.get(s.category) ?? [];
        list.push(s);
        map.set(s.category, list);
    });

    return CATEGORY_ORDER.map((cat) => ({
        category: cat,
        items: (map.get(cat) ?? []).sort((a, b) => a.title.localeCompare(b.title)),
    })).filter((g) => g.items.length > 0);
}

function StatusBadge({ status }: { status: Status }) {
    if (status === "active") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
        <Icons.CheckCircle2 className="h-3.5 w-3.5" />
        Active
      </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-zinc-500/15 dark:text-zinc-200">
      <Timer className="h-3.5 w-3.5" />
      Coming Soon
    </span>
    );
}

function HoverLift({
                       children,
                       disabled,
                       className,
                   }: {
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "transition-all duration-200 ease-out",
                !disabled &&
                "hover:-translate-y-[3px] hover:shadow-[0_18px_60px_-30px_rgba(0,0,0,0.35)] active:translate-y-0 active:scale-[0.99]",
                disabled && "opacity-95",
                className
            )}
        >
            {children}
        </div>
    );
}


function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

const containerVars = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export type DashboardRegistryItem = Omit<SubsystemItem, "icon">;

export default function MainDashboardClient({ 
    initialSubsystems, 
    userFirstName, 
    userFullName, 
    userEmail 
}: { 
    initialSubsystems: DashboardRegistryItem[]; 
    userFirstName: string;
    userFullName: string;
    userEmail: string;
}) {
    const q = ""; // State setter removed as search is managed by CommandPalette component logic
    const [isCompactHeader, setIsCompactHeader] = React.useState(false);

    React.useEffect(() => {
        const onScroll = () => setIsCompactHeader(window.scrollY > 36);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });

        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const trackAccess = (id: string) => {
        // Access tracking disabled
        console.log("Access tracking disabled for:", id);
    };

    const resolvedSubsystems = React.useMemo(() => {
        return initialSubsystems.map((s): SubsystemItem => {
            const IconComponent = Icons[s.iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }> || Icons.Activity;
            return {
                ...s,
                icon: IconComponent
            };
        });
    }, [initialSubsystems]);

    const filtered = React.useMemo(() => filterSubsystems(resolvedSubsystems, q), [resolvedSubsystems, q]);
    const grouped = React.useMemo(() => groupByCategory(filtered), [filtered]);

    const totalActiveVisible = React.useMemo(
        () => resolvedSubsystems.filter((s) => s.status === "active").length,
        [resolvedSubsystems]
    );

    const headerOffset = isCompactHeader ? HEADER_OFFSET_COMPACT : HEADER_OFFSET_EXPANDED;

    return (
        <div className="relative min-h-screen flex flex-col overflow-x-hidden">
            {/* Background */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black" />
            <div className="absolute inset-0 -z-10 opacity-[0.70] dark:opacity-[0.55] bg-[radial-gradient(circle_at_15%_10%,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.14),transparent_45%),radial-gradient(circle_at_30%_90%,rgba(244,63,94,0.10),transparent_50%),radial-gradient(circle_at_80%_85%,rgba(168,85,247,0.14),transparent_50%)]" />
            <div className="absolute inset-0 -z-10 opacity-[0.07] dark:opacity-[0.10] [background-image:radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />

            {/* FIXED HEADER */}
            <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
                <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
                    <div className={cn("transition-all duration-200", isCompactHeader ? "py-3" : "py-5")}>
                         <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                     <div className={cn("inline-flex items-center justify-center rounded-2xl border bg-background shadow-xs", isCompactHeader ? "h-9 w-9" : "h-10 w-10")}>
                                         <Icons.Sparkles className="h-5 w-5 text-muted-foreground" />
                                     </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("font-black tracking-tighter uppercase", isCompactHeader ? "text-base" : "text-lg sm:text-2xl")}>
                                                VOS ERP
                                            </span>
                                            <Badge variant="secondary" className="h-6 px-2 text-[10px] font-black tracking-widest uppercase opacity-70">
                                                Internal
                                            </Badge>
                                        </div>

                                        {!isCompactHeader ? (
                                            <p className="mt-1 text-xs font-bold tracking-tight text-muted-foreground">
                                                {getGreeting()}, <span className="text-foreground">{userFirstName}</span>. Welcome to your command center.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <CommandPalette subsystems={resolvedSubsystems} />
                                <UserMenu fullName={userFullName} email={userEmail} />
                            </div>
                        </div>

                        <div className={cn("mt-4 flex flex-wrap items-center gap-2", isCompactHeader && "hidden")}>
                                     <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold tracking-tight bg-background border-border shadow-xs">
                                        Visible Subsystems: <span className="ml-1 text-foreground font-black">{resolvedSubsystems.length}</span>
                                    </Badge>
                                    <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold tracking-tight bg-background border-border shadow-xs">
                                        Active (Visible): <span className="ml-1 text-foreground font-black">{totalActiveVisible}</span>
                                    </Badge>
                                </div>
                        </div>
                    </div>
            </header>

            {/* CONTENT (push down for fixed header) */}
            <main
                className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-8 sm:pb-16 flex-1"
                style={{ paddingTop: headerOffset }}
            >
                <motion.div 
                    variants={containerVars}
                    initial="hidden"
                    animate="show"
                    className="space-y-10"
                >
                    <div className="space-y-10">
                    {filtered.length === 0 ? (
                        <Card className="border bg-background/50 p-8 backdrop-blur">
                            <div className="text-sm text-muted-foreground">
                                {q.trim() 
                                    ? `No visible subsystems match "${q.trim()}" for your account.` 
                                    : "You do not have access to any subsystems. Please contact your Administrator."}
                            </div>
                        </Card>
                    ) : (
                        grouped.map((group) => {
                            const meta = CATEGORY_META[group.category];
                            return (
                                <motion.div key={group.category} variants={itemVars}>
                                    <div className="mb-4 px-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-black tracking-tight uppercase">{meta.title}</div>
                                            <span className="inline-flex items-center rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-black text-primary ring-1 ring-primary/10 tracking-widest uppercase">
                                                {group.items.length} Subsystem/s
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[11px] font-bold tracking-tight text-muted-foreground opacity-70 uppercase leading-none">{meta.description}</div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {group.items.map((s) => (
                                            <SubsystemTile key={s.id} subsystem={s} onAccess={() => trackAccess(s.id)} />
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
                </motion.div>
            </main>

        </div>
    );
}

function SubsystemTile({ subsystem, onAccess }: { subsystem: SubsystemItem; onAccess?: () => void }) {
    const isComing = subsystem.status === "comingSoon";
    const Icon = subsystem.icon;

    const content = (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border bg-background p-4 shadow-sm",
                "transition-all duration-200",
                "hover:border-primary/20 hover:shadow-md",
                isComing && "cursor-not-allowed"
            )}
        >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-2xl" />
                <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/15 blur-2xl" />
            </div>

            <div className="relative flex items-start gap-3">
                <div
                    className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-xs",
                        subsystem.accentClass
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold">{subsystem.title}</div>
                        {subsystem.tag ? (
                            <span className="inline-flex items-center rounded-full bg-zinc-900/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 ring-1 ring-zinc-900/10 dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10">
                {subsystem.tag}
              </span>
                        ) : null}
                    </div>

                    {subsystem.subtitle ? (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {subsystem.subtitle}
                        </div>
                    ) : null}

                    <div className="mt-2 text-[11px] text-muted-foreground">
                        Category: {subsystem.category}
                    </div>
                </div>

                <div className="mt-1 text-muted-foreground">
                    {isComing ? (
                        <Timer className="h-4 w-4 opacity-80" />
                    ) : (
                        <ArrowUpRight className="h-4 w-4 opacity-80 transition group-hover:opacity-100" />
                    )}
                </div>
            </div>

            <div className="relative mt-4 flex items-end justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {subsystem.submodules.map((m) => (
                        <Badge
                            key={m.id}
                            variant="secondary"
                            className={cn(
                                "h-5 px-2 text-[11px] font-medium",
                                m.status === "comingSoon" && "opacity-80"
                            )}
                            title={m.status === "comingSoon" ? "Coming Soon" : "Active"}
                        >
                            {m.title}
                        </Badge>
                    ))}
                </div>

                <div className="shrink-0">
                    <StatusBadge status={subsystem.status} />
                </div>
            </div>

            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-primary/20 transition group-hover:ring-2" />
        </div>
    );

    if (isComing || !subsystem.href) return <HoverLift disabled>{content}</HoverLift>;

    return (
        <HoverLift>
            <Link
                href={subsystem.href}
                onClick={onAccess}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                aria-label={`Open ${subsystem.title}`}
            >
                {content}
            </Link>
        </HoverLift>
    );
}
