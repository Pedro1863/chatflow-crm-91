import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertLevel = "success" | "warning" | "danger";

interface AlertBadgeProps {
  level: AlertLevel;
  message: string;
  className?: string;
}

const levelStyles: Record<AlertLevel, string> = {
  success: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
};

const AlertBadge = ({ level, message, className }: AlertBadgeProps) => {
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium", levelStyles[level], className)}>
      <AlertTriangle className="h-3 w-3" />
      {message}
    </div>
  );
};

export default AlertBadge;
