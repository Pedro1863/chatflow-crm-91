import { useCustomers, useChurnMensal, useAquisicaoMensal } from "@/hooks/use-sales-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Clock, Activity, TrendingUp, Loader2 } from "lucide-react";
import { differenceInDays } from "date-fns";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";
import AlertBadge from "./AlertBadge";
import { mesesDesdeMarco2026 } from "@/lib/dashboard-utils";

const ComportamentoSection = () => {
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: churnData = [] } = useChurnMensal(6);
  const { data: aquisicaoData = [] } = useAquisicaoMensal(6);

  if (loadingC) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando comportamento...
      </div>
    );
  }

  const totalCustomers = customers.length;
  const clientesRecompra = customers.filter((c) => c.total_pedidos > 1);
  const taxaRecompra = totalCustomers > 0 ? (clientesRecompra.length / totalCustomers) * 100 : 0;

  // Frequência de compra (avg pedidos por cliente)
  const totalPedidos = customers.reduce((s, c) => s + (c.total_pedidos || 0), 0);
  const freqMedia = totalCustomers > 0 ? totalPedidos / totalCustomers : 0;

  // Tempo médio entre compras (only for recompra clients)
  const temposMedios = clientesRecompra
    .filter((c) => c.data_conversao && c.data_ultimo_pedido)
    .map((c) => {
      const dias = differenceInDays(new Date(c.data_ultimo_pedido!), new Date(c.data_conversao!));
      const intervalos = (c.total_pedidos || 1) - 1;
      return intervalos > 0 ? dias / intervalos : 0;
    })
    .filter((t) => t > 0);

  const tempoMedioEntreCompras = temposMedios.length > 0
    ? temposMedios.reduce((a, b) => a + b, 0) / temposMedios.length
    : 0;

  // Crescimento líquido (novos - churn do último mês)
  const lastAq = aquisicaoData.length >= 1 ? aquisicaoData[aquisicaoData.length - 1] : null;
  const lastChurn = churnData.length >= 1 ? churnData[churnData.length - 1] : null;
  const novosUltimoMes = lastAq?.novos_clientes ?? 0;
  const churnadosUltimoMes = lastChurn?.total_clientes_churnados_no_mes ?? 0;
  const crescimentoLiquido = novosUltimoMes - churnadosUltimoMes;

  // Alertas
  const clientesEntrandoEmRisco = customers.filter((c) => {
    if (!c.data_ultimo_pedido) return false;
    const days = differenceInDays(new Date(), new Date(c.data_ultimo_pedido));
    return days >= 13 && days <= 17; // Approaching 15-day risk boundary
  });
  const freqEmQueda = freqMedia < 1.5 && totalCustomers > 5;

  return (
    <div className="space-y-4">
      <SectionHeader icon={Activity} title="Comportamento">
        <div className="flex gap-2">
          {clientesEntrandoEmRisco.length > 3 && (
            <AlertBadge level="warning" message={`${clientesEntrandoEmRisco.length} entrando em risco`} />
          )}
          {freqEmQueda && <AlertBadge level="warning" message="Frequência baixa" />}
        </div>
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={RefreshCw}
          label="Taxa de Recompra"
          value={`${taxaRecompra.toFixed(1)}%`}
          sub={`${clientesRecompra.length} de ${totalCustomers}`}
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

      {/* Clients entering risk zone */}
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
                <div className="rounded-md border bg-muted/30 p-3 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">+{clientesEntrandoEmRisco.length - 9} clientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComportamentoSection;
