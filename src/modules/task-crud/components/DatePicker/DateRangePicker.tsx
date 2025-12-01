"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/buttons";
import { Calendar } from "@/modules/task-crud/components/ui/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const displayText = React.useMemo(() => {
    if (!value?.from) return placeholder;
    if (!value?.to) return format(value.from, "PPP");
    return `${format(value.from, "PPP")} - ${format(value.to, "PPP")}`;
  }, [value, placeholder]);

  const handleSelectRange = React.useCallback((range: DateRange | undefined) => {
    onChange?.(range);
    if (range?.from && range?.to) {
      setOpen(false);
    }
  }, [onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          intent="secondary"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value?.from && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={handleSelectRange}
          disabled={disabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
