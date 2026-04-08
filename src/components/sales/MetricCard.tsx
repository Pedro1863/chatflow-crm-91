import { Card, CardContent } from "@/components/ui/card";
import TrendIndicator from "./TrendIndicator";

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  trend?: number;
  invertTrend?: boolean;
  onClick?: () => void;
}

const MetricCard = ({ icon: Icon, label, value, sub, trend, invertTrend, onClick }: MetricCardProps) => {
  return (
    <Card
      className={`transition-all duration-200 border-border/50 ${
        onClick ? "cursor-pointer hover:border-primary/50 hover:glow-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {trend !== undefined && <TrendIndicator value={trend} invertColor={invertTrend} />}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
