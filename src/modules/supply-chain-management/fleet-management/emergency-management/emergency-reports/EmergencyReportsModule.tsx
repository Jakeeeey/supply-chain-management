"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, ExternalLink, Loader2, MapPin, Phone, Search, Siren, X } from "lucide-react";
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

const ReportMapPanel = dynamic(() => import("./ReportMapPanel"), { ssr: false });

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const attachmentsList = useMemo(() => {
    if (!selectedReport?.attachments) return [];
    try {
      return JSON.parse(selectedReport.attachments) as string[];
    } catch {
      return [];
    }
  }, [selectedReport]);

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null || attachmentsList.length === 0) return;
    setLightboxIndex((prev) => (prev! - 1 + attachmentsList.length) % attachmentsList.length);
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (lightboxIndex === null || attachmentsList.length === 0) return;
    setLightboxIndex((prev) => (prev! + 1) % attachmentsList.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "ArrowLeft") handlePrevImage();
      if (e.key === "ArrowRight") handleNextImage();
      if (e.key === "Escape") setLightboxIndex(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, attachmentsList]);

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
        <DialogContent className="sm:max-w-3xl lg:max-w-4xl p-6 overflow-hidden">
          {selectedReport ? (
            <>
              <DialogHeader className="border-b pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-bold tracking-tight">{selectedReport.report_no}</DialogTitle>
                  <Badge variant={statusVariant(selectedReport.status)}>
                    {STATUS_LABELS[selectedReport.status]}
                  </Badge>
                  <Badge variant={selectedReport.severity === "critical" ? "destructive" : "outline"}>
                    {SEVERITY_LABELS[selectedReport.severity]} Severity
                  </Badge>
                </div>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {INCIDENT_TYPE_LABELS[selectedReport.incident_type]} reported {dateTime(selectedReport.reported_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4 max-h-[60vh] overflow-y-auto pr-1">
                {/* Left Column: Metadata & Description */}
                <div className="space-y-4">
                  <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                    <h3 className="font-semibold leading-none tracking-tight mb-3 text-sm uppercase text-muted-foreground">Incident Metadata</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Vehicle Plate</p>
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                          {selectedReport.vehicle?.vehicle_plate || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Driver Name</p>
                        <p className="font-semibold text-foreground mt-0.5">{selectedReport.driver?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Dispatch Reference</p>
                        <p className="font-semibold text-foreground mt-0.5">{selectedReport.dispatchPlan?.doc_no || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Contact Details</p>
                        {selectedReport.contact_phone ? (
                          <a
                            href={`tel:${selectedReport.contact_phone}`}
                            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="size-3.5 inline shrink-0" />
                            <span>{selectedReport.contact_name || "Driver"} ({selectedReport.contact_phone})</span>
                          </a>
                        ) : (
                          <p className="font-semibold text-foreground mt-0.5">-</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">Location Name</p>
                        <p className="font-semibold text-foreground mt-0.5 flex items-start gap-1">
                          <MapPin className="size-4 text-red-500 shrink-0 mt-0.5" />
                          <span>{selectedReport.location_name || "-"}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{"Driver's Description"}</h4>
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap bg-muted/40 rounded-md p-3 border">
                        {selectedReport.description || "No description provided."}
                      </p>
                    </div>
                    {selectedReport.immediate_action_taken ? (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Immediate Action Taken</h4>
                        <p className="text-sm leading-relaxed text-amber-950 bg-amber-50/50 dark:bg-amber-950/10 rounded-md p-3 border border-amber-200/60 whitespace-pre-wrap">
                          {selectedReport.immediate_action_taken}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Status Transition Control */}
                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <h3 className="font-semibold leading-none tracking-tight mb-3 text-sm uppercase text-muted-foreground">Operational Actions</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs font-medium uppercase text-muted-foreground">Transition Status</Label>
                        <Select value={nextStatus} onValueChange={(value) => setNextStatus(value as EmergencyStatus)}>
                          <SelectTrigger className="mt-1.5 w-full" disabled={!allowedNextStatuses.length}>
                            <SelectValue placeholder="Update status" />
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
                        <p className="text-xs font-medium uppercase text-muted-foreground">Current State</p>
                        <div className="mt-1.5">
                          <Badge variant={statusVariant(selectedReport.status)}>
                            {STATUS_LABELS[selectedReport.status]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {nextStatus === "resolved" || nextStatus === "cancelled" ? (
                      <div className="grid gap-1.5 mt-3">
                        <Label htmlFor="status_notes" className="text-xs font-medium uppercase text-muted-foreground">
                          {nextStatus === "resolved" ? "Resolution Notes" : "Cancellation Reason"}
                        </Label>
                        <Textarea
                          id="status_notes"
                          placeholder={nextStatus === "resolved" ? "Detail response actions, repairs made, assistance details..." : "Reason for cancellation..."}
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right Column: Spatial & Visual Map and Attachments */}
                <div className="space-y-4">
                  {/* Map View */}
                  {selectedReport.latitude != null && selectedReport.longitude != null ? (
                    <div className="rounded-lg border overflow-hidden shadow-sm">
                      <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Live Map Coordinate</span>
                        <span className="text-[10px] bg-white border px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                          {selectedReport.latitude.toFixed(5)}, {selectedReport.longitude.toFixed(5)}
                        </span>
                      </div>
                      <div className="h-64 relative">
                        <ReportMapPanel
                          latitude={selectedReport.latitude}
                          longitude={selectedReport.longitude}
                          locationName={selectedReport.location_name}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Attachments Section */}
                  {attachmentsList.length > 0 ? (
                    <div className="rounded-lg border p-4 shadow-sm">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                        <span>Incident Attachments</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                          {attachmentsList.length} photos
                        </span>
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {attachmentsList.map((uuid, idx) => (
                          <div
                            key={uuid}
                            onClick={() => setLightboxIndex(idx)}
                            className="group relative cursor-zoom-in overflow-hidden rounded-md border aspect-square bg-muted flex items-center justify-center hover:shadow-md transition-all duration-200"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "")}/assets/${uuid}?width=200&height=200&fit=cover`}
                              alt={`Attachment ${idx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                              <Search className="size-5 text-white/95" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <DialogFooter className="border-t pt-3">
                <Button variant="outline" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
                <Button onClick={applyStatusUpdate} disabled={!nextStatus || updating}>
                  {updating ? "Updating..." : "Update Status"}
                </Button>
              </DialogFooter>

              {/* Immersive Photo Lightbox Overlay */}
              {lightboxIndex !== null && attachmentsList.length > 0 && (
                <div
                  className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
                  onClick={() => setLightboxIndex(null)}
                >
                  {/* Top Bar */}
                  <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-6 text-white">
                    <span className="font-mono text-sm">
                      Image {lightboxIndex + 1} of {attachmentsList.length}
                    </span>
                    <div className="flex items-center gap-4">
                      <a
                        href={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "")}/assets/${attachmentsList[lightboxIndex]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-1.5 text-xs text-white/90 hover:text-white"
                        title="Open full resolution"
                      >
                        <ExternalLink className="size-4" />
                        <span>Full Resolution</span>
                      </a>
                      <button
                        onClick={() => setLightboxIndex(null)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X className="size-6" />
                      </button>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="relative flex items-center justify-center w-full max-w-5xl px-12 h-[80vh]">
                    {/* Left Arrow */}
                    {attachmentsList.length > 1 && (
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all duration-200 hover:scale-105 border border-white/10 z-10"
                      >
                        <ChevronLeft className="size-6" />
                      </button>
                    )}

                    {/* Image wrapper */}
                    <div
                      className="relative max-h-full max-w-full flex items-center justify-center animate-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "")}/assets/${attachmentsList[lightboxIndex]}`}
                        alt={`Incident photo ${lightboxIndex + 1}`}
                        className="max-h-[70vh] max-w-full rounded-md object-contain shadow-2xl border border-white/5"
                      />
                    </div>

                    {/* Right Arrow */}
                    {attachmentsList.length > 1 && (
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all duration-200 hover:scale-105 border border-white/10 z-10"
                      >
                        <ChevronRight className="size-6" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
