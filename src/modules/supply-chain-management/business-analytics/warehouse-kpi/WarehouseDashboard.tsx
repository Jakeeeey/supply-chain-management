"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ChevronDown, Filter } from "lucide-react";
import {
  Branch,
  Summary,
  SummaryScope,
  getPeriodFromSelections,
  percent,
  sameScope,
  scopeLabel,
  scopeWarning,
  summarizeAuditCompletion,
} from "./api";
import { useWarehouseResource } from "./useWarehouseResource";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function monthTriggerLabel(selected: number[]): string {
  if (selected.length === 0 || selected.length === MONTHS.length) return "All months";
  if (selected.length === 1) return MONTHS.find(m => m.value === selected[0])?.label || "Month";
  return `Months (${selected.length}/12)`;
}

function warehouseTriggerLabel(selected: string[], total: number): string {
  if (selected.length === 0) return "All warehouses";
  if (selected.length === 1) return "Warehouse (1)";
  return `Warehouses (${selected.length}/${total})`;
}

type Option<V> = { label: string; value: V };

function SearchableMultiSelect<V>({
  options,
  value,
  onChange,
  triggerLabel,
  searchPlaceholder = "Search...",
  buttonClassName,
}: {
  options: Option<V>[];
  value: V[];
  onChange: (next: V[]) => void;
  triggerLabel: (selected: V[]) => string;
  searchPlaceholder?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedSet = new Set(value);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );
  const allSelected = filtered.length > 0 && filtered.every(o => selectedSet.has(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`flex items-center gap-2 shrink-0 ${buttonClassName ?? "min-w-[140px]"}`} aria-haspopup="listbox">
          {triggerLabel(value)}
          <ChevronDown className="size-4 ml-auto opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-[260px]" align="start">
        <div className="space-y-2">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm pl-8 pr-3"
          />
          <div className="flex items-center justify-between px-2 py-1 text-xs border rounded bg-muted">
            <Button
              variant="ghost"
              size="sm"
              disabled={allSelected}
              onClick={() => {
                setSearch("");
                onChange(options.map(o => o.value));
                setOpen(false);
              }}
              className="flex-1 text-left px-2 py-1 text-xs"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={value.length === 0}
              onClick={() => {
                setSearch("");
                onChange([]);
                setOpen(false);
              }}
              className="flex-1 text-left px-2 py-1 text-xs"
            >
              Clear All
            </Button>
          </div>
          <div className="max-h-56 overflow-y-auto overflow-x-hidden p-1 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">No matches</div>
            ) : (
              filtered.map(o => {
                const checked = selectedSet.has(o.value);
                return (
                  <label
                    key={String(o.value)}
                    className="flex items-center gap-2 cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm hover:bg-accent data-[state=checked]:bg-accent"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={checked => {
                        const next = checked
                          ? [...value, o.value]
                          : value.filter(x => x !== o.value);
                        onChange(next);
                      }}
                    />
                    <span className="truncate">{o.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CardCoverage({ endpoint, query, revision, summaryScope }: {
  endpoint: "loading-readiness" | "location-compliance";
  query: string; revision: number; summaryScope: SummaryScope;
}) {
  const [retry, setRetry] = useState(0);
  const loading = useWarehouseResource<{ consolidations?: number | null; timedToAudited?: number | null; withoutAuditedTime?: number | null; timesOutOfOrder?: number | null }>(
    endpoint === "loading-readiness" ? `${endpoint}?${query}` : null, revision + retry
  );
  const location = useWarehouseResource<{ expectedChecks?: number | null; submittedChecks?: number | null; missedChecks?: number | null }>(
    endpoint === "location-compliance" ? `${endpoint}?${query}` : null, revision + retry
  );
  const resource = endpoint === "loading-readiness" ? loading : location;
  const warning = resource.data ? (
    (!sameScope(resource.data as SummaryScope, summaryScope) ? "The coverage response has a different scope from the displayed score." : "")
  ) : "";

  if (resource.loading) return <p role="status" className="text-sm text-muted-foreground">Loading measurement coverage...</p>;
  if (resource.error || warning) return (
    <Alert variant="destructive">
      <AlertDescription>
        <p>Coverage unavailable: {resource.error || warning}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => setRetry(value => value + 1)}>Retry coverage</Button>
      </AlertDescription>
    </Alert>
  );
  return <div className="space-y-1 text-sm text-muted-foreground">
    {loading.data && <>
      <p>{loading.data.timedToAudited} of {loading.data.consolidations} batches have valid audited timing.</p>
      <p>Missing audited time: {loading.data.withoutAuditedTime}</p>
      <p>Out-of-order timestamps: {loading.data.timesOutOfOrder}</p>
    </>}
    {location.data && <>
      <p>{location.data.submittedChecks} of {location.data.expectedChecks} checks submitted.</p>
      <p>Missed checks: {location.data.missedChecks}</p>
    </>}
  </div>;
}

export default function WarehouseDashboard() {
  const today = new Date();
  const currentYear = today.getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(MONTHS.map(m => m.value));
  const [allBranches, setAllBranches] = useState(true);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);

  const { data: branchData, error: branchError, loading: branchesLoading } = useWarehouseResource<{ branches: Branch[] }>("branches", revision);

  const { from, to } = getPeriodFromSelections(selectedMonths, selectedYear, today);

  const query = useMemo(() => {
    const params = new URLSearchParams({ from, to });
    if (!allBranches) {
      selectedBranches.forEach(id => params.append("branchId", id));
    }
    return params.toString();
  }, [allBranches, selectedBranches, from, to]);

  const { data: summary, error, loading } = useWarehouseResource<Summary>(`summary?${query}`, revision);
  const score = summary?.overallPercent;
  const measured = typeof score === "number" && Number.isFinite(score);
  const progress = measured ? Math.min(100, Math.max(0, score)) : 0;
  const scoreTone = !measured ? "neutral" : score >= (summary?.targetPercent ?? 100) ? "green"
    : score >= (summary?.targetPercent ?? 100) * 0.9 ? "yellow"
    : score >= (summary?.targetPercent ?? 100) * 0.8 ? "orange"
    : "red";
  const scoreToneClasses = {
    green: {
      stroke: "text-emerald-500",
      track: "bg-emerald-500/20",
      progress: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
      badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    yellow: {
      stroke: "text-yellow-500",
      track: "bg-yellow-500/20",
      progress: "[&_[data-slot=progress-indicator]]:bg-yellow-500",
      badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    },
    orange: {
      stroke: "text-orange-500",
      track: "bg-orange-500/20",
      progress: "[&_[data-slot=progress-indicator]]:bg-orange-500",
      badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    },
    red: {
      stroke: "text-red-500",
      track: "bg-red-500/20",
      progress: "[&_[data-slot=progress-indicator]]:bg-red-500",
      badge: "bg-red-500/10 text-red-700 dark:text-red-400",
    },
    neutral: {
      stroke: "text-muted-foreground",
      track: "bg-muted",
      progress: "[&_[data-slot=progress-indicator]]:bg-muted-foreground",
      badge: "",
    },
  } as const;
  const scoreColors = scoreToneClasses[scoreTone];
  const warning = summary ? scopeWarning(summary, allBranches ? [] : selectedBranches, from, to) : "";

  const availableBranches = branchData?.branches ?? [];
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2].filter(y => y >= 1900);

  const resetFilters = () => {
    setSelectedYear(currentYear);
    setSelectedMonths(MONTHS.map(m => m.value));
    setAllBranches(true);
    setSelectedBranches([]);
    setRevision(value => value + 1);
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Warehouse Performance</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Executive performance</h1>
      <p className="mt-2 text-sm text-muted-foreground">Backend-calculated performance and measurement coverage for the selected period.</p>
    </div>

    <Card className="border bg-background">
      <CardContent className="pt-3 pb-2 px-4">
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          <Filter className="size-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <Label htmlFor="warehouse-year" className="text-xs text-muted-foreground shrink-0">Year</Label>
            <select
              id="warehouse-year"
              value={String(selectedYear)}
              onChange={e => { setSelectedYear(Number(e.target.value)); setRevision(value => value + 1); }}
              className="w-[110px] border border-input rounded-md bg-background px-2 py-1 text-sm focus-visible:ring-ring focus-visible:ring-[3px] outline-none"
            >
              {yearOptions.map(y => (
                <option key={y} value={String(y)}>{String(y)}</option>
              ))}
            </select>
          </div>
          <SearchableMultiSelect
            options={MONTHS}
            value={selectedMonths}
            onChange={setSelectedMonths}
            triggerLabel={monthTriggerLabel}
            searchPlaceholder="Search months..."
            buttonClassName="w-[200px]"
          />
          <SearchableMultiSelect
            options={availableBranches.map(b => ({ label: b.name, value: b.id }))}
            value={allBranches ? [] : selectedBranches}
            onChange={next => {
              setAllBranches(next.length === 0);
              setSelectedBranches(next);
              setRevision(value => value + 1);
            }}
            triggerLabel={selected => warehouseTriggerLabel(selected, availableBranches.length)}
            searchPlaceholder="Search warehouses..."
            buttonClassName="w-[220px]"
          />
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <Button variant="outline" onClick={resetFilters} size="sm" className="h-8 px-3">Reset filters</Button>
            <Button variant="outline" onClick={() => setRevision(value => value + 1)} size="sm" className="h-8 px-3">Refresh</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    {branchesLoading && <p role="status" className="text-xs text-muted-foreground">Loading branches...</p>}
    {branchError && <Alert variant="destructive"><AlertDescription>
      <p>{branchError} Computed branches are shown by ID when names are unavailable.</p>
      <Button variant="outline" className="mt-2" onClick={() => setRevision(value => value + 1)}>Retry branches</Button>
    </AlertDescription></Alert>}
    {loading && <div role="status" className="space-y-3">
      <span className="sr-only">Loading warehouse performance...</span>
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(index => <Skeleton key={index} className="h-40 rounded-xl" />)}</div>
    </div>}
    {error && <Alert variant="destructive"><AlertDescription><p>{error}</p><Button className="mt-3" onClick={() => setRevision(value => value + 1)}>Retry summary</Button></AlertDescription></Alert>}
    {!loading && !error && summary && <section className="space-y-4" aria-label="Warehouse performance">
      {warning && <Alert variant="destructive"><AlertDescription>{warning}</AlertDescription></Alert>}
      {summary.overallPercent === null && <Alert><AlertDescription>
        No measurable KPI records were returned for the computed branches and period shown below. Cards without measurements are not counted; no aggregate fallback has been applied.
      </AlertDescription></Alert>}
      <Card><CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Current Score</h2>
            <p className="text-3xl font-semibold tabular-nums sm:text-4xl">{percent(score)} <span className="text-sm text-muted-foreground">/ 100%</span></p>
            <Badge variant="secondary" className={summary.meetsTarget === null ? undefined : scoreColors.badge}>{summary.meetsTarget === null ? "No measurable data" : summary.meetsTarget ? `Meets ${summary.targetPercent}% target` : `Below ${summary.targetPercent}% target`}</Badge>
          </div>
          <div role="img" aria-label={measured ? `Current score: ${percent(score)}` : "Current score: no measurable data"} className="relative size-24 shrink-0 sm:size-32">
             <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true"><circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" /><circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress} className={`${scoreColors.stroke} motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500`} opacity={progress > 0 ? 1 : 0} /></svg>
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums sm:text-xl">{percent(score)}</span>
          </div>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Computed period: {summary.from} to {summary.to} (inclusive)</p>
        </div>
        <Progress aria-label="Overall score" className={`h-2.5 ${scoreColors.track} ${scoreColors.progress}`} value={progress} />
        <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Target: {summary.targetPercent}%</span><span>Weighted performance of {summary.cardsIncluded} of {summary.cardsTotal} KPIs</span></div>
        <p className="text-sm text-muted-foreground">Based on {summary.weightCovered}% of the total weight. KPIs without data are not counted.</p>
      </CardContent></Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{summary.cards.map((card, index) => {
        const audit = card.key === "housekeeping" || card.key === "sop-safety" ? summarizeAuditCompletion(card) : null;
        const cardScore = card.scorePercent;
        const cardProgressColor = !card.included || cardScore === null ? "bg-muted [&_[data-slot=progress-indicator]]:bg-muted-foreground"
          : cardScore >= 90 ? "bg-emerald-500/20 [&_[data-slot=progress-indicator]]:bg-emerald-500"
          : cardScore >= 75 ? "bg-yellow-500/20 [&_[data-slot=progress-indicator]]:bg-yellow-500"
          : cardScore >= 60 ? "bg-orange-500/20 [&_[data-slot=progress-indicator]]:bg-orange-500"
          : "bg-red-500/20 [&_[data-slot=progress-indicator]]:bg-red-500";
        return <Card key={card.key}>
          <CardHeader><CardTitle className="text-base">{index + 1}. {card.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-3xl font-semibold tabular-nums">{card.included ? percent(card.scorePercent) : "--"}</p>
            <Progress aria-label={`${card.title} score`} className={cardProgressColor} value={card.included ? card.scorePercent ?? 0 : 0} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Weight: {card.weight}%</span><span className="text-muted-foreground">{card.included ? "Performance score" : "No data reported"}</span></div>
            {(card.key === "loading-readiness" || card.key === "location-compliance") && <CardCoverage key={query} endpoint={card.key} query={query} revision={revision} summaryScope={summary} />}
            {audit && <p className="text-sm text-muted-foreground">{audit}</p>}
            {card.key === "customer-satisfaction" && <p className="text-sm text-muted-foreground">Not implemented by the backend yet.</p>}
          </CardContent>
        </Card>;
      })}</div>
      <p className="text-xs text-muted-foreground">No data reported means the backend found no measurable records for that KPI for the selected branches and period; the score is not included in the weighted total.</p>
    </section>}
  </div>;
}
