"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Search, Siren } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  INCIDENT_TYPE_LABELS,
  INCIDENT_TYPES,
  SEVERITIES,
  SEVERITY_LABELS,
  STATUS_LABELS,
  STATUSES,
} from "../constants";
import { fetchEmergencyReports, updateEmergencyReportStatus } from "../providers/fetchProvider";
import type { EmergencyReport, EmergencyStatus } from "../types";

const ALL = "all";
const NEXT_STATUSES: Partial<Record<EmergencyStatus, EmergencyStatus[]>> = {
  reported: ["acknowledged", "cancelled"],
  acknowledged: ["responding", "cancelled"],
  responding: ["resolved", "cancelled"],
};

function dateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusVariant(status: EmergencyStatus) {
  if (status === "resolved") return "default";
  if (status === "cancelled") return "secondary";
  if (status === "responding") return "destructive";
  return "outline";
}

export default function EmergencyReportsModule() {
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: ALL,
    severity: ALL,
    incidentType: ALL,
    dateFrom: "",
    dateTo: "",
  });
  const [selectedReport, setSelectedReport] = useState<EmergencyReport | null>(null);
  const [nextStatus, setNextStatus] = useState<EmergencyStatus | "">("");
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const counts = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc.total += 1;
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [reports]);

  async function loadReports() {
    setLoading(true);
    try {
      const data = await fetchEmergencyReports(filters);
      setReports(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load emergency reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.severity, filters.incidentType, filters.dateFrom, filters.dateTo]);

  function openReport(report: EmergencyReport) {
    setSelectedReport(report);
    setNextStatus("");
    setNotes("");
  }

  async function applyStatusUpdate() {
    if (!selectedReport || !nextStatus) return;

    if (nextStatus === "resolved" && !notes.trim()) {
      toast.error("Resolution notes are required");
      return;
    }
    if (nextStatus === "cancelled" && !notes.trim()) {
      toast.error("Cancellation reason is required");
      return;
    }

    setUpdating(true);
    try {
      await updateEmergencyReportStatus(selectedReport.id, {
        status: nextStatus,
        resolution_notes: nextStatus === "resolved" ? notes : null,
        cancelled_reason: nextStatus === "cancelled" ? notes : null,
      });
      toast.success("Emergency report updated");
      setSelectedReport(null);
      await loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update emergency report");
    } finally {
      setUpdating(false);
    }
  }

  const allowedNextStatuses = selectedReport ? NEXT_STATUSES[selectedReport.status] || [] : [];

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Emergency Reports</h1>
          <p className="text-sm text-muted-foreground">Monitor incident response and resolution across fleet operations.</p>
        </div>
        <Button variant="outline" onClick={loadReports} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Siren className="size-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.total || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4" />
              Open
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(counts.reported || 0) + (counts.acknowledged || 0) + (counts.responding || 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{reports.filter((report) => report.severity === "critical").length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="size-4" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{counts.resolved || 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Report, vehicle, driver, dispatch, location"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadReports();
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Severity</Label>
            <Select value={filters.severity} onValueChange={(value) => setFilters((current) => ({ ...current, severity: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All severities</SelectItem>
                {SEVERITIES.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {SEVERITY_LABELS[severity]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Incident</Label>
            <Select
              value={filters.incidentType}
              onValueChange={(value) => setFilters((current) => ({ ...current, incidentType: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All incidents</SelectItem>
                {INCIDENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {INCIDENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_from">From</Label>
            <Input
              id="date_from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date_to">To</Label>
            <Input
              id="date_to"
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={loadReports} disabled={loading} className="w-full">
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Occurred</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Loading emergency reports...
                  </TableCell>
                </TableRow>
              ) : reports.length ? (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="font-medium">{report.report_no}</div>
                      <div className="max-w-72 truncate text-xs text-muted-foreground">{report.location_name || report.description}</div>
                    </TableCell>
                    <TableCell>
                      <div>{INCIDENT_TYPE_LABELS[report.incident_type]}</div>
                      <div className="text-xs text-muted-foreground">{SEVERITY_LABELS[report.severity]}</div>
                    </TableCell>
                    <TableCell>{report.vehicle?.vehicle_plate || "-"}</TableCell>
                    <TableCell>{report.driver?.name || "-"}</TableCell>
                    <TableCell>{dateTime(report.occurred_at)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(report.status)}>{STATUS_LABELS[report.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReport(report)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No emergency reports match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedReport ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReport.report_no}</DialogTitle>
                <DialogDescription>
                  {INCIDENT_TYPE_LABELS[selectedReport.incident_type]} reported {dateTime(selectedReport.reported_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Vehicle</p>
                    <p className="font-medium">{selectedReport.vehicle?.vehicle_plate || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Driver</p>
                    <p className="font-medium">{selectedReport.driver?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedReport.location_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dispatch Plan</p>
                    <p className="font-medium">{selectedReport.dispatchPlan?.doc_no || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap">{selectedReport.description}</p>
                </div>
                {selectedReport.immediate_action_taken ? (
                  <div>
                    <p className="text-muted-foreground">Immediate Action</p>
                    <p className="whitespace-pre-wrap">{selectedReport.immediate_action_taken}</p>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Status Action</Label>
                    <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as EmergencyStatus)}>
                      <SelectTrigger className="mt-2 w-full" disabled={!allowedNextStatuses.length}>
                        <SelectValue placeholder="Select next status" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNextStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Status</p>
                    <Badge className="mt-2" variant={statusVariant(selectedReport.status)}>
                      {STATUS_LABELS[selectedReport.status]}
                    </Badge>
                  </div>
                </div>
                {nextStatus === "resolved" || nextStatus === "cancelled" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="status_notes">{nextStatus === "resolved" ? "Resolution Notes" : "Cancellation Reason"}</Label>
                    <Textarea id="status_notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
                <Button onClick={applyStatusUpdate} disabled={!nextStatus || updating}>
                  {updating ? "Updating..." : "Update Status"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
