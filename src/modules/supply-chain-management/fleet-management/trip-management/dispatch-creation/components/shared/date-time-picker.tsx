"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const handleHourChange = (h: string) => {
    setHour(h);
    commit(date, h, minute);
  };

  const handleMinuteChange = (m: string) => {
    setMinute(m);
    commit(date, hour, m);
  };

  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0"),
  );
  const minutes = ["00", "15", "30", "45"];

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

          <Select value={hour} onValueChange={handleHourChange}>
            <SelectTrigger className="h-7 w-[64px] text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {hours.map((h) => (
                <SelectItem key={h} value={h} className="text-xs">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground text-sm font-medium">:</span>

          <Select value={minute} onValueChange={handleMinuteChange}>
            <SelectTrigger className="h-7 w-[64px] text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
