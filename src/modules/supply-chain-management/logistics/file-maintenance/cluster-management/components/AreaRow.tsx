import { useState, useEffect, useMemo } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { MapPin, Trash2 } from "lucide-react";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { AreaCombobox as Combobox } from "./AreaCombobox";
import { ClusterFormValues, ClusterWithAreas } from "../types";
import { fetchCities, fetchAllBarangays, BarangayItem } from "../providers/fetchProviders";
import { cn } from "@/lib/utils";

const selectBase = "h-9 bg-background border-input transition-all";
const selectFocus =
  "outline-none focus:outline-none " +
  "focus:ring-2 focus:ring-ring focus:ring-offset-0 " +
  "focus:border-ring";

interface AreaRowProps {
  index: number;
  form: UseFormReturn<ClusterFormValues>;
  remove: (index: number) => void;
  canRemove: boolean;
  provinces: { code: string; name: string }[];
  allClusters: ClusterWithAreas[];
  currentClusterId?: number;
}

export function AreaRow({
  index,
  form,
  remove,
  canRemove,
  provinces,
  allClusters,
  currentClusterId,
}: AreaRowProps) {
  const [cities, setCities] = useState<{ code: string; name: string }[]>([]);
  const [allProvincialBarangays, setAllProvincialBarangays] = useState<BarangayItem[]>([]);
  const [barangays, setBarangays] = useState<{ code: string; name: string }[]>([]);

  // For initial load during Edit - using useWatch for reactivity
  const currentProvince = useWatch({ control: form.control, name: `areas.${index}.province` }) || "";
  const currentCity = useWatch({ control: form.control, name: `areas.${index}.city` }) || "";
  const currentBarangay = useWatch({ control: form.control, name: `areas.${index}.baranggay` }) || "";

  // Watch all areas in form to prevent internal duplicates
  const allAreasInForm = useWatch({ control: form.control, name: "areas" }) || [];

  useEffect(() => {
    let mounted = true;

    const initializeAreas = async () => {
      // Only initialize if we have provinces and an initial province set, but cities aren't loaded yet.
      if (provinces.length === 0 || !currentProvince || cities.length > 0) return;

      const p = provinces.find((x) => x.name.toLowerCase() === currentProvince.toLowerCase());
      if (!p) return;

      // Eager-load: fetch cities AND all barangays for this province in parallel
      const [fetchedCities, fetchedAllBrgys] = await Promise.all([
        fetchCities(p.code),
        fetchAllBarangays(p.code),
      ]);
      if (!mounted) return;
      setCities(fetchedCities);
      setAllProvincialBarangays(fetchedAllBrgys);

      // Filter barangays locally if there's an initial city
      if (currentCity) {
        const c = fetchedCities.find((x) => x.name.toLowerCase() === currentCity.toLowerCase());
        if (c) {
          const filtered = fetchedAllBrgys.filter(
            (b) => b.cityCode === c.code || b.municipalityCode === c.code
          );
          if (mounted) setBarangays(filtered);
        }
      }
    };

    initializeAreas();

    return () => { mounted = false; };
  }, [provinces, currentProvince, currentCity, cities.length]);

  const onProvinceChange = async (provinceCode: string) => {
    const provinceName = provinces.find((p) => p.code === provinceCode)?.name || "";
    form.setValue(`areas.${index}.province`, provinceName);
    form.setValue(`areas.${index}.city`, "");
    form.setValue(`areas.${index}.baranggay`, "");
    setCities([]);
    setAllProvincialBarangays([]);
    setBarangays([]);

    if (provinceCode) {
      // Eager-load: fetch cities AND all barangays in parallel
      const [fetchedCities, fetchedAllBrgys] = await Promise.all([
        fetchCities(provinceCode),
        fetchAllBarangays(provinceCode),
      ]);
      setCities(fetchedCities);
      setAllProvincialBarangays(fetchedAllBrgys);
    }
  };

  const onCityChange = (cityCode: string) => {
    const cityName = cities.find((c) => c.code === cityCode)?.name || "";
    form.setValue(`areas.${index}.city`, cityName);
    form.setValue(`areas.${index}.baranggay`, "");

    // Filter barangays instantly from the pre-loaded provincial list (0ms)
    if (cityCode) {
      const filtered = allProvincialBarangays.filter(
        (b) => b.cityCode === cityCode || b.municipalityCode === cityCode
      );
      setBarangays(filtered);
    } else {
      setBarangays([]);
    }
  };

  const onBarangayChange = (barangayCode: string) => {
    const brgyName = barangays.find((b) => b.code === barangayCode)?.name || "";
    form.setValue(`areas.${index}.baranggay`, brgyName);
  };

  // ── Smart Filtering Logic (memoized for speed) ─────────────────────
  //
  // BUSINESS RULES:
  // 1. If a record has City + NO Barangay → entire city is claimed (all barangays)
  // 2. If a record has City + specific Barangay → only that barangay is claimed
  //    The city remains selectable for other clusters/rows to pick OTHER barangays.

  /** Normalize strings for safe comparison (handles nulls, extra spaces, casing) */
  const norm = (s?: string | null): string =>
    (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  // Memoize the claimed sets so they only recalculate when clusters or form areas change
  const { fullyClaimedCities, claimedBarangays } = useMemo(() => {
    const claimed = new Set<string>();
    const claimedBrgy = new Set<string>();

    // A. Check OTHER clusters in the DB
    allClusters?.forEach((cluster) => {
      if (cluster.id === currentClusterId) return;
      cluster.areas.forEach((area) => {
        const c = norm(area.city);
        const b = norm(area.baranggay);
        if (c && !b) claimed.add(c);
        if (c && b) claimedBrgy.add(`${c}::${b}`);
      });
    });

    // B. Check peer rows in THE SAME FORM
    allAreasInForm.forEach((area, i) => {
      if (i === index) return;
      const c = norm(area.city);
      const b = norm(area.baranggay);
      if (c && !b) claimed.add(c);
      if (c && b) claimedBrgy.add(`${c}::${b}`);
    });

    return { fullyClaimedCities: claimed, claimedBarangays: claimedBrgy };
  }, [allClusters, currentClusterId, allAreasInForm, index]);

  // Memoize filtered lists so they only recalculate when source data changes
  const availableCities = useMemo(
    () => cities.filter((c) => !fullyClaimedCities.has(norm(c.name))),
    [cities, fullyClaimedCities]
  );

  const availableBarangays = useMemo(() => {
    const cityKey = norm(currentCity);
    return barangays.filter((b) => !claimedBarangays.has(`${cityKey}::${norm(b.name)}`));
  }, [barangays, currentCity, claimedBarangays]);

  // Pre-build name→code lookup Maps for O(1) value resolution in render
  const provinceCodeMap = useMemo(
    () => new Map(provinces.map((p) => [p.name.toLowerCase(), p.code])),
    [provinces]
  );
  const cityCodeMap = useMemo(
    () => new Map(availableCities.map((c) => [c.name.toLowerCase(), c.code])),
    [availableCities]
  );
  const brgyCodeMap = useMemo(
    () => new Map(availableBarangays.map((b) => [b.name.toLowerCase(), b.code])),
    [availableBarangays]
  );

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          Area {index + 1}
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <FormField<ClusterFormValues>
          control={form.control}
          name={`areas.${index}.province`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                Province <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  options={provinces.map((p) => ({
                    value: p.code,
                    label: p.name,
                  }))}
                  value={provinceCodeMap.get(String(field.value || "").toLowerCase()) || ""}
                  onValueChange={(val) => onProvinceChange(val)}
                  placeholder="Select Province"
                  className={cn(selectBase, selectFocus)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField<ClusterFormValues>
          control={form.control}
          name={`areas.${index}.city`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">
                City <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Combobox
                  options={availableCities.map((c) => ({
                    value: c.code,
                    label: c.name,
                  }))}
                  value={cityCodeMap.get(String(field.value || "").toLowerCase()) || ""}
                  onValueChange={(val) => onCityChange(val)}
                  placeholder="Select City"
                  disabled={!availableCities.length}
                  className={cn(selectBase, selectFocus)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField<ClusterFormValues>
          control={form.control}
          name={`areas.${index}.baranggay`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Barangay</FormLabel>
              <FormControl>
                <Combobox
                  options={availableBarangays.map((b) => ({
                    value: b.code,
                    label: b.name,
                  }))}
                  value={brgyCodeMap.get(String(field.value || "").toLowerCase()) || ""}
                  onValueChange={(val) => onBarangayChange(val)}
                  placeholder="Select Barangay"
                  disabled={!availableBarangays.length}
                  className={cn(selectBase, selectFocus)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
