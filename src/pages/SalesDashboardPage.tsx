import { useState } from "react";
import { Loader2, Calendar } from "lucide-react";
import { useCustomers, useLeadsPipeline } from "@/hooks/use-sales-data";
import { useDataInicioMetricas } from "@/hooks/use-data-inicio";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gerarListaMeses, formatMesLabel, mesesDesde } from "@/lib/dashboard-utils";
import AquisicaoSection from "@/components/sales/AquisicaoSection";
import RetencaoSection from "@/components/sales/RetencaoSection";
import ReceitaSection from "@/components/sales/ReceitaSection";
import ComportamentoSection from "@/components/sales/ComportamentoSection";
import PipelinePerdas from "@/components/sales/PipelinePerdas";

const SalesDashboardPage = () => {
  const { isLoading: loadingC } = useCustomers();
  const { isLoading: loadingL } = useLeadsPipeline();
  const dataInicio = useDataInicioMetricas();
  const [mesSelecionado, setMesSelecionado] = useState<string>("todos");

  if (loadingC || loadingL) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando métricas...
      </div>
    );
  }

  const meses = gerarListaMeses(dataInicio);
  const totalMeses = mesesDesde(dataInicio);

  return (
    <div className="h-full p-6 overflow-y-auto scrollbar-thin space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Métricas de Vendas</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMesLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AquisicaoSection totalMeses={totalMeses} mesSelecionado={mesSelecionado} />
      <Separator />
      <RetencaoSection totalMeses={totalMeses} mesSelecionado={mesSelecionado} />
      <Separator />
      <ReceitaSection totalMeses={totalMeses} mesSelecionado={mesSelecionado} />
      <Separator />
      <ComportamentoSection totalMeses={totalMeses} mesSelecionado={mesSelecionado} />
      <Separator />
      <PipelinePerdas />
    </div>
  );
};

export default SalesDashboardPage;
