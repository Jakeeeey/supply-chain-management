"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, MapPin, Send, Siren, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { INCIDENT_TYPE_LABELS, INCIDENT_TYPES, SEVERITIES, SEVERITY_LABELS } from "../constants";
import { createEmergencyReport, fetchEmergencyLookups } from "../providers/fetchProvider";
import type { EmergencyIncidentType, EmergencyLookups, EmergencyReportPayload, EmergencySeverity } from "../types";

type FormState = {
  incident_type: EmergencyIncidentType;
  severity: EmergencySeverity;
  vehicle_id: string;
  driver_user_id: string;
  dispatch_plan_id: string;
  occurred_at: string;
  location_name: string;
  description: string;
  immediate_action_taken: string;
  contact_name: string;
  contact_phone: string;
};

const NONE = "none";

function defaultForm(): FormState {
  return {
    incident_type: "breakdown",
    severity: "medium",
    vehicle_id: NONE,
    driver_user_id: NONE,
    dispatch_plan_id: NONE,
    occurred_at: (() => {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      return new Date(now.getTime() - offset).toISOString().slice(0, 16);
    })(),
    location_name: "",
    description: "",
    immediate_action_taken: "",
    contact_name: "",
    contact_phone: "",
  };
}

function selectedNumber(value: string) {
  return value === NONE ? null : Number(value);
}

export default function ReportEmergencyModule() {
  const [lookups, setLookups] = useState<EmergencyLookups>({ vehicles: [], drivers: [], dispatchPlans: [] });
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdReportNo, setCreatedReportNo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchEmergencyLookups()
      .then((data) => {
        if (alive) setLookups(data);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load form options"))
      .finally(() => {
        if (alive) setLoadingLookups(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const selectedDispatchPlan = useMemo(
    () => lookups.dispatchPlans.find((plan) => String(plan.id) === form.dispatch_plan_id),
    [form.dispatch_plan_id, lookups.dispatchPlans]
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.description.trim()) {
      toast.error("Incident description is required");
      return;
    }
    if (!form.occurred_at) {
      toast.error("Incident date and time is required");
      return;
    }

    const payload: EmergencyReportPayload = {
      incident_type: form.incident_type,
      severity: form.severity,
      vehicle_id: selectedNumber(form.vehicle_id),
      driver_user_id: selectedNumber(form.driver_user_id),
      dispatch_plan_id: selectedNumber(form.dispatch_plan_id),
      occurred_at: form.occurred_at,
      location_name: form.location_name,
      description: form.description,
      immediate_action_taken: form.immediate_action_taken,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
    };

    setSubmitting(true);
    try {
      const report = await createEmergencyReport(payload);
      setCreatedReportNo(report.report_no);
      setForm(defaultForm());
      toast.success(`Emergency report ${report.report_no} submitted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit emergency report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Report Emergency</h1>
          <p className="text-sm text-muted-foreground">
            Log vehicle breakdowns, accidents, and other fleet emergencies for follow-up.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <Siren className="size-4 text-destructive" />
          <span className="font-medium">Fleet Emergency Intake</span>
        </div>
      </div>

      {createdReportNo ? (
        <Card className="border-emerald-200 bg-emerald-50/70 text-emerald-950">
          <CardContent className="flex flex-col gap-1 pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Report submitted</p>
              <p className="text-sm">Reference number: {createdReportNo}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreatedReportNo(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Incident Details
            </CardTitle>
            <CardDescription>Required fields are incident type, severity, time, and description.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Incident Type</Label>
                <Select
                  value={form.incident_type}
                  onValueChange={(value) => updateField("incident_type", value as EmergencyIncidentType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {INCIDENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(value) => updateField("severity", value as EmergencySeverity)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {SEVERITY_LABELS[severity]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="occurred_at">Incident Date and Time</Label>
              <Input
                id="occurred_at"
                type="datetime-local"
                value={form.occurred_at}
                onChange={(event) => updateField("occurred_at", event.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location_name">Location</Label>
              <Input
                id="location_name"
                placeholder="Road, branch, warehouse, or nearest landmark"
                value={form.location_name}
                onChange={(event) => updateField("location_name", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="min-h-28"
                placeholder="Describe what happened, vehicle condition, cargo impact, injuries, and immediate risks."
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="immediate_action_taken">Immediate Action Taken</Label>
              <Textarea
                id="immediate_action_taken"
                className="min-h-20"
                placeholder="Tow request, first aid, traffic control, police report, or temporary repair."
                value={form.immediate_action_taken}
                onChange={(event) => updateField("immediate_action_taken", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4" />
                Fleet References
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Vehicle</Label>
                <Select value={form.vehicle_id} onValueChange={(value) => updateField("vehicle_id", value)}>
                  <SelectTrigger className="w-full" disabled={loadingLookups}>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No vehicle selected</SelectItem>
                    {lookups.vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.vehicle_id} value={String(vehicle.vehicle_id)}>
                        {vehicle.vehicle_plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Driver</Label>
                <Select value={form.driver_user_id} onValueChange={(value) => updateField("driver_user_id", value)}>
                  <SelectTrigger className="w-full" disabled={loadingLookups}>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No driver selected</SelectItem>
                    {lookups.drivers.map((driver) => (
                      <SelectItem key={driver.user_id} value={String(driver.user_id)}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Dispatch Plan</Label>
                <Select value={form.dispatch_plan_id} onValueChange={(value) => updateField("dispatch_plan_id", value)}>
                  <SelectTrigger className="w-full" disabled={loadingLookups}>
                    <SelectValue placeholder="Select dispatch plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No dispatch plan selected</SelectItem>
                    {lookups.dispatchPlans.map((plan) => (
                      <SelectItem key={plan.id} value={String(plan.id)}>
                        {plan.doc_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDispatchPlan ? (
                  <p className="text-xs text-muted-foreground">Status: {selectedDispatchPlan.status || "Not specified"}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4" />
                Contact Person
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="contact_name">Name</Label>
                <Input
                  id="contact_name"
                  value={form.contact_name}
                  onChange={(event) => updateField("contact_name", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  value={form.contact_phone}
                  onChange={(event) => updateField("contact_phone", event.target.value)}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                <Send className="size-4" />
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
