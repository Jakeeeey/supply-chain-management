"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
    Search,
    ArrowUpRight,
    Sparkles,
    Timer,
    CheckCircle2,
    Boxes,
    Users,
    Landmark,
    Settings,
    ShieldCheck,
    Factory,
    FolderKanban,
    MessagesSquare,
    Activity,
    Sun,
    Moon,
    Monitor,
    ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Status = "active" | "comingSoon";

type SubsystemCategory =
    | "Operations"
    | "Customer & Engagement"
    | "Corporate Services"
    | "Governance & Assurance"
    | "Monitoring & Oversight";

type SubmoduleItem = {
    id: string;
    title: string;
    status?: Status;
};

type SubsystemItem = {
    id: string;
    title: string;
    subtitle?: string;
    href?: string;
    status: Status;
    category: SubsystemCategory;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
    tag?: string;
    submodules: SubmoduleItem[];
};

type Position =
    | "All Access"
    | "Admin"
    | "SCM Staff"
    | "Finance Staff"
    | "HR Staff"
    | "Sales/CRM Staff"
    | "Auditor"
    | "PMO";

const POSITION_ACCESS: Record<Position, string[]> = {
    "All Access": [
        "scm",
        "crm",
        "finance",
        "hr",
        "mfg",
        "pm",
        "arf",
        "comms",
        "pm-monitoring",
    ],
    Admin: [
        "scm",
        "crm",
        "finance",
        "hr",
        "mfg",
        "pm",
        "arf",
        "comms",
        "pm-monitoring",
    ],
    "SCM Staff": ["scm", "mfg"],
    "Finance Staff": ["finance"],
    "HR Staff": ["hr"],
    "Sales/CRM Staff": ["crm", "comms"],
    Auditor: ["arf", "finance"],
    PMO: ["pm", "pm-monitoring"],
};

const POSITIONS: Position[] = [
    "All Access",
    "Admin",
    "SCM Staff",
    "Finance Staff",
    "HR Staff",
    "Sales/CRM Staff",
    "Auditor",
    "PMO",
];

const SUBSYSTEMS: SubsystemItem[] = [
    {
        id: "scm",
        title: "Supply Chain Management",
        subtitle: "Procurement, inventory, logistics, distribution operations",
        href: "/scm",
        status: "active",
        category: "Operations",
        icon: Boxes,
        tag: "SCM",
        accentClass:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/20",
        submodules: [
            { id: "inventory", title: "Inventory" },
            { id: "logistics", title: "Logistics" },
            { id: "purchasing", title: "Purchasing" },
            { id: "warehouse", title: "Warehouse", status: "comingSoon" },
            { id: "suppliers", title: "Suppliers", status: "comingSoon" },
            { id: "fleet", title: "Fleet", status: "comingSoon" },
        ],
    },
    {
        id: "crm",
        title: "CRM",
        subtitle: "Customers, accounts, pipeline, quotations, after-sales linkage",
        href: "/crm",
        status: "comingSoon",
        category: "Customer & Engagement",
        icon: Users,
        tag: "CRM",
        accentClass:
            "bg-blue-500/10 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500/20",
        submodules: [
            { id: "customers", title: "Customers", status: "comingSoon" },
            { id: "leads", title: "Leads", status: "comingSoon" },
            { id: "opportunities", title: "Opportunities", status: "comingSoon" },
            { id: "quotations", title: "Quotations", status: "comingSoon" },
            { id: "after-sales", title: "After-Sales", status: "comingSoon" },
        ],
    },
    {
        id: "finance",
        title: "Financial Management",
        subtitle: "General ledger, AR/AP, budgeting, cash & bank, compliance",
        href: "/fm",
        status: "comingSoon",
        category: "Corporate Services",
        icon: Landmark,
        tag: "FIN",
        accentClass:
            "bg-violet-500/10 text-violet-600 dark:text-violet-300 ring-1 ring-violet-500/20",
        submodules: [
            { id: "overview", title: "Overview" },
            { id: "gl", title: "GL", status: "comingSoon" },
            { id: "ar", title: "AR", status: "comingSoon" },
            { id: "ap", title: "AP", status: "comingSoon" },
            { id: "cash-bank", title: "Cash & Bank", status: "comingSoon" },
            { id: "budget", title: "Budget", status: "comingSoon" },
            { id: "tax", title: "Tax", status: "comingSoon" },
            { id: "coa", title: "COA", status: "comingSoon" },
            { id: "settings", title: "Settings", status: "comingSoon" },
        ],
    },
    {
        id: "hr",
        title: "Human Resources",
        subtitle: "Timekeeping, payroll, benefits, employee master, performance",
        href: "/hrm",
        status: "comingSoon",
        category: "Corporate Services",
        icon: Settings,
        tag: "HR",
        accentClass:
            "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20",
        submodules: [
            { id: "employees", title: "Employees", status: "comingSoon" },
            { id: "attendance", title: "Attendance", status: "comingSoon" },
            { id: "payroll", title: "Payroll", status: "comingSoon" },
            { id: "benefits", title: "Benefits", status: "comingSoon" },
            { id: "leaves", title: "Leaves", status: "comingSoon" },
            { id: "performance", title: "Performance", status: "comingSoon" },
        ],
    },
    {
        id: "mfg",
        title: "Manufacturing",
        subtitle: "Production planning, BOM, work orders, quality, WIP tracking",
        href: "/manufacturing",
        status: "comingSoon",
        category: "Operations",
        icon: Factory,
        tag: "MFG",
        accentClass:
            "bg-rose-500/10 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/20",
        submodules: [
            { id: "bom", title: "BOM", status: "comingSoon" },
            { id: "mrp", title: "MRP", status: "comingSoon" },
            { id: "work-orders", title: "Work Orders", status: "comingSoon" },
            { id: "wip", title: "WIP", status: "comingSoon" },
            { id: "qc", title: "Quality", status: "comingSoon" },
        ],
    },
    {
        id: "pm",
        title: "Project Management",
        subtitle: "Projects, tasks, assignments, timelines, deliverables, costing",
        href: "/projects",
        status: "comingSoon",
        category: "Operations",
        icon: FolderKanban,
        tag: "PM",
        accentClass:
            "bg-sky-500/10 text-sky-600 dark:text-sky-300 ring-1 ring-sky-500/20",
        submodules: [
            { id: "projects", title: "Projects", status: "comingSoon" },
            { id: "tasks", title: "Tasks", status: "comingSoon" },
            { id: "assignments", title: "Assignments", status: "comingSoon" },
            { id: "timeline", title: "Timeline", status: "comingSoon" },
            { id: "costing", title: "Costing", status: "comingSoon" },
        ],
    },
    {
        id: "arf",
        title: "Audit Results Findings",
        subtitle: "Audit issues, corrective actions, evidence, compliance follow-up",
        href: "/arf",
        status: "comingSoon",
        category: "Governance & Assurance",
        icon: ShieldCheck,
        tag: "ARF",
        accentClass:
            "bg-slate-500/10 text-slate-700 dark:text-slate-200 ring-1 ring-slate-500/15",
        submodules: [
            { id: "findings", title: "Findings", status: "comingSoon" },
            { id: "actions", title: "Action Plans", status: "comingSoon" },
            { id: "evidence", title: "Evidence", status: "comingSoon" },
            { id: "compliance", title: "Compliance", status: "comingSoon" },
        ],
    },
    {
        id: "comms",
        title: "Integrated Communications",
        subtitle: "Announcements, messaging, notifications, tickets/case linkage",
        href: "/comms",
        status: "comingSoon",
        category: "Customer & Engagement",
        icon: MessagesSquare,
        tag: "COMMS",
        accentClass:
            "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300 ring-1 ring-fuchsia-500/20",
        submodules: [
            { id: "announcements", title: "Announcements", status: "comingSoon" },
            { id: "chat", title: "Chat", status: "comingSoon" },
            { id: "notifications", title: "Notifications", status: "comingSoon" },
            { id: "inbox", title: "Inbox", status: "comingSoon" },
        ],
    },
    {
        id: "pm-monitoring",
        title: "PM Monitoring",
        subtitle: "Program monitoring, KPIs, status tracking, escalation visibility",
        href: "/pm-monitoring",
        status: "comingSoon",
        category: "Monitoring & Oversight",
        icon: Activity,
        tag: "PMO",
        accentClass:
            "bg-zinc-500/10 text-zinc-700 dark:text-zinc-200 ring-1 ring-zinc-500/15",
        submodules: [
            { id: "kpis", title: "KPIs", status: "comingSoon" },
            { id: "dashboards", title: "Dashboards", status: "comingSoon" },
            { id: "milestones", title: "Milestones", status: "comingSoon" },
            { id: "escalations", title: "Escalations", status: "comingSoon" },
        ],
    },
];

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

const OLD_VOS_URL = process.env.NEXT_PUBLIC_OLD_VOS_URL || "/";

/**
 * Fixed header offset.
 * If you adjust header layout, tweak these values.
 */
const HEADER_OFFSET_EXPANDED = 188; // px
const HEADER_OFFSET_COMPACT = 120; // px

function DashboardFooter() {
    return (
        <footer className="fixed inset-x-0 bottom-0 z-50">
            <div className="border-t bg-background/70 backdrop-blur">
                <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
                    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="text-sm font-semibold">VOS ERP</span>
                            <Badge variant="secondary" className="h-6 px-2 text-[12px]">
                                Internal
                            </Badge>
                            <span className="hidden sm:inline text-xs text-muted-foreground">
                © {new Date().getFullYear()} Vertex Open Systems
              </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                                <Link href="/docs">Docs</Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                                <Link href="/support">Support</Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                                <Link href="/status">Status</Link>
                            </Button>

                            <Separator orientation="vertical" className="hidden h-5 sm:block" />

                            <span className="text-xs text-muted-foreground">
                Build: <span className="font-medium text-foreground">V2</span>
              </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

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
        <CheckCircle2 className="h-3.5 w-3.5" />
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

function ModeToggle() {
    const { setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                    <Sun className="mr-2 h-4 w-4" />
                    Theme
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function ERPMainDashboard() {
    const [q, setQ] = React.useState("");
    const [position, setPosition] = React.useState<Position>("All Access");
    const [isCompactHeader, setIsCompactHeader] = React.useState(false);

    React.useEffect(() => {
        const onScroll = () => setIsCompactHeader(window.scrollY > 36);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    React.useEffect(() => {
        try {
            const saved = window.localStorage.getItem("vos_position");
            if (saved && POSITIONS.includes(saved as Position)) setPosition(saved as Position);
        } catch {}
    }, []);

    React.useEffect(() => {
        try {
            window.localStorage.setItem("vos_position", position);
        } catch {}
    }, [position]);

    const allowedIds = React.useMemo(() => new Set(POSITION_ACCESS[position] || []), [position]);
    const positionFiltered = React.useMemo(() => SUBSYSTEMS.filter((s) => allowedIds.has(s.id)), [allowedIds]);

    const filtered = React.useMemo(() => filterSubsystems(positionFiltered, q), [positionFiltered, q]);
    const grouped = React.useMemo(() => groupByCategory(filtered), [filtered]);

    const totalActiveVisible = React.useMemo(
        () => positionFiltered.filter((s) => s.status === "active").length,
        [positionFiltered]
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
                        <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="secondary" size="sm" className="rounded-full">
                                <a href={OLD_VOS_URL} target="_blank" rel="noopener noreferrer" aria-label="Open Old VOS">
                                    Open Old VOS <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                            </Button>
                            <ModeToggle />
                        </div>

                        <div className={cn("mt-3 grid gap-4 lg:grid-cols-[1fr_520px] lg:items-start", isCompactHeader && "mt-2")}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <div className={cn("inline-flex items-center justify-center rounded-2xl border bg-background/70 shadow-sm", isCompactHeader ? "h-9 w-9" : "h-10 w-10")}>
                                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                      <span className={cn("font-semibold tracking-tight", isCompactHeader ? "text-base" : "text-lg sm:text-xl")}>
                        VOS ERP
                      </span>
                                            <Badge variant="secondary" className="h-6 px-2 text-[12px]">
                                                Internal
                                            </Badge>
                                        </div>

                                        {!isCompactHeader ? (
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Subsystems overview (filtered by position access).
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className={cn("mt-3 flex flex-wrap items-center gap-2", !isCompactHeader && "mt-4")}>
                                    <Badge variant="secondary" className="h-6 px-2 text-[12px]">
                                        Visible Subsystems: {positionFiltered.length}
                                    </Badge>
                                    <Badge variant="secondary" className="h-6 px-2 text-[12px]">
                                        Active (Visible): {totalActiveVisible}
                                    </Badge>
                                    <Badge variant="secondary" className="h-6 px-2 text-[12px]">
                                        Position: {position}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className={cn("grid gap-3", "sm:grid-cols-[200px_1fr]")}>
                                    <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                                        <SelectTrigger className="bg-background/70 backdrop-blur">
                                            <SelectValue placeholder="Select position" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {POSITIONS.map((p) => (
                                                <SelectItem key={p} value={p}>
                                                    {p}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={q}
                                            onChange={(e) => setQ(e.target.value)}
                                            placeholder="Search subsystems/submodules…"
                                            className="pl-9 bg-background/70 backdrop-blur"
                                        />
                                    </div>
                                </div>

                                {!isCompactHeader ? (
                                    <div className="text-xs text-muted-foreground">
                                        Note: This hides subsystems the selected position cannot access. Enforce authorization on routes/APIs as well.
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENT (push down for fixed header) */}
            <main
                className="mx-auto w-full max-w-[1400px] px-4 pb-24 sm:px-8 sm:pb-28 flex-1"
                style={{ paddingTop: headerOffset }}
            >
                <div className="space-y-8">
                    {filtered.length === 0 ? (
                        <Card className="border bg-background/50 p-8 backdrop-blur">
                            <div className="text-sm text-muted-foreground">
                                No visible subsystems match “{q.trim()}” for position “{position}”.
                            </div>
                        </Card>
                    ) : (
                        grouped.map((group) => {
                            const meta = CATEGORY_META[group.category];
                            return (
                                <div key={group.category}>
                                    <div className="mb-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="text-sm font-semibold">{meta.title}</div>
                                            <span className="inline-flex items-center rounded-full bg-zinc-900/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-zinc-900/10 dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10">
                        {group.items.length} Subsystems
                      </span>
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">{meta.description}</div>
                                    </div>

                                    <Card className="border bg-background/50 p-4 backdrop-blur">
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {group.items.map((s) => (
                                                <SubsystemTile key={s.id} subsystem={s} />
                                            ))}
                                        </div>

                                        <Separator className="mt-4 opacity-70" />
                                        <div className="mt-3 text-xs text-muted-foreground">
                                            Coming Soon subsystems remain non-clickable.
                                        </div>
                                    </Card>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            <DashboardFooter />
        </div>
    );
}

function SubsystemTile({ subsystem }: { subsystem: SubsystemItem }) {
    const isComing = subsystem.status === "comingSoon";
    const Icon = subsystem.icon;

    const content = (
        <div
            className={cn(
                "group relative overflow-hidden rounded-2xl border bg-background/70 p-4 shadow-sm backdrop-blur",
                "transition-all duration-200",
                "hover:border-zinc-900/10 dark:hover:border-white/10",
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
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-background/70 shadow-sm backdrop-blur",
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
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
                aria-label={`Open ${subsystem.title}`}
            >
                {content}
            </Link>
        </HoverLift>
    );
}
