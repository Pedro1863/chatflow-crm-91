import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "stable";

interface TrendIndicatorProps {
  value: number;
  suffix?: string;
  invertColor?: boolean; // true = up is bad (e.g. churn)
  className?: string;
}

export function getTrend(current: number, previous: number): TrendDirection {
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return "stable";
  return diff > 0 ? "up" : "down";
}

export function getVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const TrendIndicator = ({ value, suffix = "%", invertColor = false, className }: TrendIndicatorProps) => {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.5;

  const colorClass = isNeutral
    ? "text-muted-foreground"
    : (isPositive && !invertColor) || (!isPositive && invertColor)
      ? "text-primary"
      : "text-destructive";

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", colorClass, className)}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
};

export default TrendIndicator;
