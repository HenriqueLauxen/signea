import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, CaptionProps } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CustomCaption({ displayMonth, ...props }: CaptionProps & { fromYear?: number; toYear?: number; onMonthChange?: (date: Date) => void }) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const fromYear = props.fromYear || currentYear - 100;
    const toYear = props.toYear || currentYear + 100;
    const yearsList = [];
    for (let year = fromYear; year <= toYear; year++) {
      yearsList.push(year);
    }
    return yearsList;
  }, [props.fromYear, props.toYear]);

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    const newDate = new Date(displayMonth.getFullYear(), newMonth, 1);
    if (props.onMonthChange) {
      props.onMonthChange(newDate);
    }
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    const newDate = new Date(newYear, displayMonth.getMonth(), 1);
    if (props.onMonthChange) {
      props.onMonthChange(newDate);
    }
  };

  return (
    <div className="flex justify-center gap-2 mb-2">
      <Select 
        value={displayMonth.getMonth().toString()} 
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="h-8 w-[120px] text-xs bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {months.map((month, index) => (
            <SelectItem key={index} value={index.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={displayMonth.getFullYear().toString()} 
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="h-8 w-[90px] text-xs bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border max-h-[200px]">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Calendar({ className, classNames, showOutsideDays = true, fromYear, toYear, month, onMonthChange, ...props }: CalendarProps & { fromYear?: number; toYear?: number }) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(month || new Date());

  React.useEffect(() => {
    if (month) {
      setCurrentMonth(month);
    }
  }, [month]);

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      month={currentMonth}
      onMonthChange={handleMonthChange}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "hidden",
        caption_dropdowns: "hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        day_today: "bg-accent/50 text-accent-foreground font-semibold",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        dropdown: "hidden",
        dropdown_month: "hidden",
        dropdown_year: "hidden",
        vhidden: "hidden",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Caption: (captionProps) => <CustomCaption {...captionProps} fromYear={fromYear} toYear={toYear} onMonthChange={handleMonthChange} />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
