"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { useState } from "react";

interface DateTimePickerProps {
  value?: string; // ISO string or datetime-local string
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  disabled,
}: DateTimePickerProps) {
  const parsed = value ? new Date(value) : undefined;

  const [date, setDate] = useState<Date | undefined>(parsed);
  const [hour, setHour] = useState<string>(
    parsed ? String(parsed.getHours()).padStart(2, "0") : "08",
  );
  const [minute, setMinute] = useState<string>(
    parsed ? String(parsed.getMinutes()).padStart(2, "0") : "00",
  );
  const [open, setOpen] = useState(false);

  const commit = (d: Date | undefined, h: string, m: string) => {
    if (!d) return;
    const result = new Date(d);
    result.setHours(Number(h), Number(m), 0, 0);
    // Return as datetime-local string
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T${pad(result.getHours())}:${pad(result.getMinutes())}`;
    onChange?.(local);
  };

  const handleDateSelect = (d: Date | undefined) => {
    setDate(d);
    commit(d, hour, minute);
  };

  const handleHourChange = (v: string) => {
    const numeric = v.replace(/\D/g, "").slice(0, 2);
    if (numeric === "") {
      setHour("");
      return;
    }
    const val = parseInt(numeric, 10);
    const clamped = Math.min(val, 23);
    const finalStr = String(clamped);
    setHour(finalStr);
    commit(date, finalStr.padStart(2, "0"), minute);
  };

  const handleMinuteChange = (v: string) => {
    const numeric = v.replace(/\D/g, "").slice(0, 2);
    if (numeric === "") {
      setMinute("");
      return;
    }
    const val = parseInt(numeric, 10);
    const clamped = Math.min(val, 59);
    const finalStr = String(clamped);
    setMinute(finalStr);
    commit(date, hour, finalStr.padStart(2, "0"));
  };

  const handleBlur = () => {
    // Ensure padding on blur
    setHour(prev => (prev ? prev.padStart(2, "0") : "00"));
    setMinute(prev => (prev ? prev.padStart(2, "0") : "00"));
    commit(date, hour.padStart(2, "0"), minute.padStart(2, "0"));
  };

  const displayValue = date
    ? `${format(date, "MMM d, yyyy")} · ${hour}:${minute}`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start text-sm font-normal gap-2 px-3",
            !displayValue && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{displayValue ?? placeholder}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          className="rounded-t-md"
        />

        <Separator />

        {/* Time row */}
        <div className="flex items-center gap-2 px-3 py-3">
          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground mr-1">Time</p>

          <div className="flex items-center group/hour">
            <Input
              className="h-7 w-12 text-center text-xs px-1 focus-visible:ring-1 focus-visible:ring-primary border-muted-foreground/20"
              value={hour}
              onChange={(e) => handleHourChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="HH"
            />
          </div>

          <span className="text-muted-foreground text-sm font-medium mx-0.5">:</span>

          <div className="flex items-center group/minute">
            <Input
              className="h-7 w-12 text-center text-xs px-1 focus-visible:ring-1 focus-visible:ring-primary border-muted-foreground/20"
              value={minute}
              onChange={(e) => handleMinuteChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="MM"
            />
          </div>

          <Button
            size="sm"
            className="ml-auto h-7 px-3 text-xs"
            onClick={() => setOpen(false)}
            disabled={!date}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
