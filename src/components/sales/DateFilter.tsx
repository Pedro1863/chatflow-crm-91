import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateRange = {
  from: Date;
  to: Date;
};

interface DateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function generateMonthOptions(): { label: string; from: Date; to: Date }[] {
  const options: { label: string; from: Date; to: Date }[] = [];
  const now = new Date();
  // From Dec 2025 to current month
  const start = new Date(2025, 11, 1); // Dec 2025
  let current = startOfMonth(now);

  while (current >= start) {
    options.push({
      label: format(current, "MMMM yyyy", { locale: ptBR }),
      from: startOfMonth(current),
      to: endOfMonth(current),
    });
    current = subMonths(current, 1);
  }
  return options;
}

const DateFilter = ({ value, onChange }: DateFilterProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"month" | "custom">("month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.to);

  const monthOptions = generateMonthOptions();

  const currentLabel = (() => {
    const fromStr = format(value.from, "dd/MM/yy");
    const toStr = format(value.to, "dd/MM/yy");
    // Check if it matches a full month
    const matchedMonth = monthOptions.find(
      (m) =>
        m.from.getTime() === startOfMonth(value.from).getTime() &&
        m.to.getTime() === endOfMonth(value.from).getTime() &&
        value.from.getMonth() === value.to.getMonth() &&
        value.from.getFullYear() === value.to.getFullYear()
    );
    if (matchedMonth) {
      return matchedMonth.label.charAt(0).toUpperCase() + matchedMonth.label.slice(1);
    }
    return `${fromStr} — ${toStr}`;
  })();

  const handleMonthSelect = (opt: { from: Date; to: Date }) => {
    onChange({ from: opt.from, to: opt.to });
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {currentLabel}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex border-b border-border">
          <button
            className={cn(
              "flex-1 px-4 py-2 text-xs font-medium transition-colors",
              mode === "month"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode("month")}
          >
            Mês
          </button>
          <button
            className={cn(
              "flex-1 px-4 py-2 text-xs font-medium transition-colors",
              mode === "custom"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setMode("custom")}
          >
            Período
          </button>
        </div>

        {mode === "month" ? (
          <div className="max-h-[240px] overflow-y-auto p-1">
            {monthOptions.map((opt) => {
              const isActive =
                startOfMonth(value.from).getTime() === opt.from.getTime() &&
                value.from.getMonth() === value.to.getMonth();
              return (
                <button
                  key={opt.label}
                  onClick={() => handleMonthSelect(opt)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-sm text-sm capitalize transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">De</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {customFrom ? format(customFrom, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={setCustomFrom}
                    className="p-3 pointer-events-auto"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Até</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    {customTo ? format(customTo, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={setCustomTo}
                    className="p-3 pointer-events-auto"
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!customFrom || !customTo}
              onClick={handleApplyCustom}
            >
              Aplicar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DateFilter;
export { generateMonthOptions };
