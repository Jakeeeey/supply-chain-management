"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const manualStopSchema = z.object({
  remarks: z.string().min(1, "Location/Remarks is required"),
  distance: z.number().min(0, "Distance must be non-negative"),
  location: z.string().optional().nullable(),
});

type ManualStopValues = z.infer<typeof manualStopSchema>;

interface AddManualStopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (stop: { remarks: string; distance: number; latitude: number | null; longitude: number | null }) => void;
  editStop?: { remarks: string; distance: number; latitude?: number | null; longitude?: number | null };
}

// 🚀 MAP HELPER COMPONENT (CRM STYLED)
const renderMap = (locationString: string | null | undefined) => {
  if (!locationString || locationString.trim() === "") {
    return (
      <div className="w-full h-[300px] bg-muted/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-xs font-semibold">
        <MapPin className="h-6 w-6 mb-1 opacity-20" />
        <span>No Location Loaded</span>
      </div>
    );
  }

  // Google Maps embed accepts coordinates or query strings directly
  const query = encodeURIComponent(locationString.trim());

  return (
    <div className="w-full rounded-xl border border-border shadow-inner overflow-hidden relative mt-2 group">
      <iframe
        width="100%"
        height="300"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${query}&z=15&t=k&output=embed`}
      ></iframe>
      
      {/* Top Left: Open in Maps Link */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${query}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 left-3 bg-background/90 hover:bg-background backdrop-blur-md px-3 py-1.5 rounded-lg border border-border shadow-sm flex items-center gap-1.5 transition-colors text-[10px] font-bold text-primary"
      >
        <span>Open in Maps</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>

      {/* Top Right: Live Location Badge */}
      <div
        className="absolute top-3 right-3 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-sm flex items-center gap-1.5 pointer-events-none"
      >
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
          ></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest text-foreground">Live Location</span>
      </div>
    </div>
  );
};

export function AddManualStopModal({
  open,
  onOpenChange,
  onAdd,
  editStop,
}: AddManualStopModalProps) {
  const form = useForm<ManualStopValues>({
    resolver: zodResolver(manualStopSchema),
    defaultValues: {
      remarks: "",
      distance: 0,
      location: "",
    },
  });

  // Re-sync form when editStop changes or modal opens
  useEffect(() => {
    if (open) {
      const locationVal =
        editStop?.latitude !== undefined &&
        editStop?.latitude !== null &&
        editStop?.longitude !== undefined &&
        editStop?.longitude !== null
          ? `${editStop.latitude}, ${editStop.longitude}`
          : "";

      form.reset({
        remarks: editStop?.remarks || "",
        distance: editStop?.distance || 0,
        location: locationVal,
      });
    }
  }, [open, editStop, form]);

  const onSubmit = async (values: ManualStopValues) => {
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (values.location) {
      const trimmed = values.location.trim();
      const parts = trimmed.split(",");
      if (parts.length === 2) {
        const latVal = parseFloat(parts[0].trim());
        const lonVal = parseFloat(parts[1].trim());
        if (!isNaN(latVal) && !isNaN(lonVal)) {
          latitude = latVal;
          longitude = lonVal;
        }
      }

      // 🚀 Place Name Geocoding Fallback: resolve text query to coordinates
      if (latitude === null || longitude === null) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`,
            {
              headers: {
                "User-Agent": "SCM-Dispatch-Plan-App/1.0"
              }
            }
          );
          const data = await res.json();
          if (data && data[0]) {
            latitude = parseFloat(data[0].lat);
            longitude = parseFloat(data[0].lon);
          }
        } catch (err) {
          console.error("Nominatim geocoding failed:", err);
        }
      }
    }

    onAdd({
      remarks: values.remarks,
      distance: values.distance,
      latitude,
      longitude,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <DialogTitle>
              {editStop ? "Edit Manual Stop" : "Add Manual Stop"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.stopPropagation();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4 pt-2"
          >
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name / Remarks</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Branch B, Gas Station, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geo Tag (Coordinates or Place Name)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 14.5995, 120.9842 or Sweet Miabeth Bakehouse"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                  {renderMap(field.value)}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Distance (KM)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      step="any"
                      value={field.value !== undefined && field.value !== null ? field.value : ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editStop ? "Save Changes" : "Add Stop"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
