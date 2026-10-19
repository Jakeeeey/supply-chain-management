"use client";

import * as React from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import { 
    Trophy, 
    Calendar as CalendarIcon, 
    Search, 
    RefreshCw, 
    X, 
    Building2, 
    User, 
    TrendingUp, 
    FileText, 
    Medal,
    RotateCcw,
    ChevronDown,
    Check,
    Users,
    CalendarDays,
    CalendarRange
} from "lucide-react";
import { 
    Dialog, 
    DialogContent, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContentInDialog,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RankingsApiResponse, SalesmanRankingEntry } from "@/types/dealerover-salesman-rankings";
import { AnimatedPodiumTrophy } from "./animated-flame-trophy";
import { triggerRankConfetti, triggerSequentialPodiumConfetti } from "./rank-confetti";
import { DealeroverEmblemPreloader } from "./dealerover-emblem-preloader";
import { motion, AnimatePresence } from "framer-motion";

interface DealeroverSalesmanRankingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// High-performance singleton instance to eliminate garbage collection overhead in low-end RAM
const phpCurrencyFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const formatCurrency = (val: number) => {
    return phpCurrencyFormatter.format(val || 0);
};

const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
        // Strip any time/timezone part to get pure YYYY-MM-DD
        const pureDate = dateStr.split("T")[0];
        const [yearStr, monthStr, dayStr] = pureDate.split("-");
        if (yearStr && monthStr && dayStr) {
            const d = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
            return format(d, "MMM d, yyyy");
        }
        const d = parseISO(dateStr);
        return format(d, "MMM d, yyyy");
    } catch {
        return dateStr;
    }
};

/**
 * Custom date-time formatter without timezone modification (+8 hours).
 * Directly parses "YYYY-MM-DD HH:mm:ss" or ISO strings to "MMM d, yyyy h:mm a".
 */
const formatRawInvoiceDate = (raw: string | null | undefined): string => {
    if (!raw) return "No sync yet";
    try {
        const clean = raw.replace("T", " ").replace("Z", "").split(".")[0];
        const [dPart, tPart] = clean.split(" ");
        const [y, m, d] = (dPart || "").split("-").map(Number);
        const [hh = 0, mm = 0] = (tPart || "").split(":").map(Number);
        if (!y || !m || !d) return clean;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthName = months[m - 1] || "";
        const period = hh >= 12 ? "PM" : "AM";
        const displayHour = hh % 12 || 12;
        const displayMin = String(mm).padStart(2, "0");
        return `${monthName} ${d}, ${y} ${displayHour}:${displayMin} ${period}`;
    } catch {
        return String(raw);
    }
};

interface LeaderboardTableRowProps {
    row: SalesmanRankingEntry;
}

const LeaderboardTableRow = React.memo(function LeaderboardTableRow({ row }: LeaderboardTableRowProps) {
    const isTop1 = row.rank === 1;
    const isTop2 = row.rank === 2;
    const isTop3 = row.rank === 3;

    const handleRowClick = React.useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
        if (isTop1) triggerRankConfetti(1, { targetElement: e.currentTarget });
        else if (isTop2) triggerRankConfetti(2, { targetElement: e.currentTarget });
        else if (isTop3) triggerRankConfetti(3, { targetElement: e.currentTarget });
    }, [isTop1, isTop2, isTop3]);

    return (
        <tr 
            onClick={handleRowClick}
            className={cn(
                "group relative transition-colors duration-150 select-none",
                (isTop1 || isTop2 || isTop3) ? "cursor-pointer" : "cursor-default",
                isTop1 
                    ? "bg-amber-500/[0.07] hover:bg-amber-500/[0.12] dark:bg-amber-500/[0.09] dark:hover:bg-amber-500/[0.15]" 
                    : isTop2 
                    ? "bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08] dark:bg-cyan-500/[0.06] dark:hover:bg-cyan-500/[0.10]" 
                    : isTop3 
                    ? "bg-orange-500/[0.04] hover:bg-orange-500/[0.08] dark:bg-orange-500/[0.06] dark:hover:bg-orange-500/[0.10]"
                    : "hover:bg-slate-100/70 dark:hover:bg-white/[0.03]"
            )}
        >
            {/* Rank Column - Micro Metallic Coins (Top 3) & Sleek Track Numerals (Rank 4+) */}
            <td className="py-2.5 px-3 text-center relative">
                {/* Left Edge Indicator Strip */}
                <div className={cn(
                    "absolute left-0 inset-y-1.5 w-1 rounded-r-full transition-all",
                    isTop1 
                        ? "bg-amber-500 shadow-[0_0_8px_#F59E0B]" 
                        : isTop2 
                        ? "bg-cyan-400 shadow-[0_0_8px_#38BDF8]" 
                        : isTop3 
                        ? "bg-amber-600 shadow-[0_0_8px_#D97706]" 
                        : "bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-700"
                )} />

                {isTop1 ? (
                    /* Rank 1: Micro Gold Bullion Coin Medallion */
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 p-[1.5px] shadow-sm shadow-amber-500/30 transform group-hover:scale-110 transition-transform">
                        <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-400 to-yellow-500 flex items-center justify-center border border-yellow-100/50">
                            <span className="font-black text-[13px] text-slate-950 italic leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
                                1
                            </span>
                        </div>
                    </div>
                ) : isTop2 ? (
                    /* Rank 2: Micro Platinum Silver Coin Medallion */
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-b from-white via-slate-300 to-slate-500 p-[1.5px] shadow-sm shadow-slate-400/20 transform group-hover:scale-110 transition-transform">
                        <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center border border-white/60">
                            <span className="font-black text-[13px] text-slate-800 dark:text-slate-100 italic leading-none">
                                2
                            </span>
                        </div>
                    </div>
                ) : isTop3 ? (
                    /* Rank 3: Micro Antique Bronze Coin Medallion */
                    <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-b from-orange-300 via-amber-600 to-amber-900 p-[1.5px] shadow-sm shadow-amber-900/30 transform group-hover:scale-110 transition-transform">
                        <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-600 to-amber-800 flex items-center justify-center border border-amber-300/40">
                            <span className="font-black text-[13px] text-amber-50 italic leading-none">
                                3
                            </span>
                        </div>
                    </div>
                ) : (
                    /* Rank 4+: Clean Precision Track-Grade Numeral */
                    <span className="inline-flex items-center justify-center font-mono font-black text-xs text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                        {row.rank}
                    </span>
                )}
            </td>
            <td className="py-2.5 px-4">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400" />
                        {row.salesman_name}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                        Code: {row.salesman_code}
                    </span>
                </div>
            </td>
            <td className="py-2.5 px-4">
                <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {row.dealer_name}
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                            {row.dealer_code}
                        </span>
                    </div>
                </div>
            </td>
            <td className="py-2.5 px-4 text-center">
                <div className="flex flex-col items-center justify-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">
                        <FileText className="h-3 w-3 text-slate-400" />
                        {row.total_invoices}
                    </span>
                    <span 
                        title={`Total assigned customers: ${row.total_customers ?? 0}`}
                        className="inline-flex items-center gap-1 mt-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap"
                    >
                        <Users className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        {row.total_customers ?? 0} Customers
                    </span>
                    {row.latest_created_date && (
                        <span 
                            title={`Latest invoice created date: ${formatRawInvoiceDate(row.latest_created_date)}`}
                            className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-medium text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap"
                        >
                            <RefreshCw className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            {formatRawInvoiceDate(row.latest_created_date)}
                        </span>
                    )}
                </div>
            </td>
            <td className="py-2.5 px-4 text-right">
                <span className={cn(
                    "tracking-tight font-black",
                    isTop1 
                        ? "text-base text-amber-600 dark:text-amber-400 drop-shadow-xs" 
                        : isTop2 
                        ? "text-sm text-cyan-700 dark:text-cyan-300" 
                        : isTop3 
                        ? "text-sm text-amber-800 dark:text-amber-400"
                        : "text-sm text-slate-800 dark:text-slate-200"
                )}>
                    {formatCurrency(row.total_net_amount)}
                </span>
            </td>
        </tr>
    );
});

function getDefaultDateRange() {
    const now = new Date();
    const toStr = format(now, "yyyy-MM-dd");
    const past = new Date(now);
    past.setDate(past.getDate() - 30);
    const fromStr = format(past, "yyyy-MM-dd");
    return { from: fromStr, to: toStr };
}

function getThisMonthDateRange() {
    const now = new Date();
    const fromStr = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
    const toStr = format(now, "yyyy-MM-dd");
    return { from: fromStr, to: toStr };
}

function getLastMonthDateRange() {
    const now = new Date();
    const fromStr = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), "yyyy-MM-dd");
    const toStr = format(new Date(now.getFullYear(), now.getMonth(), 0), "yyyy-MM-dd");
    return { from: fromStr, to: toStr };
}

export function DealeroverSalesmanRankingsModal({
    open,
    onOpenChange
}: DealeroverSalesmanRankingsModalProps) {
    const defaultDates = React.useMemo(() => getDefaultDateRange(), []);
    const [fromDate, setFromDate] = React.useState(defaultDates.from);
    const [toDate, setToDate] = React.useState(defaultDates.to);

    // Controlled Popover Open States (closes immediately when preloader triggers or when date selected)
    const [fromOpen, setFromOpen] = React.useState(false);
    const [toOpen, setToOpen] = React.useState(false);
    const [dealerFilterOpen, setDealerFilterOpen] = React.useState(false);

    const [loading, setLoading] = React.useState(false);
    const [showPreloader, setShowPreloader] = React.useState(open);
    const [data, setData] = React.useState<RankingsApiResponse | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Cycle-aware preloader control driven directly by GSAP onCycleComplete
    // Rule 1: 1st cycle always plays to completion even if API is already done.
    // Rule 2: On 2nd+ cycles, dismiss immediately once API is ready.
    const apiReadyRef = React.useRef(false);
    const [apiReady, setApiReady] = React.useState(false);
    const cycleCountRef = React.useRef(0);

    const stopPreloader = React.useCallback(() => {
        setShowPreloader(false);
    }, []);

    const startPreloader = React.useCallback(() => {
        // Ensure any open date calendar or dealer popovers close immediately
        setFromOpen(false);
        setToOpen(false);
        setDealerFilterOpen(false);
        apiReadyRef.current = false;
        setApiReady(false);
        cycleCountRef.current = 0;
        setShowPreloader(true);
    }, [setDealerFilterOpen]);

    const handlePreloaderCycleComplete = React.useCallback(() => {
        cycleCountRef.current += 1;
        // If API is done when a cycle finishes, cleanly dismiss the preloader
        if (apiReadyRef.current) {
            stopPreloader();
        }
    }, [stopPreloader]);

    // Rule 2: Mid-cycle dismiss for 2nd+ loops.
    // When apiReady flips to true AND we're already past the 1st cycle → dismiss immediately.
    React.useEffect(() => {
        if (apiReady && cycleCountRef.current >= 1) {
            stopPreloader();
        }
    }, [apiReady, stopPreloader]);

    const fetchRankings = React.useCallback(async (f: string, t: string) => {
        setLoading(true);
        startPreloader();
        try {
            const res = await fetch(`/api/dealerover-salesman-rankings?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`);
            if (res.ok) {
                const json: RankingsApiResponse = await res.json();
                setData(json);
            } else {
                const errText = await res.text().catch(() => "");
                console.error(`Failed to fetch salesman rankings (${res.status}):`, errText);
            }
        } catch (err) {
            console.error("Error fetching salesman rankings:", err);
        } finally {
            setLoading(false);
            // Signal that API is done — preloader will dismiss at the right moment
            apiReadyRef.current = true;
            setApiReady(true);
        }
    }, [startPreloader]);

    // Auto-adjust date validation & auto-apply filter immediately
    const handleFromDateSelect = React.useCallback((d: Date | undefined) => {
        if (!d) return;
        const newFromStr = format(d, "yyyy-MM-dd");
        setFromDate(newFromStr);
        // Auto-adjust: If selected From date is after current To date, bump To date to match From date
        let nextToStr = toDate;
        if (toDate && newFromStr > toDate) {
            nextToStr = newFromStr;
            setToDate(newFromStr);
        }
        setFromOpen(false); // Close popover immediately on pick
        fetchRankings(newFromStr, nextToStr);
    }, [toDate, fetchRankings]);

    const handleToDateSelect = React.useCallback((d: Date | undefined) => {
        if (!d) return;
        const newToStr = format(d, "yyyy-MM-dd");
        setToDate(newToStr);
        // Auto-adjust: If selected To date is before current From date, adjust From date to match To date
        let nextFromStr = fromDate;
        if (fromDate && newToStr < fromDate) {
            nextFromStr = newToStr;
            setFromDate(newToStr);
        }
        setToOpen(false); // Close popover immediately on pick
        fetchRankings(nextFromStr, newToStr);
    }, [fromDate, fetchRankings]);

    // Check if applied active data matches default
    const defRange = React.useMemo(() => getDefaultDateRange(), []);
    const isAppliedCustom = React.useMemo(() => {
        if (!data?.from || !data?.to) return false;
        return data.from !== defRange.from || data.to !== defRange.to;
    }, [data?.from, data?.to, defRange]);

    // Reset Filter Button State: Enabled only when current active date filter differs from default 30-day range
    const canReset = isAppliedCustom;

    const handleResetFilter = React.useCallback(() => {
        if (!canReset) return;
        setFromDate(defRange.from);
        setToDate(defRange.to);
        fetchRankings(defRange.from, defRange.to);
    }, [canReset, defRange, fetchRankings]);

    // Quick Date Range Helpers
    const thisMonthRange = React.useMemo(() => getThisMonthDateRange(), []);
    const lastMonthRange = React.useMemo(() => getLastMonthDateRange(), []);

    const isThisMonthActive = (data?.from === thisMonthRange.from && data?.to === thisMonthRange.to) ||
        (fromDate === thisMonthRange.from && toDate === thisMonthRange.to);
    const isLastMonthActive = (data?.from === lastMonthRange.from && data?.to === lastMonthRange.to) ||
        (fromDate === lastMonthRange.from && toDate === lastMonthRange.to);

    const handleApplyThisMonth = React.useCallback(() => {
        const range = getThisMonthDateRange();
        setFromDate(range.from);
        setToDate(range.to);
        fetchRankings(range.from, range.to);
    }, [fetchRankings]);

    const handleApplyLastMonth = React.useCallback(() => {
        const range = getLastMonthDateRange();
        setFromDate(range.from);
        setToDate(range.to);
        fetchRankings(range.from, range.to);
    }, [fetchRankings]);

    // Refs for podium cards to direct confetti cannons precisely
    const rank1Ref = React.useRef<HTMLDivElement>(null);
    const rank2Ref = React.useRef<HTMLDivElement>(null);
    const rank3Ref = React.useRef<HTMLDivElement>(null);

    // Track whether entrance confetti has fired for this modal session
    const hasCelebratedRef = React.useRef(false);

    const handlePreloaderExitComplete = React.useCallback(() => {
        // Trigger sequential celebration (1st -> 2nd -> 3rd) once on initial modal load
        if (!hasCelebratedRef.current) {
            hasCelebratedRef.current = true;
            // Short delay so cards are fully visible post preloader exit
            setTimeout(() => {
                triggerSequentialPodiumConfetti({
                    rank1El: rank1Ref.current,
                    rank2El: rank2Ref.current,
                    rank3El: rank3Ref.current,
                });
            }, 120);
        }
    }, []);

    const handleModalClose = React.useCallback((nextOpen: boolean) => {
        if (!nextOpen) {
            // Clean up preloader cycle on close, reset data, and reset celebration tracker
            stopPreloader();
            setData(null);
            hasCelebratedRef.current = false;
            try {
                localStorage.setItem("dealerover_salesman_ranking", "true");
            } catch {
                // Ignore storage error
            }
        }
        onOpenChange(nextOpen);
    }, [onOpenChange, stopPreloader]);

    // Initial fetch and preloader trigger immediately when opened
    React.useEffect(() => {
        if (open) {
            setData(null);
            startPreloader();
            try {
                sessionStorage.removeItem("just_logged_in");
            } catch {
                // Ignore storage error
            }
            fetchRankings(fromDate, toDate);
        } else {
            setData(null);
            setShowPreloader(false);
        }
    }, [open, fetchRankings, startPreloader, fromDate, toDate]);

    // Dealer Multi-Select State
    // Extract available dealers from dealerStatuses (or fallback from rankings)
    const availableDealers = React.useMemo(() => {
        if (data?.dealerStatuses && data.dealerStatuses.length > 0) {
            return data.dealerStatuses.map(ds => ({
                dealer_id: ds.dealer_id,
                dealer_name: ds.dealer_name || "Unknown Dealer",
                dealer_code: ds.dealer_code,
                is_online: ds.is_online,
                is_default: Boolean(ds.is_default)
            }));
        }
        if (data?.rankings && data.rankings.length > 0) {
            const seen = new Set<number>();
            const list: { dealer_id: number; dealer_name: string; dealer_code: string; is_online: boolean; is_default: boolean }[] = [];
            data.rankings.forEach(r => {
                if (!seen.has(r.dealer_id)) {
                    seen.add(r.dealer_id);
                    list.push({
                        dealer_id: r.dealer_id,
                        dealer_name: r.dealer_name,
                        dealer_code: r.dealer_code,
                        is_online: true,
                        is_default: false
                    });
                }
            });
            return list;
        }
        return [];
    }, [data?.dealerStatuses, data?.rankings]);

    // Check if at least one dealer is marked as default
    const hasDefaultDealer = React.useMemo(() => {
        return availableDealers.some(d => d.is_default);
    }, [availableDealers]);

    // Find default dealers (can be one or more)
    const defaultDealerIds = React.useMemo(() => {
        return new Set(availableDealers.filter(d => d.is_default).map(d => d.dealer_id));
    }, [availableDealers]);

    // Checkbox toggle state for Default Dealer Only filter
    const [showDefaultOnly, setShowDefaultOnly] = React.useState(false);

    // Set of selected dealer IDs - defaults to all dealers checked
    const [selectedDealerIds, setSelectedDealerIds] = React.useState<Set<number>>(new Set());

    // Synchronize default checked state whenever new data is loaded
    React.useEffect(() => {
        if (availableDealers.length > 0) {
            setSelectedDealerIds(new Set(availableDealers.map(d => d.dealer_id)));
        }
    }, [availableDealers]);

    const handleToggleDealer = React.useCallback((id: number) => {
        setSelectedDealerIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleSelectAllDealers = React.useCallback(() => {
        setSelectedDealerIds(new Set(availableDealers.map(d => d.dealer_id)));
    }, [availableDealers]);

    const handleUnselectAllDealers = React.useCallback(() => {
        setSelectedDealerIds(new Set());
    }, []);

    // Filter by selected dealers first, then by search query, and dynamically re-rank 1, 2, 3...
    // When showDefaultOnly is enabled, filter only salesmen from default dealer(s) and KEEP their overall/global rank as is!
    const filteredRankings = React.useMemo(() => {
        if (!data?.rankings || availableDealers.length === 0) return [];
        if (selectedDealerIds.size === 0) return []; // 0 dealers selected -> empty

        // 1. Filter by selected dealers
        const dealerFiltered = data.rankings.filter(r => selectedDealerIds.has(r.dealer_id));

        // 2. Determine base list & rank assignment:
        // If showDefaultOnly is ON, keep original global rank (entry.rank as is from raw overall rankings)
        // If showDefaultOnly is OFF, re-rank dynamically based on selected dealers
        let baseList: SalesmanRankingEntry[];
        if (showDefaultOnly) {
            baseList = dealerFiltered
                .filter(r => defaultDealerIds.has(r.dealer_id))
                .map(entry => ({
                    ...entry,
                    rank: entry.rank // As is overall rank
                }));
        } else {
            baseList = dealerFiltered.map((entry, idx) => ({
                ...entry,
                rank: idx + 1
            }));
        }

        // 3. Filter by search query if any
        const q = searchQuery.toLowerCase().trim();
        if (!q) return baseList;
        return baseList.filter(r => 
            r.salesman_name.toLowerCase().includes(q) ||
            r.salesman_code.toLowerCase().includes(q) ||
            r.dealer_name.toLowerCase().includes(q) ||
            r.dealer_code.toLowerCase().includes(q)
        );
    }, [data?.rankings, availableDealers.length, selectedDealerIds, showDefaultOnly, defaultDealerIds, searchQuery]);

    // Top 3 dynamic podium derived from re-ranked entries of selected dealers
    const topThree = React.useMemo(() => {
        if (!data?.rankings || selectedDealerIds.size === 0) return [];
        const dealerFiltered = data.rankings.filter(r => selectedDealerIds.has(r.dealer_id));
        return dealerFiltered.slice(0, 3).map((entry, idx) => ({
            ...entry,
            rank: idx + 1
        }));
    }, [data?.rankings, selectedDealerIds]);

    // Dynamic Total Sales based on selected dealers
    const filteredTotalRevenue = React.useMemo(() => {
        if (!data?.rankings) return 0;
        if (selectedDealerIds.size === 0) return 0;
        return data.rankings
            .filter(r => selectedDealerIds.has(r.dealer_id))
            .reduce((sum, r) => sum + (r.total_net_amount || 0), 0);
    }, [data?.rankings, selectedDealerIds]);

    return (
        <Dialog open={open} onOpenChange={handleModalClose}>
            <DialogContent 
                showCloseButton={false}
                className="max-w-[96vw] lg:max-w-6xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-slate-200 dark:border-white/10 shadow-2xl rounded-lg"
            >
                {/* ── Fullscreen Preloader Overlay (100% Solid Opaque, Zero Transparency / Bleedthrough) ── */}
                <AnimatePresence onExitComplete={handlePreloaderExitComplete}>
                    {showPreloader && (
                        <motion.div
                            key="emblem-preloader-overlay"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-950 rounded-lg"
                        >
                            <DealeroverEmblemPreloader
                                size="lg"
                                label="Loading Sales Rankings..."
                                sublabel="Please wait..."
                                onCycleComplete={handlePreloaderCycleComplete}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Modal Content Container: Completely hidden while preloader is active ── */}
                <div className={cn(
                    "flex-1 flex flex-col min-h-0 overflow-hidden transition-opacity duration-300",
                    showPreloader ? "opacity-0 pointer-events-none invisible" : "opacity-100 visible"
                )}>
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 shrink-0 group/emblem cursor-pointer select-none">
                            <Image 
                                src="/dealerover-emblem.svg" 
                                alt="Dealerover Emblem" 
                                width={48} 
                                height={48}
                                priority
                                className="w-12 h-12 object-contain drop-shadow-[0_4px_12px_rgba(245,158,11,0.35)] transition-transform duration-300 group-hover/emblem:scale-105 group-hover/emblem:-rotate-3"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
                                    GLOBAL SALES RANKINGS
                                </DialogTitle>
                                <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                    Dealerover
                                </Badge>
                            </div>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Top Salesmen across all Dealers
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Quick Stats in Header - Approach 4: Compact Cyber-Championship Badge */}
                    <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
                        <div className="relative flex items-center gap-3 bg-gradient-to-br from-white/90 via-slate-50/80 to-slate-100/60 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950/80 border border-slate-200/90 dark:border-white/10 rounded-lg p-2 px-3.5 shadow-xs hover:border-emerald-500/40 dark:hover:border-emerald-400/30 transition-all duration-200 group">
                            {/* Ambient Subtle Accent Glow */}
                            <div className="absolute inset-0 rounded-lg bg-emerald-500/[0.03] dark:bg-emerald-400/[0.04] pointer-events-none" />
                            
                            {/* Emerald Icon Frame */}
                            <div className="relative w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-400/30 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200">
                                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>

                            {/* Label & Tabular Numeric Amount */}
                            <div className="flex flex-col leading-none z-10">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        Total Sales
                                    </span>
                                </div>
                                <span className="text-sm sm:text-base font-black tracking-tight tabular-nums text-slate-900 dark:text-white font-mono">
                                    {formatCurrency(filteredTotalRevenue)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="px-6 py-3 border-b border-slate-200/80 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    {/* Date Filters using Radix Popover & Calendar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* From Date Popover */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">From:</span>
                            <Popover open={fromOpen} onOpenChange={setFromOpen}>
                                <PopoverTrigger asChild>
                                    <button 
                                        type="button"
                                        className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-colors cursor-pointer"
                                    >
                                        <CalendarIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                                        <span>{formatDisplayDate(fromDate)}</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContentInDialog className="w-auto p-0 border-slate-200 dark:border-white/10 shadow-2xl rounded-lg" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={fromDate ? parseISO(fromDate) : undefined}
                                        onSelect={handleFromDateSelect}
                                        initialFocus
                                    />
                                </PopoverContentInDialog>
                            </Popover>
                        </div>

                        {/* To Date Popover */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">To:</span>
                            <Popover open={toOpen} onOpenChange={setToOpen}>
                                <PopoverTrigger asChild>
                                    <button 
                                        type="button"
                                        className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition-colors cursor-pointer"
                                    >
                                        <CalendarIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                                        <span>{formatDisplayDate(toDate)}</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContentInDialog className="w-auto p-0 border-slate-200 dark:border-white/10 shadow-2xl rounded-lg" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={toDate ? parseISO(toDate) : undefined}
                                        onSelect={handleToDateSelect}
                                        disabled={fromDate ? (date) => date < parseISO(fromDate) : undefined}
                                        initialFocus
                                    />
                                </PopoverContentInDialog>
                            </Popover>
                        </div>

                        {/* Quick Date Range Filters: This Month & Last Month (Option 1 Pure Icons) */}
                        <div className="flex items-center gap-1 bg-white/70 dark:bg-slate-950/70 border border-slate-200/90 dark:border-white/10 p-0.5 rounded-lg shadow-xs">
                            <button
                                type="button"
                                onClick={handleApplyThisMonth}
                                disabled={loading}
                                title={`This Month (${format(parseISO(thisMonthRange.from), "MMM d")} - ${format(parseISO(thisMonthRange.to), "MMM d, yyyy")})`}
                                aria-label="This Month"
                                className={cn(
                                    "h-7 w-7 rounded-md transition-all flex items-center justify-center select-none cursor-pointer disabled:cursor-not-allowed",
                                    isThisMonthActive
                                        ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <CalendarDays className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyLastMonth}
                                disabled={loading}
                                title={`Last Month (${format(parseISO(lastMonthRange.from), "MMM d")} - ${format(parseISO(lastMonthRange.to), "MMM d, yyyy")})`}
                                aria-label="Last Month"
                                className={cn(
                                    "h-7 w-7 rounded-md transition-all flex items-center justify-center select-none cursor-pointer disabled:cursor-not-allowed",
                                    isLastMonthActive
                                        ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <CalendarRange className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Dedicated Reset Filter Button: Active only when a custom filter is applied */}
                        <Button
                            size="sm"
                            onClick={handleResetFilter}
                            disabled={loading || !canReset}
                            title={canReset ? "Reset to Default (Last 30 Days)" : "Default Filter Active"}
                            className={cn(
                                "h-8 rounded-lg font-black text-xs uppercase tracking-wider px-3.5 gap-1.5 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed",
                                canReset
                                    ? "bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
                                    : "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600 opacity-60"
                            )}
                        >
                            {loading ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                                <RotateCcw className="h-3 w-3 text-slate-600 dark:text-slate-300" />
                            )}
                            {loading ? "Loading..." : "Reset"}
                        </Button>

                        {/* Dealer Multi-Select Dropdown Filter */}
                        <Popover open={dealerFilterOpen} onOpenChange={setDealerFilterOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    disabled={loading || availableDealers.length === 0}
                                    className={cn(
                                        "h-8 rounded-lg px-3 flex items-center gap-2 text-xs font-bold border transition-all select-none shadow-xs cursor-pointer disabled:cursor-not-allowed",
                                        selectedDealerIds.size === availableDealers.length && availableDealers.length > 0
                                            ? "bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-cyan-500/50"
                                            : selectedDealerIds.size > 0
                                            ? "bg-cyan-500/10 dark:bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20"
                                            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                                    )}
                                    title="Filter by Dealer"
                                >
                                    <Building2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                    <span>Dealers</span>
                                    <Badge 
                                        variant="secondary"
                                        className={cn(
                                            "h-4.5 px-1.5 rounded-md text-[10px] font-mono font-bold border-0 transition-colors",
                                            selectedDealerIds.size === availableDealers.length && availableDealers.length > 0
                                                ? "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                                : selectedDealerIds.size > 0
                                                ? "bg-cyan-500 text-slate-950 font-black"
                                                : "bg-rose-500 text-white font-black"
                                        )}
                                    >
                                        {selectedDealerIds.size}/{availableDealers.length}
                                    </Badge>
                                    <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContentInDialog 
                                align="start" 
                                className="w-80 p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-2xl rounded-lg overflow-hidden"
                            >
                                {/* Header with quick action buttons */}
                                <div className="p-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-white/[0.02]">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            Select Dealers
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {selectedDealerIds.size} of {availableDealers.length} active
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllDealers}
                                            className="px-2 py-1 rounded-md text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                                        >
                                            Select All
                                        </button>
                                        <span className="text-slate-300 dark:text-slate-700">•</span>
                                        <button
                                            type="button"
                                            onClick={handleUnselectAllDealers}
                                            className="px-2 py-1 rounded-md text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                        >
                                            Unselect All
                                        </button>
                                    </div>
                                </div>

                                {/* Dealer List with Custom Checkbox */}
                                <div className="p-1.5 max-h-64 overflow-y-auto divide-y divide-slate-100/60 dark:divide-white/5 space-y-0.5">
                                    {availableDealers.length === 0 ? (
                                        <div className="py-6 text-center text-xs text-slate-400 font-medium">
                                            No dealers found
                                        </div>
                                    ) : (
                                        availableDealers.map(dealer => {
                                            const isChecked = selectedDealerIds.has(dealer.dealer_id);
                                            return (
                                                <div
                                                    key={dealer.dealer_id}
                                                    onClick={() => handleToggleDealer(dealer.dealer_id)}
                                                    className={cn(
                                                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer select-none transition-colors group",
                                                        isChecked 
                                                            ? "hover:bg-cyan-500/5 dark:hover:bg-cyan-500/10" 
                                                            : "hover:bg-slate-100/70 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
                                                    )}
                                                >
                                                    {/* Custom Gamified Brand Checkbox */}
                                                    <div 
                                                        className={cn(
                                                            "w-4.5 h-4.5 rounded-[5px] flex items-center justify-center shrink-0 border transition-all duration-150",
                                                            isChecked 
                                                                ? "bg-cyan-500 border-cyan-500 text-slate-950 shadow-xs shadow-cyan-500/30 ring-2 ring-cyan-500/20" 
                                                                : "border-slate-300 dark:border-white/20 bg-white dark:bg-slate-950 group-hover:border-slate-400"
                                                        )}
                                                    >
                                                        {isChecked && (
                                                            <Check className="h-3.5 w-3.5 stroke-[3] text-slate-950" />
                                                        )}
                                                    </div>

                                                    {/* Dealer Details */}
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className={cn(
                                                            "text-xs font-bold truncate transition-colors",
                                                            isChecked ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-700"
                                                        )}>
                                                            {dealer.dealer_name}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                                                                {dealer.dealer_code}
                                                            </span>
                                                            {!dealer.is_online && (
                                                                <span className="text-[9px] px-1 rounded bg-rose-500/10 text-rose-500 font-bold">
                                                                    Offline
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </PopoverContentInDialog>
                        </Popover>

                        {/* Default Dealer Only Checkbox Filter (Only displayed if at least one dealer has is_default = 1) */}
                        {hasDefaultDealer && (
                            <button
                                type="button"
                                onClick={() => setShowDefaultOnly(prev => !prev)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer select-none shadow-xs group",
                                    showDefaultOnly
                                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-800 dark:text-cyan-300 ring-2 ring-cyan-500/20"
                                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20"
                                )}
                                title="Filter salesmen to show only those belonging to default dealer"
                            >
                                <div
                                    className={cn(
                                        "w-4 h-4 rounded-[4px] flex items-center justify-center shrink-0 border transition-all duration-150",
                                        showDefaultOnly
                                            ? "bg-cyan-500 border-cyan-500 text-slate-950 shadow-xs shadow-cyan-500/30 ring-1 ring-cyan-500/40"
                                            : "border-slate-300 dark:border-white/20 bg-white dark:bg-slate-950 group-hover:border-cyan-500/50"
                                    )}
                                >
                                    {showDefaultOnly && (
                                        <Check className="h-3 w-3 stroke-[3] text-slate-950" />
                                    )}
                                </div>
                                <span className="truncate">Show My Salesman</span>
                            </button>
                        )}
                    </div>

                    {/* Search Field */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Salesman or Dealer..."
                            className="h-8 pl-8 text-xs font-bold bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Top 3 Podium Cards */}
                    {!searchQuery && topThree.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Rank 2 (Silver Elite) */}
                            {topThree[1] && (
                                <motion.div 
                                    ref={rank2Ref}
                                    whileHover={{ scale: 1.015, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    onClick={(e) => triggerRankConfetti(2, { targetElement: e.currentTarget })}
                                    className="order-2 sm:order-1 rounded-lg bg-gradient-to-b from-slate-100/80 via-slate-50/40 to-transparent dark:from-slate-900/60 dark:via-slate-900/20 dark:to-transparent backdrop-blur-md p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-slate-900/5 hover:shadow-2xl hover:shadow-cyan-500/15 transition-shadow duration-300 group cursor-pointer select-none border border-slate-200/60 dark:border-white/10"
                                >
                                    {/* Ambient Glass Highlight Line */}
                                    <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-slate-300/80 dark:via-white/20 to-transparent" />
                                    
                                    {/* Game-style Silver Frost Animated Medal Floating on Top Right */}
                                    <div className="absolute top-2 right-2 z-0 pointer-events-none opacity-90 group-hover:scale-110 transition-transform duration-300">
                                        <AnimatedPodiumTrophy rank={2} className="w-20 h-20 sm:w-22 sm:h-22" />
                                    </div>

                                    {/* Header: Rank Badge */}
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <Badge className="bg-slate-200/90 text-slate-800 dark:bg-slate-800/90 dark:text-slate-100 font-black text-[11px] px-3 py-1 uppercase tracking-widest gap-1.5 shadow-xs border-0 rounded-lg">
                                            <Medal className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
                                            2nd Place
                                        </Badge>
                                    </div>

                                    {/* Salesman Info & Dealer Capsule */}
                                    <div className="relative z-10 pr-16 mb-4">
                                        <h4 className="text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white truncate">
                                            {topThree[1].salesman_name}
                                        </h4>
                                        <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-slate-900/5 dark:bg-white/5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 max-w-full">
                                            <Building2 className="h-3 w-3 shrink-0 text-cyan-600 dark:text-cyan-400" />
                                            <span className="truncate">{topThree[1].dealer_name}</span>
                                            <span className="opacity-40">•</span>
                                            <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">{topThree[1].dealer_code}</span>
                                        </div>
                                    </div>

                                    {/* Gamified Score Box Base */}
                                    <div className="relative z-10 rounded-lg bg-white/60 dark:bg-slate-950/40 p-2.5 px-3 flex items-center justify-between shadow-xs border border-slate-200/40 dark:border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Net Sales</span>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{topThree[1].total_invoices} Invoices</span>
                                            <div 
                                                title={`Total assigned customers: ${topThree[1].total_customers ?? 0}`}
                                                className="inline-flex items-center gap-1 mt-0.5 text-[9.5px] font-bold text-slate-500 dark:text-slate-400 font-mono"
                                            >
                                                <Users className="h-2.5 w-2.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                                <span>{topThree[1].total_customers ?? 0} Customers</span>
                                            </div>
                                            {topThree[1].latest_created_date && (
                                                <div 
                                                    title={`Latest invoice created date: ${formatRawInvoiceDate(topThree[1].latest_created_date)}`}
                                                    className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-semibold text-slate-400 dark:text-slate-500 font-mono"
                                                >
                                                    <RefreshCw className="h-2.5 w-2.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                                    <span className="truncate">{formatRawInvoiceDate(topThree[1].latest_created_date)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                            {formatCurrency(topThree[1].total_net_amount)}
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Rank 1 (Gold Champion - Elevated Gamified Hero Stage) */}
                            {topThree[0] && (
                                <motion.div 
                                    ref={rank1Ref}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    onClick={(e) => triggerRankConfetti(1, { targetElement: e.currentTarget })}
                                    className="order-1 sm:order-2 rounded-lg bg-gradient-to-b from-amber-500/20 via-amber-500/[0.06] to-transparent dark:from-amber-500/30 dark:via-amber-500/[0.08] dark:to-transparent backdrop-blur-md p-5.5 flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-amber-500/20 transform sm:-translate-y-2.5 hover:shadow-amber-500/35 transition-shadow duration-300 group ring-1 ring-amber-400/40 dark:ring-amber-400/30 cursor-pointer select-none"
                                >
                                    {/* Top Ambient Golden Light Halo */}
                                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                                    
                                    {/* Game-style Gold Blazing Flame Animated Trophy */}
                                    <div className="absolute top-1 right-1 z-0 pointer-events-none opacity-95 group-hover:scale-110 transition-transform duration-300">
                                        <AnimatedPodiumTrophy rank={1} className="w-24 h-24 sm:w-26 sm:h-26" />
                                    </div>

                                    {/* Header: Champion Badge */}
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <Badge className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black text-xs px-3.5 py-1 uppercase tracking-widest shadow-md shadow-amber-500/30 gap-1.5 border-0 rounded-lg">
                                            <Trophy className="h-3.5 w-3.5 text-slate-950 fill-slate-950" />
                                            1st Place Champion
                                        </Badge>
                                    </div>

                                    {/* Salesman Info & Dealer Capsule */}
                                    <div className="relative z-10 pr-20 mb-4">
                                        <h4 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white truncate">
                                            {topThree[0].salesman_name}
                                        </h4>
                                        <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-lg bg-amber-500/15 dark:bg-amber-400/10 text-[11px] font-semibold text-amber-900 dark:text-amber-300 max-w-full">
                                            <Building2 className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                            <span className="truncate">{topThree[0].dealer_name}</span>
                                            <span className="opacity-40">•</span>
                                            <span className="font-mono text-[10px] font-black text-amber-700 dark:text-amber-400 shrink-0">{topThree[0].dealer_code}</span>
                                        </div>
                                    </div>

                                    {/* Gamified Champion Score Box Base */}
                                    <div className="relative z-10 rounded-lg bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent dark:from-amber-400/20 dark:via-amber-400/10 p-2.5 px-3.5 flex items-center justify-between shadow-xs border border-amber-500/20">
                                        <div className="flex flex-col">
                                             <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Total Net Sales</span>
                                             <span className="text-xs font-bold text-amber-800/80 dark:text-amber-300/80">{topThree[0].total_invoices} Invoices</span>
                                             <div 
                                                 title={`Total assigned customers: ${topThree[0].total_customers ?? 0}`}
                                                 className="inline-flex items-center gap-1 mt-0.5 text-[9.5px] font-bold text-amber-800/80 dark:text-amber-300/80 font-mono"
                                             >
                                                 <Users className="h-2.5 w-2.5 shrink-0 text-amber-700 dark:text-amber-400" />
                                                 <span>{topThree[0].total_customers ?? 0} Customers</span>
                                             </div>
                                             {topThree[0].latest_created_date && (
                                                 <div 
                                                     title={`Latest invoice created date: ${formatRawInvoiceDate(topThree[0].latest_created_date)}`}
                                                     className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-semibold text-amber-800/80 dark:text-amber-300/80 font-mono"
                                                 >
                                                     <RefreshCw className="h-2.5 w-2.5 shrink-0 text-amber-700 dark:text-amber-400" />
                                                     <span className="truncate">{formatRawInvoiceDate(topThree[0].latest_created_date)}</span>
                                                 </div>
                                             )}
                                        </div>
                                        <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-300 tracking-tight drop-shadow-xs">
                                            {formatCurrency(topThree[0].total_net_amount)}
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Rank 3 (Bronze Veteran) */}
                            {topThree[2] && (
                                <motion.div 
                                    ref={rank3Ref}
                                    whileHover={{ scale: 1.015, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    onClick={(e) => triggerRankConfetti(3, { targetElement: e.currentTarget })}
                                    className="order-3 rounded-lg bg-gradient-to-b from-amber-800/15 via-amber-900/[0.04] to-transparent dark:from-amber-700/20 dark:via-amber-800/[0.03] dark:to-transparent backdrop-blur-md p-5 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-amber-950/5 hover:shadow-2xl hover:shadow-orange-700/15 transition-shadow duration-300 group cursor-pointer select-none border border-amber-900/20 dark:border-white/10"
                                >
                                    {/* Ambient Glass Highlight Line */}
                                    <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-700/40 dark:via-amber-600/30 to-transparent" />

                                    {/* Game-style Bronze Forge Animated Medal Floating on Top Right */}
                                    <div className="absolute top-2 right-2 z-0 pointer-events-none opacity-90 group-hover:scale-110 transition-transform duration-300">
                                        <AnimatedPodiumTrophy rank={3} className="w-20 h-20 sm:w-22 sm:h-22" />
                                    </div>

                                    {/* Header: Rank Badge */}
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <Badge className="bg-amber-700/20 text-amber-800 dark:bg-amber-800/40 dark:text-amber-300 font-black text-[11px] px-3 py-1 uppercase tracking-widest gap-1.5 shadow-xs border-0 rounded-lg">
                                            <Medal className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                                            3rd Place
                                        </Badge>
                                    </div>

                                    {/* Salesman Info & Dealer Capsule */}
                                    <div className="relative z-10 pr-16 mb-4">
                                        <h4 className="text-base sm:text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white truncate">
                                            {topThree[2].salesman_name}
                                        </h4>
                                        <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-amber-900/5 dark:bg-white/5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 max-w-full">
                                            <Building2 className="h-3 w-3 shrink-0 text-amber-700 dark:text-amber-400" />
                                            <span className="truncate">{topThree[2].dealer_name}</span>
                                            <span className="opacity-40">•</span>
                                            <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">{topThree[2].dealer_code}</span>
                                        </div>
                                    </div>

                                    {/* Gamified Score Box Base */}
                                    <div className="relative z-10 rounded-lg bg-white/60 dark:bg-slate-950/40 p-2.5 px-3 flex items-center justify-between shadow-xs border border-amber-900/20 dark:border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Net Sales</span>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{topThree[2].total_invoices} Invoices</span>
                                            <div 
                                                title={`Total assigned customers: ${topThree[2].total_customers ?? 0}`}
                                                className="inline-flex items-center gap-1 mt-0.5 text-[9.5px] font-bold text-slate-500 dark:text-slate-400 font-mono"
                                            >
                                                <Users className="h-2.5 w-2.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                                <span>{topThree[2].total_customers ?? 0} Customers</span>
                                            </div>
                                            {topThree[2].latest_created_date && (
                                                <div 
                                                    title={`Latest invoice created date: ${formatRawInvoiceDate(topThree[2].latest_created_date)}`}
                                                    className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-semibold text-slate-400 dark:text-slate-500 font-mono"
                                                >
                                                    <RefreshCw className="h-2.5 w-2.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                                    <span className="truncate">{formatRawInvoiceDate(topThree[2].latest_created_date)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                            {formatCurrency(topThree[2].total_net_amount)}
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Rankings Table */}
                    <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden bg-white/50 dark:bg-slate-900/30 shadow-xs">
                        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                Sales List ({filteredRankings.length})
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {formatDisplayDate(data?.from || fromDate)} - {formatDisplayDate(data?.to || toDate)}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="py-3 px-4 w-16 text-center">Rank</th>
                                        <th className="py-3 px-4">Salesman</th>
                                        <th className="py-3 px-4">Dealer</th>
                                        <th className="py-3 px-4 text-center">Invoices</th>
                                        <th className="py-3 px-4 text-right">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-medium">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center text-transparent select-none" aria-hidden="true">
                                                &nbsp;
                                            </td>
                                        </tr>
                                    ) : selectedDealerIds.size === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-14 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        No dealers selected.
                                                    </span>
                                                    <p className="text-[11px] text-slate-400 max-w-xs">
                                                        Please select at least one dealer from the dropdown filter to view rankings.
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleSelectAllDealers}
                                                        className="mt-1 text-xs font-bold border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-lg"
                                                    >
                                                        Select All Dealers
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredRankings.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                                                No sales recorded for the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRankings.map((row) => (
                                            <LeaderboardTableRow
                                                key={`${row.dealer_id}-${row.salesman_id}`}
                                                row={row}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer - Compact, Giving Max Room to Content */}
                <div className="px-6 py-2.5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {/* Dealer Status Checkpoint Popover */}
                        {data?.dealerStatuses && data.dealerStatuses.length > 0 && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button 
                                        type="button"
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-tight border transition-all cursor-pointer select-none",
                                            data.onlineDealersCount === data.totalDealersCount
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
                                        )}
                                    >
                                        <span className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            data.onlineDealersCount === data.totalDealersCount
                                                ? "bg-emerald-500 animate-pulse"
                                                : "bg-amber-500"
                                        )} />
                                        <span>Dealer Status: {data.onlineDealersCount} of {data.totalDealersCount} online</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContentInDialog 
                                    side="top" 
                                    align="start" 
                                    className="w-72 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-xl rounded-lg"
                                >
                                    {/* Clean & Simple Header */}
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/5">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                Dealer Status
                                            </h4>
                                            <p className="text-[10px] text-slate-400">
                                                Connection status
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold",
                                            data.onlineDealersCount === data.totalDealersCount
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                        )}>
                                            {data.onlineDealersCount} of {data.totalDealersCount} Online
                                        </span>
                                    </div>

                                    {/* Clean 2-Column Dealer List (No Logo Box, Zero Clutter) */}
                                    <div className="space-y-1 max-h-52 overflow-y-auto">
                                        {data.dealerStatuses.map((ds) => (
                                            <div 
                                                key={ds.dealer_id}
                                                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                {/* Left Column: Dealer Name and Code */}
                                                <div className="flex flex-col min-w-0 pr-3">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                                                        {ds.dealer_name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {ds.dealer_code}
                                                    </span>
                                                </div>

                                                {/* Right Column: Status Indicator */}
                                                <div className="shrink-0">
                                                    {ds.is_online ? (
                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            Online
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md" title={ds.error_message || "Offline"}>
                                                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                            Offline
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </PopoverContentInDialog>
                            </Popover>
                        )}

                        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                            Total Salesmen: <strong className="text-slate-700 dark:text-slate-300">{data?.totalSalesmenCount || 0}</strong>
                        </span>
                    </div>

                    <Button
                        onClick={() => handleModalClose(false)}
                        className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-slate-950 font-black uppercase tracking-widest text-[11px] h-8 px-5 rounded-lg transition-all shadow-xs cursor-pointer"
                    >
                        Close
                    </Button>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
