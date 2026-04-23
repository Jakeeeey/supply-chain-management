"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
    ChevronRight,
    ChevronDown,
    FileText,
    Folder,
    SearchX,
    Sparkles,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
} from "@/components/ui/sidebar";
import { NavItem } from "@/types/navigation";

import { THEME_SETTINGS_EVENT } from "@/components/theme/theme-settings";

/* --------------------------------- helpers -------------------------------- */

function normalizePath(p: string) {
    if (!p) return "/";
    if (p !== "/" && p.endsWith("/")) return p.slice(0, -1);
    return p;
}

function isRouteActiveExact(currentPath: string, targetUrl: string) {
    if (!targetUrl || targetUrl === "#") return false;
    const cur = normalizePath(currentPath);
    const tgt = normalizePath(targetUrl);
    return cur === tgt;
}

function hasActiveInTree(pathname: string, node?: NavItem): boolean {
    if (!node) return false;
    if (isRouteActiveExact(pathname, node.url)) return true;
    return node.items?.some((c) => hasActiveInTree(pathname, c)) ?? false;
}

/* ------------------------- accent from localStorage ------------------------- */

type VOSThemeSettingsV1 = {
    accent?: string;
    radiusRem?: number;
    density?: "compact" | "comfortable";
};

const ACCENT_HSL: Record<string, { pill: string; fg: string }> = {
    amber: { pill: "45 93% 47%", fg: "0 0% 10%" },
    blue: { pill: "217 91% 60%", fg: "0 0% 100%" },
    emerald: { pill: "142 71% 45%", fg: "0 0% 100%" },
    violet: { pill: "262 83% 58%", fg: "0 0% 100%" },
    rose: { pill: "346 77% 50%", fg: "0 0% 100%" },
    slate: { pill: "215 16% 47%", fg: "0 0% 100%" },
};

function readVOSThemeSettings(): VOSThemeSettingsV1 | null {
    try {
        const raw = localStorage.getItem("vos_theme_settings_v1");
        if (!raw) return null;
        return JSON.parse(raw) as VOSThemeSettingsV1;
    } catch {
        return null;
    }
}

function resolveAccentVars(accent?: string) {
    const key = String(accent ?? "").trim().toLowerCase();
    return ACCENT_HSL[key] ?? ACCENT_HSL.amber;
}

/* ---------------------------------- layout --------------------------------- */

const SUB_WRAP_RESET = "mx-0 px-0 translate-x-0 border-l-0 w-full min-w-0 overflow-hidden";

const SUB_WRAP_L2 = cn(
    SUB_WRAP_RESET,
    "relative py-0.5"
);

const SUB_WRAP_L3 = cn(
    SUB_WRAP_RESET,
    "relative py-0.5"
);

const ROW = "flex w-full min-w-0 flex-nowrap items-center overflow-hidden";
const LABEL = "min-w-0 w-0 flex-1 truncate !whitespace-nowrap";

/* ----------------------------- pill (hover + active) ------------------------ */

const PILL_BASE =
    "flex min-w-0 flex-1 items-center flex-nowrap whitespace-nowrap " +
    "rounded-[var(--radius)] px-3 py-1.5 " +
    "bg-transparent text-inherit shadow-none " +
    "transition-[background-color,color,box-shadow] duration-150";

const GAP_L1 = "gap-2";
const GAP_L2 = "gap-2";
const GAP_L3 = "gap-2";

const PILL_HOVER =
    "hover:bg-[hsl(var(--vos-pill))] hover:text-[hsl(var(--vos-pill-foreground))] " +
    "dark:hover:!text-black";

const PILL_ACTIVE =
    "group-data-[active=true]:bg-[hsl(var(--vos-pill))] " +
    "group-data-[active=true]:text-[hsl(var(--vos-pill-foreground))] " +
    "dark:group-data-[active=true]:!text-black";

const OUTER_ROW_NO_GREY =
    "group !bg-transparent !shadow-none " +
    "!hover:bg-transparent !active:bg-transparent " +
    "data-[active=true]:!bg-transparent " +
    "focus-visible:!ring-0";

/* ---------------------------------- CVA ----------------------------------- */

/* ---------------------------------- icons --------------------------------- */

const ICON_L1_CLASS = "size-5 shrink-0 text-current";
const ICON_L2_CLASS = "size-4 shrink-0 text-current";
const ICON_L3_CLASS = "size-4 shrink-0 text-current";

function L2Icon({ node, kind }: { node: NavItem; kind: "leaf" | "parent" }) {
    const Icon = node.icon ?? (kind === "parent" ? Folder : FileText);
    return <Icon className={ICON_L2_CLASS} />;
}

function L3Icon({ node }: { node: NavItem }) {
    const Icon = node.icon ?? FileText;
    return <Icon className={ICON_L3_CLASS} />;
}

/* ------------------------ dropdown animation (fixed) ------------------------ */
/**
 * ✅ Key fix:
 * - Keep CollapsibleContent mounted (forceMount)
 * - Animate a wrapper that always exists
 * - Disable pointer events while closed
 */
const DROP_WRAP =
    "grid transition-[grid-template-rows,opacity] duration-200 ease-out will-change-[grid-template-rows,opacity]";
const DROP_OPEN = "grid-rows-[1fr] opacity-100 pointer-events-auto";
const DROP_CLOSED = "grid-rows-[0fr] opacity-0 pointer-events-none";
const DROP_INNER = "min-h-0 overflow-hidden";

const CHEVRON_ANIM = "transition-transform duration-200 ease-out";

/* --------------------------------- soon badge -------------------------------- */
function SoonBadge() {
    return (
        <span className="ml-auto flex h-3.5 items-center rounded-[4px] bg-amber-500/5 px-1 text-[7px] font-black uppercase tracking-[0.2em] text-amber-600/80 border border-amber-500/10 shadow-none">
            Soon
        </span>
    );
}

function HighlightMatch({ text, term }: { text: string; term?: string }) {
    if (!term || !term.trim()) return <>{text}</>;

    const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${safeTerm})`, "gi"));

    return (
        <span className="inline whitespace-nowrap">
            {parts.map((part, i) =>
                part.toLowerCase() === term.toLowerCase() ? (
                    <span
                        key={i}
                        className="inline text-amber-600 font-bold underline decoration-2 underline-offset-[3px] decoration-amber-500/40 whitespace-nowrap"
                    >
                        {part}
                    </span>
                ) : (
                    <span key={i} className="inline whitespace-nowrap">{part}</span>
                )
            )}
        </span>
    );
}

function TruncatedLabel({
                            text,
                            term,
                            className
                        }: {
    text: string;
    term?: string;
    className?: string
}) {
    const [isTruncated, setIsTruncated] = React.useState(false);
    const textRef = React.useRef<HTMLSpanElement>(null);

    const checkTruncation = () => {
        const el = textRef.current;
        if (el) {
            setIsTruncated(el.scrollWidth > el.clientWidth);
        }
    };

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild onMouseEnter={checkTruncation}>
                    <span
                        ref={textRef}
                        className={cn("min-w-0 flex-1 truncate !whitespace-nowrap", className)}
                    >
                        <HighlightMatch text={text} term={term} />
                    </span>
                </TooltipTrigger>
                {isTruncated && (
                    <TooltipContent
                        side="right"
                        align="center"
                        sideOffset={8}
                        className="max-w-[280px] break-words font-bold px-3 py-1.5 text-[11px] shadow-2xl border-none bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 animate-in fade-in zoom-in-95"
                    >
                        {text}
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}

/* -------------------------------- component -------------------------------- */

/* ---------------------------- Recursive Nav Item --------------------------- */

interface RecursiveNavItemProps {
    node: NavItem;
    depth: number;
    pathname: string;
    searchTerm?: string;
    openMap: Record<string, boolean>;
    toggleOpen: (key: string) => void;
    parentKey?: string;
    isLast?: boolean;
}

function RecursiveNavItem({
                              node,
                              depth,
                              pathname,
                              searchTerm,
                              openMap,
                              toggleOpen,
                              parentKey,
                              isLast
                          }: RecursiveNavItemProps) {
    const hasChildren = !!node.items?.length;
    const isExact = isRouteActiveExact(pathname, node.url);
    const key = parentKey ? `${parentKey}::${node.title}` : node.title;
    const isOpen = hasChildren ? !!openMap[key] : false;
    const isClickable = node.url !== "#";

    // Indentation logic: Level 1 (0), Level 2 (7), Level 3 (12), Level 4 (17)...
    const getPaddingClass = (d: number) => {
        if (d === 0) return "";
        if (d === 1) return "pl-7";
        if (d === 2) return "pl-12";
        // For d > 2, we can't use tailwind classes easily without JIT or dynamic style
        return "";
    };

    const dynamicPadding = depth > 2 ? { paddingLeft: `${depth * 1.25 + 0.5}rem` } : {};

    const renderButtonContent = (
        <div className={cn(PILL_BASE, depth === 0 ? GAP_L1 : (depth === 1 ? GAP_L2 : GAP_L3), PILL_HOVER, PILL_ACTIVE)}>
            {(() => {
                if (depth === 0) {
                    const Icon = node.icon ?? Folder;
                    return <Icon className={ICON_L1_CLASS} />;
                }
                if (depth === 1) return <L2Icon node={node} kind={hasChildren ? "parent" : "leaf"} />;
                return <L3Icon node={node} />;
            })()}
            <TruncatedLabel text={node.title} term={searchTerm} className={LABEL} />
            {node.status === "comingSoon" && <SoonBadge />}

            {hasChildren && (
                isOpen ? (
                    <ChevronDown className={cn("ml-auto size-4 shrink-0", CHEVRON_ANIM)} />
                ) : (
                    <ChevronRight className={cn("ml-auto size-4 shrink-0", CHEVRON_ANIM)} />
                )
            )}
        </div>
    );


    const nestedClass = cn(
        "group relative w-full flex items-center min-w-0 overflow-hidden cursor-pointer rounded-md h-8 text-sm pr-2",
        getPaddingClass(depth),
        node.status === "comingSoon" && "opacity-60 cursor-not-allowed",
        /* THE L-SHAPE CONNECTOR (Dashed Style) */
        depth > 0 && [
            // Vertical backbone (Full segment IF not last)
            "before:content-[''] before:absolute before:bg-sidebar-border/30",
            depth === 1 ? "before:left-4" : (depth === 2 ? "before:left-9" : ""),
            depth > 2 && "before:left-[calc(var(--depth-offset)-1.25rem+1px)]",
            "before:top-0 before:w-px",
            isLast ? "before:h-4" : "before:h-full", // 4 is middle of h-8
            "before:border-l before:border-dashed before:border-sidebar-border/40",

            // Horizontal tick (The hook part of the L)
            "after:content-[''] after:absolute after:bg-sidebar-border/30",
            depth === 1 ? "after:left-4 after:w-3" : (depth === 2 ? "after:left-9 after:w-3" : ""),
            depth > 2 && "after:left-[calc(var(--depth-offset)-1.25rem+1px)] after:w-3",
            "after:top-4 after:h-px",
            "after:border-t after:border-dashed after:border-sidebar-border/40",
        ]
    );

    const dynamicStyle = {
        ...dynamicPadding,
        ...(depth > 2 ? { "--depth-offset": `${depth * 1.25 + 0.5}rem` } : {})
    } as React.CSSProperties;

    const sidebarItem = (
        <SidebarMenuItem className="min-w-0 overflow-hidden">
            {depth === 0 ? (
                /* L1 ITEMS: Keep SidebarMenuButton for standard look */
                hasChildren ? (
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            tooltip={node.title}
                            className={cn(OUTER_ROW_NO_GREY, "cursor-pointer min-w-0 overflow-hidden")}
                            data-active={isExact}
                        >
                            <div className={ROW}>
                                {renderButtonContent}
                            </div>
                        </SidebarMenuButton>
                    </CollapsibleTrigger>
                ) : (
                    <SidebarMenuButton
                        asChild
                        tooltip={node.title}
                        className={cn(OUTER_ROW_NO_GREY, "cursor-pointer min-w-0 overflow-hidden")}
                        data-active={isExact}
                    >
                        {isClickable && node.status !== "comingSoon" ? (
                            <Link href={node.url} className={ROW}>
                                {renderButtonContent}
                            </Link>
                        ) : (
                            <div
                                className={cn(ROW, node.status === "comingSoon" && "opacity-60 cursor-not-allowed")}
                                onClick={() => {
                                    if (node.status === "comingSoon") {
                                        toast.info("Stay Tuned!", {
                                            description: `The "${node.title}" module is currently under development.`,
                                            icon: <Sparkles className="size-4 text-amber-500" />,
                                        });
                                    }
                                }}
                            >
                                {renderButtonContent}
                            </div>
                        )}
                    </SidebarMenuButton>
                )
            ) : (
                /* NESTED ITEMS: Direct Button/Link to avoid shadcn backgrounds (The Grey Box) */
                hasChildren ? (
                    <CollapsibleTrigger asChild>
                        <div
                            className={nestedClass}
                            style={dynamicStyle}
                            data-active={isExact}
                        >
                            <div className={ROW}>
                                {renderButtonContent}
                            </div>
                        </div>
                    </CollapsibleTrigger>
                ) : (
                    isClickable && node.status !== "comingSoon" ? (
                        <Link
                            href={node.url}
                            className={nestedClass}
                            style={dynamicStyle}
                            data-active={isExact}
                        >
                            <div className={ROW}>
                                {renderButtonContent}
                            </div>
                        </Link>
                    ) : (
                        <div
                            className={nestedClass}
                            style={dynamicStyle}
                            data-active={isExact}
                            onClick={() => {
                                if (node.status === "comingSoon") {
                                    toast.info("Stay Tuned!", {
                                        description: `The "${node.title}" module is currently under development.`,
                                        icon: <Sparkles className="size-4 text-amber-500" />,
                                    });
                                }
                            }}
                        >
                            <div className={ROW}>
                                {renderButtonContent}
                            </div>
                        </div>
                    )
                )
            )}

            {/* Recursion for Children */}
            {hasChildren && (
                <div className={cn(DROP_WRAP, isOpen ? DROP_OPEN : DROP_CLOSED)}>
                    <div className={DROP_INNER}>
                        <CollapsibleContent forceMount>
                            <SidebarMenuSub className={cn(
                                depth === 0 ? SUB_WRAP_L2 : SUB_WRAP_L3,
                                depth >= 2 && "mx-0 px-0 translate-x-0 border-l-0 w-full min-w-0 overflow-hidden relative py-0.5"
                            )}>
                                {node.items!.map((child, idx) => (
                                    <RecursiveNavItem
                                        key={child.title}
                                        node={child}
                                        parentKey={key}
                                        depth={depth + 1}
                                        pathname={pathname}
                                        searchTerm={searchTerm}
                                        openMap={openMap}
                                        toggleOpen={toggleOpen}
                                        isLast={idx === node.items!.length - 1}
                                    />
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </div>
                </div>
            )}
        </SidebarMenuItem>
    );

    return hasChildren ? (
        <Collapsible
            open={isOpen}
            onOpenChange={() => toggleOpen(key)}
            asChild
        >
            {sidebarItem}
        </Collapsible>
    ) : (
        sidebarItem
    );
}

/* -------------------------------- component -------------------------------- */

/* ---------------------------------- helpers ------------------------------- */

/**
 * Recursive helper to expand parents of active routes or search matches.
 */
const getAutoOpenState = (
    nodes: NavItem[],
    currentPath: string,
    search?: string,
    parentKey?: string
): Record<string, boolean> => {
    return nodes.reduce<Record<string, boolean>>((acc, node) => {
        const key = parentKey ? `${parentKey}::${node.title}` : node.title;
        const hasChildren = !!node.items?.length;

        let newState = { ...acc };

        if (hasChildren) {
            const isActive = hasActiveInTree(currentPath, node);
            const isSearchMatch = !!(search && search.length > 0);

            if (isActive || isSearchMatch) {
                newState[key] = true;
            }

            const childrenState = getAutoOpenState(node.items!, currentPath, search, key);
            newState = { ...newState, ...childrenState };
        }

        return newState;
    }, {});
};

export function NavMain({ items, searchTerm }: { items: NavItem[]; searchTerm?: string }) {
    const pathname = normalizePath(usePathname() || "/");
    const [accentVars, setAccentVars] = React.useState(() => resolveAccentVars("amber"));

    React.useEffect(() => {
        const applyFromStorage = () => {
            const s = readVOSThemeSettings();
            setAccentVars(resolveAccentVars(s?.accent));
        };
        applyFromStorage();
        const onThemeSettingsChanged = () => applyFromStorage();
        window.addEventListener(THEME_SETTINGS_EVENT, onThemeSettingsChanged as EventListener);
        return () => window.removeEventListener(THEME_SETTINGS_EVENT, onThemeSettingsChanged as EventListener);
    }, []);

    const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});


    React.useEffect(() => {
        const nextState = getAutoOpenState(items, pathname, searchTerm);
        setOpenMap((prev) => {
            // Check if state actually changed to avoid infinite loop
            const keys = Object.keys(nextState);
            if (keys.length === 0 && Object.keys(prev).length === 0) return prev;

            let changed = false;
            for (const k of keys) {
                if (!prev[k]) {
                    changed = true;
                    break;
                }
            }
            return changed ? { ...prev, ...nextState } : prev;
        });
    }, [pathname, items, searchTerm]);

    const handleToggle = (key: string) => {
        setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <SidebarGroup
            className="overflow-x-hidden p-0"
            style={
                {
                    "--vos-pill": accentVars.pill,
                    "--vos-pill-foreground": accentVars.fg,
                } as React.CSSProperties
            }
        >
            <SidebarMenu className="overflow-x-hidden gap-1">
                {items.length === 0 && searchTerm ? (
                    <div className="px-5 py-8 text-center animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="mx-auto size-12 rounded-2xl bg-sidebar-accent/30 flex items-center justify-center mb-3 border border-sidebar-border/50">
                            <SearchX className="size-6 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground tracking-tight">No modules found</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Try another keyword</p>
                    </div>
                ) : (
                    items.map((l1) => (
                        <RecursiveNavItem
                            key={l1.title}
                            node={l1}
                            depth={0}
                            pathname={pathname}
                            searchTerm={searchTerm}
                            openMap={openMap}
                            toggleOpen={handleToggle}
                        />
                    ))
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}
