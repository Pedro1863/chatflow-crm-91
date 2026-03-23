import { useState, useMemo } from "react";
import { useCustomers, useChurnMensal, useAquisicaoMensal, useOrders } from "@/hooks/use-sales-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Clock, Activity, TrendingUp, Loader2 } from "lucide-react";
import { differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";
import AlertBadge from "./AlertBadge";
import DateFilter, { type DateRange } from "./DateFilter";
import { mesesDesdeMarco2026 } from "@/lib/dashboard-utils";

function defaultRange(): DateRange {
  const now = new Date();
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

const ComportamentoSection = () => {
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: allOrders = [], isLoading: loadingO } = useOrders();
  const [showAllRisco, setShowAllRisco] = useState(false);
  const meses = mesesDesdeMarco2026();
  const { data: churnData = [] } = useChurnMensal(meses);
  const { data: aquisicaoData = [] } = useAquisicaoMensal(meses);
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);

  if (loadingC || loadingO) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando comportamento...
      </div>
    );
  }

  // Filter customers with activity in selected period
  const filteredCustomers = customers.filter((c) => {
    if (!c.data_ultimo_pedido) return false;
    const d = new Date(c.data_ultimo_pedido);
    return d >= dateRange.from && d <= dateRange.to;
  });

  const totalFiltered = filteredCustomers.length;
  const clientesRecompra = filteredCustomers.filter((c) => (c.total_pedidos || 0) > 1);
  const taxaRecompra = totalFiltered > 0 ? (clientesRecompra.length / totalFiltered) * 100 : 0;

  const totalPedidos = filteredCustomers.reduce((s, c) => s + (c.total_pedidos || 0), 0);
  const freqMedia = totalFiltered > 0 ? totalPedidos / totalFiltered : 0;

  // Tempo médio entre compras: baseado em clientes ativos (≤15d) e em risco (15-30d) do período
  const fimPeriodo = dateRange.to;
  const clientesAtivosERisco = customers.filter((c) => {
    if (!c.data_ultimo_pedido) return false;
    const dias = differenceInDays(fimPeriodo, new Date(c.data_ultimo_pedido));
    return dias >= 0 && dias <= 30;
  });

  const temposMedios = clientesAtivosERisco
    .filter((c) => (c.total_pedidos || 1) > 1 && c.data_conversao && c.data_ultimo_pedido)
    .map((c) => {
      const dias = differenceInDays(new Date(c.data_ultimo_pedido!), new Date(c.data_conversao!));
      const intervalos = (c.total_pedidos || 1) - 1;
      return intervalos > 0 ? dias / intervalos : 0;
    })
    .filter((t) => t > 0);

  const tempoMedioEntreCompras = temposMedios.length > 0
    ? temposMedios.reduce((a, b) => a + b, 0) / temposMedios.length
    : 0;

  const lastAq = aquisicaoData.length >= 1 ? aquisicaoData[aquisicaoData.length - 1] : null;
  const lastChurn = churnData.length >= 1 ? churnData[churnData.length - 1] : null;
  const novosUltimoMes = lastAq?.novos_clientes ?? 0;
  const churnadosUltimoMes = lastChurn?.total_clientes_churnados_no_mes ?? 0;
  const crescimentoLiquido = novosUltimoMes - churnadosUltimoMes;

  const clientesEntrandoEmRisco = customers.filter((c) => {
    if (!c.data_ultimo_pedido) return false;
    const days = differenceInDays(new Date(), new Date(c.data_ultimo_pedido));
    return days >= 13 && days <= 17;
  });
  const freqEmQueda = freqMedia < 1.5 && totalFiltered > 5;

  return (
    <div className="space-y-4">
      <SectionHeader icon={Activity} title="Comportamento">
        <div className="flex items-center gap-2">
          {clientesEntrandoEmRisco.length > 3 && (
            <AlertBadge level="warning" message={`${clientesEntrandoEmRisco.length} entrando em risco`} />
          )}
          {freqEmQueda && <AlertBadge level="warning" message="Frequência baixa" />}
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={RefreshCw}
          label="Taxa de Recompra"
          value={`${taxaRecompra.toFixed(1)}%`}
          sub={`${clientesRecompra.length} de ${totalFiltered}`}
        />
        <MetricCard
          icon={Activity}
          label="Frequência Média"
          value={`${freqMedia.toFixed(1)}x`}
          sub="Pedidos por cliente"
        />
        <MetricCard
          icon={Clock}
          label="Tempo Médio entre Compras"
          value={`${tempoMedioEntreCompras.toFixed(0)}d`}
          sub="Dias entre pedidos (recorrentes)"
        />
        <MetricCard
          icon={TrendingUp}
          label="Crescimento Líquido"
          value={crescimentoLiquido >= 0 ? `+${crescimentoLiquido}` : `${crescimentoLiquido}`}
          sub={`Novos (${novosUltimoMes}) - Churn (${churnadosUltimoMes})`}
        />
      </div>

      {clientesEntrandoEmRisco.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Clientes Entrando na Zona de Risco (13-17 dias sem compra)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {clientesEntrandoEmRisco.slice(0, 9).map((c) => {
                const days = differenceInDays(new Date(), new Date(c.data_ultimo_pedido!));
                return (
                  <div key={c.id} className="rounded-md border bg-muted/30 p-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.nome || c.telefone}</p>
                      <p className="text-xs text-muted-foreground">{c.total_pedidos} pedidos</p>
                    </div>
                    <span className="text-sm font-bold text-chart-3">{days}d</span>
                  </div>
                );
              })}
              {clientesEntrandoEmRisco.length > 9 && (
                <Button
                  variant="outline"
                  className="h-auto p-3 flex items-center justify-center"
                  onClick={() => setShowAllRisco(true)}
                >
                  <p className="text-sm text-muted-foreground">Ver todos +{clientesEntrandoEmRisco.length - 9} clientes</p>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAllRisco} onOpenChange={setShowAllRisco}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clientes na Zona de Risco (13-17 dias)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {clientesEntrandoEmRisco.map((c) => {
                const days = differenceInDays(new Date(), new Date(c.data_ultimo_pedido!));
                return (
                  <div key={c.id} className="rounded-md border bg-muted/30 p-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.nome || c.telefone}</p>
                      <p className="text-xs text-muted-foreground">{c.total_pedidos} pedidos</p>
                    </div>
                    <span className="text-sm font-bold text-chart-3">{days}d</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComportamentoSection;
