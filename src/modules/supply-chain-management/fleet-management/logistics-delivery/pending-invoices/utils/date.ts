import { format } from "date-fns";

export function yyyyMMdd(d: Date) {
  return format(d, "yyyy-MM-dd");
}
