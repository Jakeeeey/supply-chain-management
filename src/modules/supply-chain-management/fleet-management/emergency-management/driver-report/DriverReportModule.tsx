"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Siren,
  Truck,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createEmergencyReport,
  fetchDriverProfile,
} from "../providers/fetchProvider";
import type { DriverProfileResponse, EmergencyReport } from "../types";

type ReportingState = "initializing" | "ready" | "submitting" | "success" | "error" | "not-driver";

export default function DriverReportModule() {
  const router = useRouter();
  const initTriggered = useRef(false);

  const [state, setState] = useState<ReportingState>("initializing");
  const [progressText, setProgressText] = useState("");
  const [profile, setProfile] = useState<DriverProfileResponse | null>(null);
  const [report, setReport] = useState<EmergencyReport | null>(null);
  const [coords, setCoords] = useState<{ lat: number | null; lon: number | null }>({ lat: null, lon: null });
  const [errorMsg, setErrorMsg] = useState("");

  // Additional detail states
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [updatingDetails, setUpdatingDetails] = useState(false);

  useEffect(() => {
    if (initTriggered.current) return;
    initTriggered.current = true;

    async function loadContextFlow() {
      try {
        setProgressText("Initializing driver profile context...");
        
        // 1. Fetch driver profile
        const userProfile = await fetchDriverProfile();
        setProfile(userProfile);

        if (!userProfile.isDriver) {
          setState("not-driver");
          return;
        }

        // Prepopulate update fields
        setContactName(userProfile.user?.name || "");
        setContactPhone(userProfile.user?.user_contact || "");

        // 2. Request Geolocation
        setProgressText("Acquiring GPS location coordinates...");
        let lat: number | null = null;
        let lon: number | null = null;

        if ("geolocation" in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
              });
            });
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
            setCoords({ lat, lon });
          } catch (geoError) {
            console.warn("Geolocation warning or permission denied:", geoError);
            // Non-blocking, continue with null coords
          }
        }

        setState("ready");
      } catch (err) {
        console.error("Distress module initial loading error:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to load session details.");
        setState("error");
      }
    }

    void loadContextFlow();
  }, []);

  async function triggerSOSBroadcast() {
    if (!profile) return;
    
    setState("submitting");
    setProgressText("Broadcasting emergency distress signal...");
    
    try {
      const locationName = coords.lat
        ? `GPS: ${coords.lat.toFixed(6)}, ${coords.lon?.toFixed(6)}`
        : "Location Unknown";

      const newReport = await createEmergencyReport({
        incident_type: "other",
        severity: "critical",
        vehicle_id: profile.activeTrip?.vehicle_id || null,
        driver_user_id: profile.user?.user_id || null,
        dispatch_plan_id: profile.activeTrip?.id || null,
        occurred_at: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().replace("Z", ""),
        location_name: locationName,
        latitude: coords.lat,
        longitude: coords.lon,
        description: "Automated distress signal sent via Driver Quick Report SOS Distress button.",
        contact_name: profile.user?.name || "Driver",
        contact_phone: profile.user?.user_contact || "",
      });

      setReport(newReport);
      setState("success");
      toast.success("Distress signal dispatched successfully!");
    } catch (err) {
      console.error("SOS submission error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit SOS distress signal.");
      setState("error");
    }
  }

  async function handleUpdateDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!report) return;

    setUpdatingDetails(true);
    try {
      const response = await fetch(`/api/scm/fleet-management/emergency-management/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: `${report.description}\n\n[Driver Update]: ${additionalNotes}`,
          contact_name: contactName,
          contact_phone: contactPhone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update incident details");
      }

      const resData = await response.json();
      setReport(resData.report || report);
      toast.success("Distress details updated successfully");
      setAdditionalNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update details");
    } finally {
      setUpdatingDetails(false);
    }
  }

  // --- RENDERING VARIANTS ---

  if (state === "initializing" || state === "submitting") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-red-500/20 duration-1000" />
          <div className="relative rounded-full border border-red-500 bg-red-950/40 p-5 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <Loader2 className="size-10 animate-spin text-red-500" />
          </div>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {state === "initializing" ? "Setting Up SOS Panel" : "Broadcasting Emergency Signal"}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground max-w-sm">
          {progressText}
        </p>
      </div>
    );
  }

  if (state === "not-driver") {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card className="border-amber-500 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="size-5" />
              Not Registered as Driver
            </CardTitle>
            <CardDescription className="text-amber-200/80">
              This SOS Distress dashboard is designed for active fleet drivers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p>
              Your account (<strong>{profile?.user?.name || "Unknown User"}</strong>) is currently not registered as a driver in the Fleet Management database.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push("/scm/fleet-management/emergency-management/report-emergency")}>
                Go to Manual Report Portal
                <ArrowRight className="size-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => router.push("/scm/fleet-management/emergency-management/emergency-reports")}>
                View Active Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card className="border-red-500 bg-red-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="size-5" />
              SOS Interface Error
            </CardTitle>
            <CardDescription>
              We were unable to configure or dispatch your distress signal.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p className="text-red-300">
              Error details: <code>{errorMsg}</code>
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="destructive" onClick={() => { initTriggered.current = false; setState("initializing"); }}>
                Re-Initialize Interface
              </Button>
              <Button onClick={() => router.push("/scm/fleet-management/emergency-management/report-emergency")}>
                Fill Out Manual Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "ready") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Siren className="size-6 text-red-500 animate-pulse" />
              SOS Distress Console
            </h1>
            <p className="text-sm text-muted-foreground">
              Instant distress transmission for active delivery drivers.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/scm/fleet-management/emergency-management/emergency-reports")}
          >
            Monitor Reports Log
          </Button>
        </div>

        {/* DRIVER ACTIVE VEHICLE CONTEXT BLOCK */}
        <Card className="border-muted/50 bg-muted/20">
          <CardContent className="grid gap-4 p-5 text-sm md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">Active Driver</span>
              <div className="flex items-center gap-1.5 font-medium">
                <User className="size-4 text-muted-foreground" />
                <span>{profile?.user?.name || "Unknown"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">Assigned Vehicle</span>
              <div className="flex items-center gap-1.5 font-medium">
                <Truck className="size-4 text-muted-foreground" />
                <span>{profile?.activeTrip?.vehicle_plate || "Not Assigned"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">Active Dispatch Plan</span>
              <div className="font-medium text-foreground">
                {profile?.activeTrip?.doc_no || "No active trip found"}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground block">GPS Coordinates</span>
              <div className="flex items-center gap-1.5 font-medium">
                <Navigation className="size-4 text-muted-foreground" />
                <span>
                  {coords.lat ? `${coords.lat.toFixed(5)}, ${coords.lon?.toFixed(5)}` : "Locating..."}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOS BUTTON CONTAINER AND VISUALIZATION */}
        <Card className="border-red-500/20 bg-gradient-to-br from-red-950/20 via-background to-background p-6 md:p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="max-w-md space-y-2">
              <Badge variant="destructive" className="font-semibold px-2.5 py-0.5 animate-pulse uppercase tracking-wider text-xs">
                Emergency Beacon Ready
              </Badge>
              <h2 className="text-xl font-bold tracking-tight">Tap Button to Trigger Emergency</h2>
              <p className="text-sm text-muted-foreground">
                Tapping the SOS distress button below will instantly log your vehicle, active trip sequence, driver contact, and GPS location to the operations dashboard.
              </p>
            </div>

            {/* THE SOS BUTTON WRAPPER */}
            <div className="relative py-4">
              {/* Pulsing Concentric Glowing Rings */}
              <div className="absolute inset-0 m-auto size-44 animate-ping rounded-full bg-red-500/10 duration-1000" />
              <div className="absolute inset-0 m-auto size-36 animate-pulse rounded-full bg-red-500/15 duration-700" />

              {/* Physical SOS Button style */}
              <button
                onClick={triggerSOSBroadcast}
                className="relative z-10 m-auto flex size-36 flex-col items-center justify-center rounded-full border-4 border-red-900 bg-gradient-to-br from-red-500 via-red-600 to-red-800 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all hover:scale-105 active:scale-95 duration-150 focus:outline-none"
              >
                <Siren className="size-10 mb-1 animate-pulse" />
                <span className="text-2xl font-black tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  SOS
                </span>
                <span className="text-[9px] font-bold tracking-wider uppercase opacity-80 mt-0.5">
                  Distress
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-md px-3.5 py-2 max-w-lg">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Use this feature strictly for actual road hazards, medical issues, mechanical failure, or cargo compromise.</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // SUCCESS STATE
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* SUCCESS ALARM DASHBOARD HEADER */}
      <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/60 to-background p-6 shadow-[0_0_20px_rgba(220,38,38,0.15)] md:p-8">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-48 rounded-full bg-red-500/10 blur-3xl" />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-red-950/60 p-3.5 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse">
              <Siren className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="destructive" className="font-semibold uppercase tracking-wider">
                  Distress Active
                </Badge>
                <span className="text-xs text-muted-foreground">ID: {report?.report_no}</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-red-100">
                Distress Signal Dispatched
              </h1>
              <p className="text-sm text-red-200/60">
                Help is being coordinated. Control room operators have been notified of your status.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => router.push("/scm/fleet-management/emergency-management/emergency-reports")}
            className="w-full shrink-0 font-medium md:w-auto"
          >
            Monitor Response Board
            <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        {/* REPORT INFORMATION CARD */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileText className="size-5 text-red-500" />
                Reported Incident Details
              </CardTitle>
              <CardDescription>
                Details auto-populated from your driver account and location.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">Driver Profile</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <User className="size-4 text-muted-foreground" />
                    <span className="font-medium">{profile?.user?.name || "Unknown"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Vehicle Info</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Truck className="size-4 text-muted-foreground" />
                    <span className="font-medium">{profile?.activeTrip?.vehicle_plate || "Not Assigned"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Active Dispatch Plan</span>
                  <span className="font-medium block mt-0.5">
                    {profile?.activeTrip?.doc_no || "No active trip found"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Location Coords</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Navigation className="size-4 text-muted-foreground" />
                    <span className="font-medium">
                      {coords.lat ? `${coords.lat.toFixed(5)}, ${coords.lon?.toFixed(5)}` : "Unavailable"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <span className="text-xs text-muted-foreground block mb-0.5">Geo Address / Location Name</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-red-400" />
                  <span className="font-medium text-foreground">{report?.location_name || "Unknown"}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-0.5">Incident Description</span>
                <div className="rounded-lg bg-muted/40 p-3 text-muted-foreground border">
                  {report?.description}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* UPDATE FORM */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Update Incident Notes</CardTitle>
              <CardDescription>
                Provide updates about the situation, cargo security, or specific assistance needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateDetails} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_name">Primary Contact Name</Label>
                    <Input
                      id="contact_name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_phone">Primary Contact Phone</Label>
                    <Input
                      id="contact_phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Additional Info / Status Update</Label>
                  <Textarea
                    id="notes"
                    placeholder="e.g. Tow truck needed. Left front tire blown out. Cargo is secured."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className="min-h-24"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={updatingDetails}>
                  {updatingDetails ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" />
                      Updating...
                    </>
                  ) : (
                    "Submit Situation Update"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* SIDE BAR / ACTIONS */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold">Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-4">
              <div className="flex items-start gap-2">
                <Phone className="size-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Dispatch Hotdesk</p>
                  <p className="text-muted-foreground">+63 917 123 4567</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="size-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Fleet Operations Office</p>
                  <p className="text-muted-foreground">(02) 8888-8888</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="size-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">Roadside Assister</p>
                  <p className="text-muted-foreground">+63 918 765 4321</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/40 border">
            <CardContent className="p-4 text-xs space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-semibold">
                <CheckCircle2 className="size-4" />
                <span>Next steps taken:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
                <li>System logs your GPS location.</li>
                <li>Notification sent to logistics operations manager.</li>
                <li>Closest responder branch is alerted.</li>
                <li>Stay at your vehicle and keep this page open.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
