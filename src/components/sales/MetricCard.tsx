import { Card, CardContent } from "@/components/ui/card";
import TrendIndicator from "./TrendIndicator";

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  trend?: number;
  invertTrend?: boolean;
}

const MetricCard = ({ icon: Icon, label, value, sub, trend, invertTrend }: MetricCardProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {trend !== undefined && <TrendIndicator value={trend} invertColor={invertTrend} />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
