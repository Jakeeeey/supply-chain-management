import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
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
import { ClusterFormValues } from "../types";
import { fetchCities, fetchBarangays } from "../providers/fetchProviders";
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
}

export function AreaRow({
  index,
  form,
  remove,
  canRemove,
  provinces,
}: AreaRowProps) {
  const [cities, setCities] = useState<{ code: string; name: string }[]>([]);
  const [barangays, setBarangays] = useState<{ code: string; name: string }[]>([]);

  // For initial load during Edit
  const currentProvince = form.getValues(`areas.${index}.province`);
  const currentCity = form.getValues(`areas.${index}.city`);

  useEffect(() => {
    let mounted = true;
    if (provinces.length > 0 && currentProvince) {
      const p = provinces.find((x) => x.name === currentProvince);
      if (p) {
        fetchCities(p.code).then((data) => {
          if (mounted) setCities(data);
        });
      }
    }
    return () => { mounted = false; };
  }, [provinces, currentProvince]);

  useEffect(() => {
    let mounted = true;
    if (cities.length > 0 && currentCity) {
      const c = cities.find((x) => x.name === currentCity);
      if (c) {
        fetchBarangays(c.code).then((data) => {
          if (mounted) setBarangays(data);
        });
      }
    }
    return () => { mounted = false; };
  }, [cities, currentCity]);

  const onProvinceChange = async (provinceCode: string) => {
    const provinceName = provinces.find((p) => p.code === provinceCode)?.name || "";
    form.setValue(`areas.${index}.province`, provinceName);
    form.setValue(`areas.${index}.city`, "");
    form.setValue(`areas.${index}.baranggay`, "");
    setCities([]);
    setBarangays([]);

    if (provinceCode) {
      const data = await fetchCities(provinceCode);
      setCities(data);
    }
  };

  const onCityChange = async (cityCode: string) => {
    const cityName = cities.find((c) => c.code === cityCode)?.name || "";
    form.setValue(`areas.${index}.city`, cityName);
    form.setValue(`areas.${index}.baranggay`, "");
    setBarangays([]);

    if (cityCode) {
      const data = await fetchBarangays(cityCode);
      setBarangays(data);
    }
  };

  const onBarangayChange = (barangayCode: string) => {
    const brgyName = barangays.find((b) => b.code === barangayCode)?.name || "";
    form.setValue(`areas.${index}.baranggay`, brgyName);
  };

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
                  value={provinces.find((p) => p.name === field.value)?.code}
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
              <FormLabel className="text-xs">City</FormLabel>
              <FormControl>
                <Combobox
                  options={cities.map((c) => ({
                    value: c.code,
                    label: c.name,
                  }))}
                  value={cities.find((c) => c.name === field.value)?.code}
                  onValueChange={(val) => onCityChange(val)}
                  placeholder="Select City"
                  disabled={!cities.length}
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
                  options={barangays.map((b) => ({
                    value: b.code,
                    label: b.name,
                  }))}
                  value={barangays.find((b) => b.name === field.value)?.code}
                  onValueChange={(val) => onBarangayChange(val)}
                  placeholder="Select Barangay"
                  disabled={!barangays.length}
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
