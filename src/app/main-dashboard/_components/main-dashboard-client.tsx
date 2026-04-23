"use client";

import * as React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import Image from "next/image";
import {
    ArrowUpRight,
    Timer,
} from "lucide-react";
import { motion } from "framer-motion";

import { CommandPalette } from "@/components/main-dashboard/command-palette";
import { UserMenu } from "@/components/main-dashboard/user-menu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GlassCard } from "@/components/command-center/GlassCard";
import { AnimatedBackground } from "@/components/command-center/AnimatedBackground";

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

const HEADER_OFFSET_EXPANDED = 140; // px
const HEADER_OFFSET_COMPACT = 100; // px


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
    userFullName,
    userEmail
}: {
    initialSubsystems: DashboardRegistryItem[];
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
            <AnimatedBackground />


            {/* MODERN FLOATING HEADER */}
            <header className={cn(
                "fixed inset-x-0 top-0 z-50 transition-all duration-300 px-4 sm:px-8",
                isCompactHeader ? "pt-4" : "pt-6"
            )}>
                <div className={cn(
                    "mx-auto w-full max-w-[1400px] rounded-2xl border transition-all duration-300",
                    "bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl",
                    "border-slate-900/10 dark:border-white/10",
                    "shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_16px_48px_0_rgba(0,0,0,0.4)]",
                    isCompactHeader ? "py-2.5 px-4" : "py-4 px-6"
                )}>
                    <div className="flex items-center justify-between gap-4">
                        {/* Logo & System HUD */}
                        <div className="flex items-center gap-6 min-w-0">
                            <div className="flex items-center gap-3 shrink-0">
                                <div className={cn(
                                    "flex items-center justify-center rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 shadow-xs transition-all overflow-hidden p-1.5",
                                    isCompactHeader ? "h-8 w-8" : "h-10 w-10"
                                )}>
                                    <Image 
                                        src="/vos.png" 
                                        alt="VOS Logo" 
                                        width={isCompactHeader ? 20 : 24} 
                                        height={isCompactHeader ? 20 : 24}
                                        className="object-contain"
                                    />
                                </div>
                                <div className="flex flex-col leading-none">
                                    <span className={cn(
                                        "font-black tracking-tighter uppercase italic leading-none",
                                        isCompactHeader ? "text-base" : "text-xl sm:text-2xl"
                                    )}>
                                        VOS ERP
                                    </span>
                                    {!isCompactHeader && (
                                        <span className="mt-1 text-[8px] font-black tracking-[0.2em] uppercase text-slate-500 opacity-60">Command Center</span>
                                    )}
                                </div>
                            </div>

                            {/* System HUD Status (Integrated Stats) */}
                            <div className={cn(
                                "hidden md:flex items-center gap-2 border-l border-slate-900/10 dark:border-white/10 pl-6 h-8 transition-opacity duration-300",
                                isCompactHeader ? "opacity-0 scale-95 pointer-events-none" : "opacity-100"
                            )}>
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">{resolvedSubsystems.length} SYSTEMS SYNCED</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-1 w-1 rounded-full bg-cyan-500" />
                                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">{totalActiveVisible} CORES ONLINE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Controls */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center pr-3 border-r border-slate-900/10 dark:border-white/10 mr-1">
                                <CommandPalette subsystems={resolvedSubsystems} />
                            </div>
                            <UserMenu fullName={userFullName} email={userEmail} />
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
                                                <div className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-slate-800 dark:text-slate-200">{meta.title}</div>
                                                <span className="inline-flex items-center rounded-full bg-slate-900/5 px-2.5 py-0.5 text-[10px] font-black text-slate-700 dark:text-slate-300 ring-1 ring-slate-900/10 tracking-widest uppercase">
                                                    {group.items.length} Subsystem/s
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs font-bold tracking-widest text-slate-500 opacity-70 uppercase leading-none">{meta.description}</div>
                                        </div>

                                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {group.items.map((s) => (
                                                <SubsystemTile
                                                    key={s.id}
                                                    subsystem={s}
                                                    onAccess={() => trackAccess(s.id)}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                </motion.div>
            </main>

        </div>
    );
}

function SubsystemTile({ subsystem, onAccess, className }: { subsystem: SubsystemItem; onAccess?: () => void; className?: string }) {
    const isComing = subsystem.status === "comingSoon";
    const Icon = subsystem.icon;

    let accent: "cyan" | "indigo" | "emerald" | "amber" | "violet" | "rose" = "cyan";
    const subId = subsystem.id.toUpperCase();

    if (subId === "HRM") accent = "cyan";
    else if (subId === "FIN") accent = "emerald";
    else if (subId === "SCM") accent = "amber";
    else if (subId === "CRM") accent = "indigo";
    else if (subId === "BI") accent = "violet";
    else if (subId === "ARF") accent = "rose";
    else if (subsystem.category === "Customer & Engagement") accent = "indigo";
    else if (subsystem.category === "Operations") accent = "amber";
    else if (subsystem.category === "Governance & Assurance") accent = "rose";
    else if (subsystem.category === "Monitoring & Oversight") accent = "violet";

    const content = (
        <GlassCard
            accent={accent}
            className={cn(
                "h-full p-5 flex flex-col justify-between !shadow-none",
                isComing && "cursor-not-allowed opacity-70",
                className
            )}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10px" }}
        >
            <div className="relative flex flex-col h-full gap-3">
                {/* Top Row: Icon/Tag + Meta */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={cn(
                                "flex shrink-0 items-center justify-center rounded-xl bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 shadow-sm backdrop-blur",
                                "h-10 w-10"
                            )}
                        >
                            <Icon className={cn(
                                "text-slate-800 dark:text-slate-200",
                                "h-4 w-4"
                            )} />
                        </div>

                        {subsystem.tag ? (
                            <span className="shrink-0 inline-flex items-center rounded-lg bg-slate-200/50 px-2 py-0.5 text-[9px] font-black tracking-[0.2em] uppercase text-slate-900 ring-1 ring-slate-900/10 dark:bg-white/10 dark:text-white dark:ring-white/20">
                                {subsystem.tag}
                            </span>
                        ) : null}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 text-slate-400 shrink-0">
                        <div className="flex items-center gap-2">
                            {isComing ? (
                                <Timer className="h-4 w-4 opacity-60" />
                            ) : (
                                <ArrowUpRight className="h-4 w-4 opacity-60" />
                            )}
                        </div>
                        <StatusBadge status={subsystem.status} />
                    </div>
                </div>

                {/* Middle Row: Title (Full Width) */}
                <div className="min-w-0">
                    <h3 className={cn(
                        "font-black uppercase italic tracking-tighter leading-[0.85] break-words text-xl mb-0.5",
                        "drop-shadow-[0_2px_3px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]",
                        accent === "cyan" ? "text-cyan-700 dark:text-cyan-400" :
                            accent === "indigo" ? "text-indigo-700 dark:text-indigo-400" :
                                accent === "emerald" ? "text-emerald-700 dark:text-emerald-400" :
                                    accent === "amber" ? "text-amber-700 dark:text-amber-400" :
                                        accent === "rose" ? "text-rose-700 dark:text-rose-400" :
                                            "text-violet-700 dark:text-violet-400"
                    )}>
                        {subsystem.title}
                    </h3>

                    {subsystem.subtitle ? (
                        <p className="text-[10px] font-bold tracking-tight text-slate-500 italic leading-snug line-clamp-1 opacity-70">
                            {subsystem.subtitle}
                        </p>
                    ) : null}
                </div>

                {/* Bottom Row: Category + Submodules */}
                <div className="mt-auto pt-3 flex flex-col gap-3 border-t border-slate-900/5 dark:border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                        {subsystem.submodules.slice(0, 4).map((m) => (
                            <Badge
                                key={m.id}
                                variant="outline"
                                className={cn(
                                    "h-5 px-2 text-[9px] font-black tracking-widest uppercase bg-slate-200/30 dark:bg-black/20 border-slate-900/10 dark:border-white/10 text-slate-800 dark:text-slate-300",
                                    m.status === "comingSoon" && "opacity-60"
                                )}
                            >
                                {m.title}
                            </Badge>
                        ))}
                        {subsystem.submodules.length > 4 && (
                            <span className="text-[9px] font-black text-slate-400">+{subsystem.submodules.length - 4} MORE</span>
                        )}
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500/70">
                        {subsystem.category}
                    </div>
                </div>
            </div>
        </GlassCard>
    );

    if (isComing || !subsystem.href) return <HoverLift disabled className={className}>{content}</HoverLift>;

    return (
        <HoverLift className={className}>
            <Link
                href={subsystem.href}
                onClick={onAccess}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[2rem] h-full"
                aria-label={`Open ${subsystem.title}`}
            >
                {content}
            </Link>
        </HoverLift>
    );
}
