import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, AlertTriangle, UserX, Play, Loader2 } from "lucide-react";
import { useAutomationSettings, useToggleAutomation, useRunAutomation } from "@/hooks/use-automation-settings";

const zoneConfig: Record<string, { label: string; icon: React.ElementType; template: string; color: string }> = {
  saudavel: { label: "Saudáveis", icon: HeartPulse, template: "template_saudaveis", color: "text-primary" },
  em_risco: { label: "Em Risco", icon: AlertTriangle, template: "tamplate_cliente_risco", color: "text-chart-3" },
  inativo: { label: "Inativos", icon: UserX, template: "template_retencao_inativos", color: "text-destructive" },
};

export default function AutomationControls() {
  const { data: settings = [], isLoading } = useAutomationSettings();
  const toggleMutation = useToggleAutomation();
  const runMutation = useRunAutomation();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Carregando automação...</span>
        </CardContent>
      </Card>
    );
  }

  const anyEnabled = settings.some((s) => s.enabled);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Automação de Retenção
          </CardTitle>
          <div className="flex items-center gap-2">
            {anyEnabled && (
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-[10px]">
                ATIVA
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={!anyEnabled || runMutation.isPending}
              onClick={() => runMutation.mutate()}
              className="h-7 text-xs"
            >
              {runMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Executar Agora
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2.5">
          {["saudavel", "em_risco", "inativo"].map((zone) => {
            const config = zoneConfig[zone];
            const setting = settings.find((s) => s.zone === zone);
            const enabled = setting?.enabled ?? false;
            const Icon = config.icon;

            return (
              <div
                key={zone}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{config.label}</p>
                    <p className="text-[10px] text-muted-foreground">{config.template}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium ${enabled ? "text-primary" : "text-muted-foreground"}`}>
                    {enabled ? "ON" : "OFF"}
                  </span>
                  <Switch
                    checked={enabled}
                    disabled={toggleMutation.isPending}
                    onCheckedChange={(checked) => toggleMutation.mutate({ zone, enabled: checked })}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Envio automático às 09:00 quando o cliente muda de zona. Um envio por entrada na zona.
        </p>
      </CardContent>
    </Card>
  );
}
