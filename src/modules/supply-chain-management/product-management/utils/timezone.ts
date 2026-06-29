import { fetchItems } from "@/modules/supply-chain-management/product-management/sku/sku-creation/services/sku-api";

let cachedTimezone: string | null = null;

interface GeneralSetting {
  setting_key: string;
  setting_value: string;
}

/**
 * Fetches the timezone setting key from the database and caches it.
 */
export async function fetchTimezone(): Promise<string> {
  if (cachedTimezone) return cachedTimezone;
  try {
    const res = await fetchItems<GeneralSetting>("/items/general_setting");
    const tzSetting = res.data?.find((item) => item.setting_key === "time_zone");
    if (tzSetting?.setting_value) {
      cachedTimezone = tzSetting.setting_value;
      return cachedTimezone;
    }
  } catch (error) {
    console.error("Failed to fetch timezone from general_setting, falling back to Asia/Manila:", error);
  }
  return "Asia/Manila";
}

/**
 * Formats a Date object as an ISO-like string in the target timeZone (e.g. Asia/Manila)
 * with the correct timezone offset (e.g. +08:00).
 */
export function formatInTimeZone(date: Date, timeZone: string): string {
  try {
    const tzString = date.toLocaleString("en-US", { timeZone, timeZoneName: "longOffset" });
    const match = tzString.match(/GMT([+-]\d+)(?::(\d+))?/);
    let offsetMinutes = 0;
    let offsetStr = "+00:00";
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      offsetMinutes = hours * 60 + (hours >= 0 ? minutes : -minutes);
      const sign = hours >= 0 ? "+" : "-";
      const absHours = Math.abs(hours);
      const absMinutes = Math.abs(minutes);
      offsetStr = `${sign}${String(absHours).padStart(2, "0")}:${String(absMinutes).padStart(2, "0")}`;
    }
    
    const shifted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
    return shifted.toISOString().replace("Z", offsetStr);
  } catch (error) {
    console.error(`Error formatting date for timezone ${timeZone}:`, error);
    const phtOffset = 8 * 60 * 60 * 1000;
    return new Date(date.getTime() + phtOffset).toISOString().replace("Z", "+08:00");
  }
}

/**
 * Helper to get the current timestamp in the database-defined timezone.
 */
export async function getDatabaseTimeISO(): Promise<string> {
  const tz = await fetchTimezone();
  return formatInTimeZone(new Date(), tz);
}
